/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Database, RefreshCw, Download, Upload, Check, Table } from 'lucide-react';
import { saveAll, resetDB, fetchAll } from '../data';

interface DbManagerProps {
  onRefresh: () => void;
}

export default function DbManager({ onRefresh }: DbManagerProps) {
  const [copied, setCopied] = useState(false);
  const [showJson, setShowJson] = useState(false);

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all data? This deletes any sandbox edits and restores the original seed data.')) {
      resetDB();
      onRefresh();
      alert('Database reset to original seed data successfully!');
    }
  };

  const currentDb = fetchAll();
  const dbString = JSON.stringify(currentDb, null, 2);

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(dbString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([dbString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
          link.download = `lifehut_workspace_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = () => {
    const raw = prompt('Paste your previously backed-up JSON data here:');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.projects && parsed.stages) {
        saveAll(parsed);
        onRefresh();
        alert('Data successfully imported and active!');
      } else {
        alert('Invalid schema! Missing "projects" or "stages" headers.');
      }
    } catch (e) {
      alert('Failed to parse JSON. Please make sure the string is clean and copy-pasted correctly.');
    }
  };

  return (
    <div className="mt-14 py-7 px-5" style={{ background: 'var(--lh-surface)', borderTop: '1px solid var(--lh-border)' }} id="db-sandbox-controls">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg flex-shrink-0" style={{ background: 'var(--lh-surface-muted)' }}>
              <Database className="w-4 h-4" style={{ color: 'var(--lh-text-secondary)' }} />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold tracking-tight" style={{ color: 'var(--lh-text-primary)' }}>Sandbox database tools</h3>
              <p className="text-[11.5px] mt-1 max-w-2xl leading-relaxed" style={{ color: 'var(--lh-text-secondary)' }}>
                Local offline storage matching the Firestore schema. Back up to JSON or copy data for spreadsheet use.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowJson(!showJson)}
              className="lh-btn lh-btn-secondary lh-btn-sm"
            >
              <Table className="w-3.5 h-3.5" />
              <span>{showJson ? 'Hide raw data' : 'View raw data'}</span>
            </button>

            <button
              onClick={handleCopyToClipboard}
              className="lh-btn lh-btn-secondary lh-btn-sm"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" style={{ color: 'var(--lh-success-text)' }} />
                  <span style={{ color: 'var(--lh-success-text)' }}>Copied</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Copy data</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="lh-btn lh-btn-secondary lh-btn-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download backup</span>
            </button>

            <button
              onClick={handleImportJson}
              className="lh-btn lh-btn-secondary lh-btn-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import backup</span>
            </button>

            <button
              onClick={handleReset}
              className="lh-btn lh-btn-primary lh-btn-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset sandbox</span>
            </button>
          </div>
        </div>

        {showJson && (
          <div className="mt-5 rounded-xl overflow-hidden" style={{ background: 'var(--lh-navy)', border: '1px solid var(--lh-navy)' }}>
            <div className="flex justify-between items-center px-4 py-2.5 text-[10px] uppercase font-semibold" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
              <span>Database state: active sandbox storage</span>
              <span>Schema: Firestore compatible</span>
            </div>
            <pre className="p-4 text-[11px] font-mono overflow-auto max-h-64" style={{ color: '#cbd5e1' }}>{dbString}</pre>
          </div>
        )}
      </div>
    </div>
  );
}