import os

def patch_app():
    path = 'artifacts/file_generation/ttl=63d/intermediate/life_admin.html'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Replace placeholder in SettingsView
    old_placeholder = """                {/* Backup placeholder */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-900">Local Backup & Restore</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border">Upcoming Task 004</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    In a future phase, you will be able to export your responsibilities to a clean JSON file to back up your records or transfer them between devices.
                  </p>
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-400">
                    Export JSON and Import JSON controls will appear here in Task 004.
                  </div>
                </div>"""

    new_backup_card = """                {/* Backup & Restore Controls */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">💾</span>
                      <h3 className="text-base font-semibold text-slate-900">Backup &amp; Restore Controls</h3>
                    </div>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                      Offline • Private
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Download your responsibilities as a portable JSON file to keep an offline backup on your device, or restore records from an existing backup.
                  </p>
                  <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                    <strong>🔒 Data Privacy Notice:</strong> Backup files are exported in standard unencrypted JSON format so you can inspect your records. Store your backup files in a secure location you trust.
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col justify-between gap-2.5">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Download Backup</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Export all {responsibilities.length} responsibilities to a local JSON file.</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleDownloadBackup} className="w-full justify-center bg-white">
                        Download Backup (.json)
                      </Button>
                    </div>
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col justify-between gap-2.5">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Restore from File</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Select a previously exported Respostack (or Life Admin) backup JSON file.</p>
                      </div>
                      <div>
                        <input
                          type="file"
                          id="backup-file-input"
                          accept=".json,application/json"
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                        <Button variant="outline" size="sm" onClick={() => document.getElementById('backup-file-input').click()} className="w-full justify-center bg-white border-teal-300 text-teal-800 hover:bg-teal-50">
                          Select Backup File...
                        </Button>
                      </div>
                    </div>
                  </div>
                  {backupError && (
                    <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 leading-relaxed">
                      <strong>Validation Error:</strong> {backupError}
                    </div>
                  )}
                </div>"""

    if old_placeholder not in content:
        raise ValueError("Could not find old_placeholder in file")
    content = content.replace(old_placeholder, new_backup_card)

    # 2. Add backup state and handlers to App component
    state_anchor = "const [sortBy, setSortBy] = useState('urgency');"
    new_state = """const [sortBy, setSortBy] = useState('urgency');
      const [stagedBackup, setStagedBackup] = useState(null);
      const [backupError, setBackupError] = useState(null);
      const [isRestoring, setIsRestoring] = useState(false);

      const handleDownloadBackup = () => {
        try {
          const payload = {
            app: 'Respostack',
            format: 'life-admin-backup',
            version: 1,
            exportedAt: new Date().toISOString(),
            itemCount: responsibilities.length,
            responsibilities: responsibilities
          };
          const json = JSON.stringify(payload, null, 2);
          const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `life-admin-backup-${getTodayDateString()}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 100);
          showToast('success', `Backup downloaded (${responsibilities.length} items).`);
        } catch (err) {
          showToast('error', 'Failed to generate backup file.');
        }
      };

      const handleFileSelect = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        setBackupError(null);
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const parsed = JSON.parse(event.target.result);
            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
              setBackupError('Root content must be a JSON object.');
              return;
            }
            if ((parsed.format !== 'life-admin-backup' && parsed.format !== 'respostack-backup') || (parsed.app !== 'Respostack' && parsed.app !== 'Life Admin')) {
              setBackupError('Unrecognized backup format. Expected a Respostack or Life Admin backup file.');
              return;
            }
            if (parsed.version !== 1) {
              setBackupError(`Unsupported backup version (${parsed.version}). This version supports version 1.`);
              return;
            }
            if (!Array.isArray(parsed.responsibilities)) {
              setBackupError('Invalid responsibilities array.');
              return;
            }
            const seen = new Set();
            for (let i = 0; i < parsed.responsibilities.length; i++) {
              const item = parsed.responsibilities[i];
              if (!item.id || seen.has(item.id)) {
                setBackupError(`Invalid or duplicate responsibility ID in record #${i + 1}.`);
                return;
              }
              seen.add(item.id);
              if (!item.title || !item.title.trim()) {
                setBackupError(`Record #${i + 1} has an empty title.`);
                return;
              }
              if (!CATEGORIES.includes(item.category)) {
                setBackupError(`Record #${i + 1} has invalid category "${item.category}".`);
                return;
              }
            }
            setStagedBackup(parsed);
          } catch (err) {
            setBackupError('Malformed JSON: Could not parse selected file.');
          } finally {
            e.target.value = '';
          }
        };
        reader.readAsText(file, 'utf-8');
      };

      const handleConfirmRestore = async () => {
        if (!stagedBackup || isRestoring) return;
        try {
          setIsRestoring(true);
          await db.transaction('rw', db.responsibilities, async () => {
            await db.responsibilities.clear();
            for (const item of stagedBackup.responsibilities) {
              await db.responsibilities.add(item);
            }
          });
          const count = stagedBackup.itemCount;
          setStagedBackup(null);
          await refreshData();
          showToast('success', `Restored ${count} responsibilities from backup.`);
        } catch (err) {
          showToast('error', 'Restore failed. Existing data was preserved.');
        } finally {
          setIsRestoring(false);
        }
      };"""

    if state_anchor not in content:
        raise ValueError("Could not find state_anchor in file")
    content = content.replace(state_anchor, new_state)

    # 3. Add restore modal before Clear All dialog
    modal_anchor = '{/* Clear All Dialog */}'
    restore_modal = """{/* Restore Confirmation Dialog */}
          <ConfirmDialog
            isOpen={!!stagedBackup}
            onClose={() => { if (!isRestoring) setStagedBackup(null); }}
            onConfirm={handleConfirmRestore}
            title="Replace All Responsibilities?"
            message={`Restoring will completely REPLACE your existing ${responsibilities.length} responsibilities with ${stagedBackup ? stagedBackup.itemCount : 0} items from the backup file. This cannot be undone.`}
            confirmLabel="Replace &amp; Restore"
            variant="danger"
          />

          {/* Clear All Dialog */}"""

    if modal_anchor not in content:
        raise ValueError("Could not find modal_anchor in file")
    content = content.replace(modal_anchor, restore_modal)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched intermediate life_admin.html successfully!")

if __name__ == '__main__':
    patch_app()
