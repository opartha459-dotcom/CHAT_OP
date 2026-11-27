import React, { useState, useEffect } from 'react';
import { Shield, Check, UserMinus, Loader2, AlertCircle } from 'lucide-react';
import { ModalShell } from '../common/ModalShell';
import { Avatar } from '../common/Avatar';

export const RoleAssignmentModal = ({
  isOpen,
  onClose,
  targetUser,
  roles = [],
  authHeaders,
  onAssigned
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && targetUser) {
      setSelectedRoleId(targetUser.customRole?._id || targetUser.customRole || '');
      setError('');
    }
  }, [isOpen, targetUser]);

  if (!targetUser) return null;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${targetUser._id}/custom-role`, {
        method: 'PUT',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ roleId: selectedRoleId || null })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to update user role.');
        return;
      }
      onAssigned?.(data);
      onClose();
    } catch (err) {
      setError(err.message || 'Network error assigning role.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Custom Role"
      subtitle="Grant or revoke role-based admin permissions for this user"
      icon={Shield}
      iconTone="indigo"
      maxWidth="max-w-md"
      headerBg={true}
    >
      <div className="space-y-4">
        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* User Summary */}
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center space-x-3">
          <Avatar src={targetUser.avatar} name={targetUser.username} size="md" />
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">
              {targetUser.nickname || targetUser.username}
            </div>
            <div className="text-[11px] font-mono text-slate-400 truncate">
              @{targetUser.username} · {targetUser.email}
            </div>
          </div>
        </div>

        {/* Role Options */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
          <button
            type="button"
            onClick={() => setSelectedRoleId('')}
            className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
              !selectedRoleId
                ? 'bg-indigo-950/50 border-indigo-500/60 text-white'
                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <UserMinus className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-xs font-semibold">Normal User (No Admin Role)</div>
                <div className="text-[10px] text-slate-400">Standard messenger access only</div>
              </div>
            </div>
            {!selectedRoleId && <Check className="w-4 h-4 text-indigo-400" />}
          </button>

          {roles.map((r) => {
            const active = String(selectedRoleId) === String(r._id);
            return (
              <button
                key={r._id}
                type="button"
                onClick={() => setSelectedRoleId(r._id)}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                  active
                    ? 'bg-indigo-950/50 border-indigo-500/60 text-white'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-semibold flex items-center space-x-2">
                    <span className="truncate">{r.name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono">
                      {r.permissions?.length || 0} perms
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {r.description || 'Custom role'}
                  </div>
                </div>
                {active && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-lg disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{saving ? 'Saving...' : 'Save Role Assignment'}</span>
          </button>
        </div>
      </div>
    </ModalShell>
  );
};
