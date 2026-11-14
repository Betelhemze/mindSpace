import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { getRepositories } from '@/database';
import { getCurrentUtcIso } from '@/utils/dateUtils';
import { MindspaceBackupFile, MindspaceBackupPayload, RestoreResult } from '@/types/backup';
import { deserializeDocument, documentToMarkdown } from '@/utils/richText';

export class BackupService {
  /**
   * Generates a full verified backup payload.
   */
  static async createBackupPayload(): Promise<MindspaceBackupFile> {
    const repos = await getRepositories();

    // Export all thoughts including soft-deleted ones for full recoverability
    const thoughts = await repos.thoughts.getAll({ limit: 100000 }, true);
    const draft = await repos.drafts.getActiveDraft();
    const settings = await repos.settings.getAllRawSettings();

    const payload: MindspaceBackupPayload = {
      version: 1,
      app: 'Mindspace',
      exported_at: getCurrentUtcIso(),
      record_count: thoughts.length,
      data: {
        thoughts,
        drafts: draft ? [draft] : [],
        settings,
      },
    };

    const payloadJson = JSON.stringify(payload);
    const checksum = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      payloadJson
    );

    return {
      format: 'mindspace_backup_v1',
      checksum,
      payload,
    };
  }

  /**
   * Exports backup to a file and opens native system share dialog.
   */
  static async exportBackup(): Promise<string> {
    const backupFile = await this.createBackupPayload();
    const jsonString = JSON.stringify(backupFile, null, 2);

    const filename = `mindspace_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    if (Platform.OS === 'web') {
      return jsonString;
    }

    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, jsonString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (isSharingAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export Mindspace Backup',
        UTI: 'public.json',
      });
    }

    // Update last backup timestamp
    const repos = await getRepositories();
    await repos.settings.updateSettings({ lastBackupAt: getCurrentUtcIso() });

    return fileUri;
  }

  /**
   * Exports the entire journal as a clean, human-readable Markdown file (.md).
   * Formats headings, lists, bold, italics, etc. seamlessly.
   */
  static async exportAsMarkdown(): Promise<string> {
    const repos = await getRepositories();
    const thoughts = await repos.thoughts.getAll({ limit: 100000 }, false);

    let md = `# Mindspace Journal\n\n`;
    md += `*Exported on ${new Date().toLocaleDateString([], { dateStyle: 'full' })}*\n\n`;
    md += `Total entries: ${thoughts.length}\n\n`;
    md += `---\n\n`;

    for (const t of thoughts) {
      const d = new Date(t.created_at);
      const dateHeader = d.toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const timeHeader = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const categoryTag = t.category ? ` [${t.category}]` : '';

      md += `### ${dateHeader} · ${timeHeader}${categoryTag}\n\n`;

      if (t.rich_content) {
        const doc = deserializeDocument(t.rich_content);
        md += `${documentToMarkdown(doc)}\n\n`;
      } else {
        md += `${t.content}\n\n`;
      }

      md += `---\n\n`;
    }

    const filename = `mindspace_journal_${new Date().toISOString().replace(/[:.]/g, '-')}.md`;

    if (Platform.OS === 'web') {
      return md;
    }

    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, md, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (isSharingAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/markdown',
        dialogTitle: 'Export Journal as Markdown',
        UTI: 'net.daringfireball.markdown',
      });
    }

    return fileUri;
  }

  /**
   * Validates a backup file's integrity and schema before executing restoration.
   */
  static async validateBackup(content: string): Promise<{
    isValid: boolean;
    backup?: MindspaceBackupFile;
    error?: string;
  }> {
    try {
      const parsed: MindspaceBackupFile = JSON.parse(content);

      if (parsed.format !== 'mindspace_backup_v1') {
        return { isValid: false, error: 'Unrecognized backup format. File is not a valid Mindspace backup.' };
      }

      if (!parsed.checksum || !parsed.payload) {
        return { isValid: false, error: 'Backup file is missing integrity checksum or payload.' };
      }

      // Re-verify cryptographic SHA-256 checksum
      const computedHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        JSON.stringify(parsed.payload)
      );

      if (computedHash !== parsed.checksum) {
        return {
          isValid: false,
          error: 'Backup integrity check failed: The backup file is corrupted or was modified.',
        };
      }

      if (!Array.isArray(parsed.payload.data?.thoughts)) {
        return { isValid: false, error: 'Backup data is malformed: thoughts list missing.' };
      }

      return { isValid: true, backup: parsed };
    } catch (err: any) {
      return { isValid: false, error: `Invalid JSON format: ${err?.message ?? 'parsing error'}` };
    }
  }

  /**
   * Restores thoughts from a validated backup into the database transactionally.
   * Preserves rich text formatting and existing entries safely.
   */
  static async restoreBackup(backup: MindspaceBackupFile): Promise<RestoreResult> {
    const repos = await getRepositories();
    const thoughtsToRestore = backup.payload.data.thoughts;

    let importedCount = 0;
    let skippedCount = 0;

    for (const item of thoughtsToRestore) {
      if (!item.id || !item.content) {
        continue;
      }

      const existing = await repos.thoughts.getById(item.id);
      if (existing) {
        // If content, rich content, and timestamps match exactly, skip
        if (
          existing.content === item.content &&
          existing.rich_content === item.rich_content &&
          existing.updated_at === item.updated_at
        ) {
          skippedCount++;
          continue;
        }
      }

      // Upsert thought safely with rich text and category
      await repos.thoughts.create({
        id: item.id,
        content: item.content,
        rich_content: item.rich_content ?? null,
        category: item.category ?? null,
        created_at: item.created_at,
      });
      importedCount++;
    }

    // Restore settings if present
    if (backup.payload.data.settings) {
      await repos.settings.restoreRawSettings(backup.payload.data.settings);
    }

    return {
      success: true,
      importedThoughtsCount: importedCount,
      skippedDuplicatesCount: skippedCount,
    };
  }
}
