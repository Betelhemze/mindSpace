import { RichTextDocument, RichTextBlock, RichTextSpan, BlockType } from '@/types/richText';

let blockIdCounter = 0;
export function generateBlockId(): string {
  blockIdCounter += 1;
  return `block_${Date.now()}_${blockIdCounter}`;
}

/**
 * Creates an empty RichTextDocument with one empty paragraph block.
 */
export function createEmptyDocument(): RichTextDocument {
  return {
    version: 1,
    blocks: [
      {
        id: generateBlockId(),
        type: 'paragraph',
        spans: [{ text: '' }],
      },
    ],
  };
}

/**
 * Extracts clean, unformatted plain text from a RichTextDocument.
 * Used for FTS5 search indexing, card summaries, word counts, and plain-text fallbacks.
 */
export function documentToPlainText(doc: RichTextDocument): string {
  if (!doc || !Array.isArray(doc.blocks)) return '';

  const lines: string[] = [];
  let numberedCounter = 1;

  for (const block of doc.blocks) {
    const blockText = (block.spans || []).map((s) => s.text || '').join('');

    if (block.type === 'bullet-list') {
      lines.push(`• ${blockText}`);
      numberedCounter = 1;
    } else if (block.type === 'numbered-list') {
      lines.push(`${numberedCounter}. ${blockText}`);
      numberedCounter += 1;
    } else {
      lines.push(blockText);
      numberedCounter = 1;
    }
  }

  return lines.join('\n');
}

/**
 * Converts a raw plain-text string into a structured RichTextDocument.
 * Safely parses lines, detecting headings and lists if already present in text.
 */
export function plainTextToDocument(text: string): RichTextDocument {
  if (!text || typeof text !== 'string') {
    return createEmptyDocument();
  }

  const lines = text.split(/\r?\n/);
  const blocks: RichTextBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    let lineType: BlockType = 'paragraph';
    let content = rawLine;

    if (rawLine.startsWith('### ')) {
      lineType = 'h3';
      content = rawLine.slice(4);
    } else if (rawLine.startsWith('## ')) {
      lineType = 'h2';
      content = rawLine.slice(3);
    } else if (rawLine.startsWith('# ')) {
      lineType = 'h1';
      content = rawLine.slice(2);
    } else if (rawLine.startsWith('• ') || rawLine.startsWith('- ') || rawLine.startsWith('* ')) {
      lineType = 'bullet-list';
      content = rawLine.slice(2);
    } else if (/^\d+\.\s/.test(rawLine)) {
      lineType = 'numbered-list';
      content = rawLine.replace(/^\d+\.\s/, '');
    }

    // Parse simple inline markdown tokens (bold, italic, underline, strike)
    const spans = parseInlineMarkdown(content);

    blocks.push({
      id: generateBlockId(),
      type: lineType,
      spans,
    });
  }

  return {
    version: 1,
    blocks: blocks.length > 0 ? blocks : createEmptyDocument().blocks,
  };
}

/**
 * Parses inline markdown tokens like **bold**, *italic*, <u>underline</u>, ~~strike~~ into RichTextSpan[]
 */
export function parseInlineMarkdown(text: string): RichTextSpan[] {
  if (!text) return [{ text: '' }];

  const spans: RichTextSpan[] = [];
  // Tokenize regex for formatting tags
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|<u>[^<]+<\/u>)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      spans.push({ text: text.slice(lastIndex, match.index) });
    }

    const matchedStr = match[0];
    if (matchedStr.startsWith('**') && matchedStr.endsWith('**')) {
      spans.push({ text: matchedStr.slice(2, -2), bold: true });
    } else if (matchedStr.startsWith('*') && matchedStr.endsWith('*')) {
      spans.push({ text: matchedStr.slice(1, -1), italic: true });
    } else if (matchedStr.startsWith('~~') && matchedStr.endsWith('~~')) {
      spans.push({ text: matchedStr.slice(2, -2), strikethrough: true });
    } else if (matchedStr.startsWith('<u>') && matchedStr.endsWith('</u>')) {
      spans.push({ text: matchedStr.slice(3, -4), underline: true });
    } else {
      spans.push({ text: matchedStr });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    spans.push({ text: text.slice(lastIndex) });
  }

  return spans.length > 0 ? spans : [{ text }];
}

/**
 * Converts a RichTextDocument into clean, standard Markdown for backup exporting.
 */
export function documentToMarkdown(doc: RichTextDocument): string {
  if (!doc || !Array.isArray(doc.blocks)) return '';

  const lines: string[] = [];
  let numberedCounter = 1;

  for (const block of doc.blocks) {
    let blockContent = '';
    for (const span of block.spans || []) {
      let t = span.text || '';
      if (!t) continue;
      if (span.bold) t = `**${t}**`;
      if (span.italic) t = `*${t}*`;
      if (span.underline) t = `<u>${t}</u>`;
      if (span.strikethrough) t = `~~${t}~~`;
      blockContent += t;
    }

    switch (block.type) {
      case 'h1':
        lines.push(`# ${blockContent}`);
        numberedCounter = 1;
        break;
      case 'h2':
        lines.push(`## ${blockContent}`);
        numberedCounter = 1;
        break;
      case 'h3':
        lines.push(`### ${blockContent}`);
        numberedCounter = 1;
        break;
      case 'bullet-list':
        lines.push(`- ${blockContent}`);
        numberedCounter = 1;
        break;
      case 'numbered-list':
        lines.push(`${numberedCounter}. ${blockContent}`);
        numberedCounter += 1;
        break;
      default:
        lines.push(blockContent);
        numberedCounter = 1;
        break;
    }
  }

  return lines.join('\n\n');
}

/**
 * Safely serializes a RichTextDocument to JSON string.
 */
export function serializeDocument(doc: RichTextDocument): string {
  return JSON.stringify(doc);
}

/**
 * Safely deserializes JSON string to RichTextDocument.
 * If raw is plain text or invalid JSON, converts it seamlessly to a RichTextDocument.
 */
export function deserializeDocument(raw: string | null | undefined): RichTextDocument {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return createEmptyDocument();
  }

  const trimmed = raw.trim();

  // If it starts with JSON curly brace, attempt JSON parse
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && parsed.version === 1 && Array.isArray(parsed.blocks)) {
        return parsed as RichTextDocument;
      }
    } catch {
      // Not valid JSON, fall back to plain text parser
    }
  }

  // Fallback: parse as plain text or markdown string
  return plainTextToDocument(raw);
}

