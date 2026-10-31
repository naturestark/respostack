import re

def update_canvas_app():
    path = 'artifacts/file_generation/ttl=63d/intermediate/life_admin.html'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update Dexie schema to version 2
    old_db = """    // --- DEXIE DATABASE SETUP ---
    const db = new Dexie('life_admin_canvas_db');
    db.version(1).stores({
      responsibilities: 'id, title, category, dueDate, isCompleted, createdAt, updatedAt'
    });"""

    new_db = """    // --- DEXIE DATABASE SETUP ---
    const db = new Dexie('life_admin_canvas_db');
    db.version(1).stores({
      responsibilities: 'id, title, category, dueDate, isCompleted, createdAt, updatedAt'
    });
    db.version(2).stores({
      responsibilities: 'id, title, category, dueDate, reminderAt, isCompleted, createdAt, updatedAt',
      reminderLogs: 'id, responsibilityId, reminderAt, notifiedAt, dismissedAt',
      appSettings: 'key'
    });"""

    assert old_db in content, "old_db not found"
    content = content.replace(old_db, new_db)

    # 2. Add reminder helper functions
    reminder_helpers = """    // --- REMINDER HELPERS ---
    function formatReminderDateTime(isoString) {
      if (!isoString) return '';
      const parsed = Date.parse(isoString);
      if (isNaN(parsed)) return '';
      const d = new Date(parsed);
      return d.toLocaleString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
      });
    }

    function formatRelativeReminder(isoString, now = new Date()) {
      if (!isoString) return '';
      const parsed = Date.parse(isoString);
      if (isNaN(parsed)) return '';
      const diffMs = now.getTime() - parsed;
      const absDiffMin = Math.floor(Math.abs(diffMs) / (60 * 1000));
      if (diffMs >= 0) {
        if (absDiffMin < 2) return 'Due just now';
        if (absDiffMin < 60) return `Missed (${absDiffMin}m ago)`;
        const hours = Math.floor(absDiffMin / 60);
        if (hours < 24) return `Missed (${hours}h ago)`;
        return `Missed (${Math.floor(hours / 24)}d ago)`;
      } else {
        if (absDiffMin < 60) return `Due in ${absDiffMin}m`;
        const hours = Math.floor(absDiffMin / 60);
        if (hours < 24) return `Due in ${hours}h`;
        return `Due in ${Math.floor(hours / 24)}d`;
      }
    }

    function getReminderStatus(item, now = new Date()) {
      if (item.isCompleted || !item.reminderAt) return 'none';
      const parsed = Date.parse(item.reminderAt);
      if (isNaN(parsed)) return 'none';
      const diffMs = now.getTime() - parsed;
      if (diffMs < 0) return 'upcoming';
      if (diffMs > 15 * 60 * 1000) return 'missed';
      return 'due';
    }

    function getActiveReminderItems(items, now = new Date()) {
      const active = [];
      for (const item of items) {
        if (item.isCompleted || !item.reminderAt) continue;
        const status = getReminderStatus(item, now);
        if (status === 'due' || status === 'missed') {
          active.push({ item, status, timeLabel: formatRelativeReminder(item.reminderAt, now) });
        }
      }
      active.sort((a, b) => (a.status === 'due' ? -1 : 1));
      return active;
    }

    function getApproachingItems(items, todayStr, horizonDays = 3) {
      return items.filter(item => {
        if (item.isCompleted || !item.dueDate) return false;
        const diff = getDaysDifference(item.dueDate, todayStr);
        return diff > 0 && diff <= horizonDays;
      }).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    }

    function isoToDatetimeLocal(isoString) {
      if (!isoString) return '';
      const parsed = Date.parse(isoString);
      if (isNaN(parsed)) return '';
      const d = new Date(parsed);
      const Y = d.getFullYear();
      const M = String(d.getMonth() + 1).padStart(2, '0');
      const D = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${Y}-${M}-${D}T${h}:${m}`;
    }

    function datetimeLocalToIso(localStr) {
      if (!localStr || !localStr.trim()) return undefined;
      const parsed = Date.parse(localStr);
      if (isNaN(parsed)) return undefined;
      return new Date(localStr).toISOString();
    }"""

    val_anchor = "    // --- VALIDATION HELPERS ---"
    assert val_anchor in content, "val_anchor not found"
    content = content.replace(val_anchor, reminder_helpers + "\n\n" + val_anchor)

    # 3. Update ResponsibilityCard to show reminder tag
    old_card_badge = """                {!isCompleted && dueDate && (
                  <Badge variant="status" status={dueInfo.status} size="sm">{dueInfo.text}</Badge>
                )}"""

    new_card_badge = """                {!isCompleted && dueDate && (
                  <Badge variant="status" status={dueInfo.status} size="sm">{dueInfo.text}</Badge>
                )}
                {!isCompleted && responsibility.reminderAt && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                    🔔 {formatReminderDateTime(responsibility.reminderAt)}
                  </span>
                )}"""

    assert old_card_badge in content, "old_card_badge not found"
    content = content.replace(old_card_badge, new_card_badge)

    # 4. Update FormModal to include reminderAt datetime-local input
    old_form_state = """      const [formData, setFormData] = useState({
        title: '', category: 'Personal', dueDate: '', notes: '', amount: '', currency: 'USD'
      });"""

    new_form_state = """      const [formData, setFormData] = useState({
        title: '', category: 'Personal', dueDate: '', reminderAt: '', notes: '', amount: '', currency: 'USD'
      });
      const [reminderInput, setReminderInput] = useState('');"""

    assert old_form_state in content, "old_form_state not found"
    content = content.replace(old_form_state, new_form_state)

    old_form_effect = """        if (initialData) {
          setFormData({
            title: initialData.title || '',
            category: initialData.category || 'Personal',
            dueDate: initialData.dueDate || '',
            notes: initialData.notes || '',
            amount: initialData.amount !== undefined ? initialData.amount : '',
            currency: initialData.currency || 'USD'
          });
        } else {
          setFormData({
            title: '', category: 'Personal', dueDate: '', notes: '', amount: '', currency: 'USD'
          });
        }"""

    new_form_effect = """        if (initialData) {
          setFormData({
            title: initialData.title || '',
            category: initialData.category || 'Personal',
            dueDate: initialData.dueDate || '',
            reminderAt: initialData.reminderAt || '',
            notes: initialData.notes || '',
            amount: initialData.amount !== undefined ? initialData.amount : '',
            currency: initialData.currency || 'USD'
          });
          setReminderInput(isoToDatetimeLocal(initialData.reminderAt));
        } else {
          setFormData({
            title: '', category: 'Personal', dueDate: '', reminderAt: '', notes: '', amount: '', currency: 'USD'
          });
          setReminderInput('');
        }"""

    assert old_form_effect in content, "old_form_effect not found"
    content = content.replace(old_form_effect, new_form_effect)

    # Insert reminder field HTML into FormModal right before Amount row
    old_amount_row = """            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="modal-amount" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Amount (Optional)</label>"""

    new_reminder_and_amount = """            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="modal-reminder" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Reminder Instant (Optional)</label>
                {reminderInput && (
                  <button type="button" onClick={() => { setReminderInput(''); setFormData(p => ({ ...p, reminderAt: '' })); }} className="text-xs text-rose-600 hover:text-rose-700 font-medium">Clear</button>
                )}
              </div>
              <input
                id="modal-reminder"
                type="datetime-local"
                value={reminderInput}
                onChange={(e) => {
                  setReminderInput(e.target.value);
                  setFormData(p => ({ ...p, reminderAt: datetimeLocalToIso(e.target.value) || '' }));
                }}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="mt-1 text-[11px] text-slate-500">Highlights this task in the Today overview when the reminder time arrives.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="modal-amount" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Amount (Optional)</label>"""

    assert old_amount_row in content, "old_amount_row not found"
    content = content.replace(old_amount_row, new_reminder_and_amount)

    # 5. Update handleSave to preserve reminderAt
    old_handle_save = """          await db.responsibilities.add({
            id: newId,
            title: formData.title.trim(),
            category: formData.category,
            dueDate: normalizedDueDate,
            notes: normalizedNotes,
            amount: amt,
            currency: amt !== undefined ? (formData.currency?.trim().toUpperCase() || 'USD') : undefined,
            isCompleted: false,
            createdAt: now,
            updatedAt: now
          });"""

    new_handle_save = """          await db.responsibilities.add({
            id: newId,
            title: formData.title.trim(),
            category: formData.category,
            dueDate: normalizedDueDate,
            reminderAt: formData.reminderAt?.trim() || undefined,
            notes: normalizedNotes,
            amount: amt,
            currency: amt !== undefined ? (formData.currency?.trim().toUpperCase() || 'USD') : undefined,
            isCompleted: false,
            createdAt: now,
            updatedAt: now
          });"""

    assert old_handle_save in content, "old_handle_save not found"
    content = content.replace(old_handle_save, new_handle_save)

    old_update_save = """          await db.responsibilities.update(editingItem.id, {
            title: formData.title.trim(),
            category: formData.category,
            dueDate: normalizedDueDate,
            notes: normalizedNotes,
            amount: amt,
            currency: amt !== undefined ? (formData.currency?.trim().toUpperCase() || 'USD') : undefined,
            updatedAt: now
          });"""

    new_update_save = """          await db.responsibilities.update(editingItem.id, {
            title: formData.title.trim(),
            category: formData.category,
            dueDate: normalizedDueDate,
            reminderAt: formData.reminderAt !== undefined ? (formData.reminderAt.trim() || undefined) : editingItem.reminderAt,
            notes: normalizedNotes,
            amount: amt,
            currency: amt !== undefined ? (formData.currency?.trim().toUpperCase() || 'USD') : undefined,
            updatedAt: now
          });"""

    assert old_update_save in content, "old_update_save not found"
    content = content.replace(old_update_save, new_update_save)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched intermediate life_admin.html with reminder support successfully!")

if __name__ == '__main__':
    update_canvas_app()
