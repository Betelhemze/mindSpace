import React, { useRef } from 'react';
import { Thought, MindspaceBackupFile } from '../types';
import { X, Download, Upload, Sidebar, ShieldCheck } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  thoughts: Thought[];
  onImportSuccess: (imported: Thought[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  thoughts,
  onImportSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    const backup: MindspaceBackupFile = {
      format: 'mindspace_backup_v1',
      payload: {
        version: 1,
        app: 'Mindspace',
        exported_at: new Date().toISOString(),
        record_count: thoughts.length,
        data: {
          thoughts,
          settings: {},
        },
      },
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed: MindspaceBackupFile = JSON.parse(text);

        if (parsed.payload?.data?.thoughts && Array.isArray(parsed.payload.data.thoughts)) {
          const imported = parsed.payload.data.thoughts;
          onImportSuccess(imported);
          alert(`Successfully imported ${imported.length} thoughts!`);
          onClose();
        } else {
          alert('Invalid backup format. Please select a valid Mindspace backup file.');
        }
      } catch (err: any) {
        alert(`Error reading backup: ${err?.message || 'Invalid JSON'}`);
      }
    };
    reader.readAsText(file);
  };

  const handleOpenSidePanel = () => {
    if (typeof chrome !== 'undefined' && chrome?.sidePanel?.open) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.sidePanel.open({ tabId: tabs[0].id }).catch(() => {
            alert('Side panel could not be opened automatically. Click the extension icon and select "Open Side Panel".');
          });
        }
      });
    } else {
      alert('Side Panel API is only active when loaded as a Chrome/Edge extension.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <ShieldCheck size={18} color="#4A4036" />
            <h3 className="modal-title">Mindspace Settings</h3>
          </div>
          <button type="button" onClick={onClose} className="icon-close-btn">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="settings-section">
            <span className="settings-section-title">Journal Statistics</span>
            <div className="stats-row">
              <span className="stats-label">Active Thoughts:</span>
              <span className="stats-value">{thoughts.length}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Storage:</span>
              <span className="stats-value">Local Browser Storage (100% Offline)</span>
            </div>
          </div>

          <div className="settings-section">
            <span className="settings-section-title">Browser Integration</span>
            <button
              type="button"
              onClick={handleOpenSidePanel}
              className="settings-action-btn"
            >
              <Sidebar size={15} />
              <span>Open in Chrome/Edge Side Panel</span>
            </button>
            <p className="settings-hint">
              Keep Mindspace docked alongside any website while studying or browsing.
            </p>
          </div>

          <div className="settings-section">
            <span className="settings-section-title">Data Backup & Interoperability</span>
            <p className="settings-hint">
              Backups are 100% compatible with the Mindspace mobile Android app.
            </p>
            <div className="backup-btn-group">
              <button
                type="button"
                onClick={handleExport}
                className="settings-action-btn secondary"
              >
                <Download size={14} />
                <span>Export Backup (JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="settings-action-btn secondary"
              >
                <Upload size={14} />
                <span>Restore Backup (JSON)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

