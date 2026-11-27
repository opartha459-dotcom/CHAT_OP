import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, Check, UserMinus, Loader2, AlertCircle } from 'lucide-react';
import { ModalShell } from '../common/ModalShell';
import { Avatar } from '../common/Avatar';

export const RoleAssignmentModal = ({
  isOpen,
  onClose,
  targetUser,
  currentUserId,
  roles = [],
  authHeaders,
  onAssigned
}) => {
  // selectionMode: 'user' | 'custom:<roleId>' | 'admin'
  const [selection, setSelection] = useState('user');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && targetUser) {
      if (targetUser.role === 'admin') {
        setSelection('admin');
      } else if (targetUser.customRole?._id || targetUser.customRole) {
        setSelection(`custom:${targetUser.customRole?._id || targetUser.customRole}`);
      } else {
        setSelection('user');
      }
      setError('');
    }
  }, [isOpen, targetUser]);

  if (!targetUser) return null;

  const isSelf = String(targetUser._id) === String(currentUserId);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (selection === 'admin') {
        if (targetUser.role !== 'admin') {
          const res = await fetch(`/api/admin/users/${targetUser._id}/role`, {
            method: 'POST',
            headers: authHeaders(),
            credentials: 'include',
            body: JSON.stringify({ role: 'admin' })
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            setError(data.message || 'Failed to promote user to Super Admin.');
            return;
          }
          onAssigned?.({ message: `Promoted @${targetUser.username} to Super Admin.` });
        }
        onClose();
        return;
      }

      // If targetUser was Super Admin and is being demoted to user or custom role
      if (targetUser.role === 'admin') {
        const demoteRes = await fetch(`/api/admin/users/${targetUser._id}/role`, {
          method: 'POST',
          headers: authHeaders(),
          credentials: 'include',
          body: JSON.stringify({ role: 'user' })
        });
        const demoteData = await demoteRes.json();
        if (!demoteRes.ok || !demoteData.success) {
          setError(demoteData.message || 'Failed to update admin status.');
          return;
        }
      }

      const roleId = selection.startsWith('custom:') ? selection.slice(7) : null;
      const res = await fetch(`/api/admin/users/${targetUser._id}/custom-role`, {
        method: 'PUT',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ roleId })
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
      title="Make Admin / Assign Role"
      subtitle="Choose exact role and permissions for this user"
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

        {isSelf && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
            Your own Super Admin account is protected and cannot be demoted here.
          </div>
        )}

        {/* Role Options */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
          <button
            type="button"
            disabled={isSelf}
            onClick={() => setSelection('user')}
            className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition cursor-pointer disabled:opacity-40 ${
              selection === 'user'
                ? 'bg-indigo-950/50 border-indigo-500/60 text-white'
                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <UserMinus className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-xs font-semibold">Normal User (No Admin Access)</div>
                <div className="text-[10px] text-slate-400">Standard messenger access only</div>
              </div>
            </div>
            {selection === 'user' && <Check className="w-4 h-4 text-indigo-400" />}
          </button>

          {roles.length > 0 && (
            <div className="pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Custom Admin Roles (Scoped Permissions)
            </div>
          )}

          {roles.map((r) => {
            const key = `custom:${r._id}`;
            const active = selection === key;
            return (
              <button
                key={r._id}
                type="button"
                disabled={isSelf}
                onClick={() => setSelection(key)}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition cursor-pointer disabled:opacity-40 ${
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
                    {r.description || 'Custom scoped admin role'}
                  </div>
                </div>
                {active && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
              </button>
            );
          })}

          <div className="pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
            System Level
          </div>
          <button
            type="button"
            disabled={isSelf}
            onClick={() => setSelection('admin')}
            className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition cursor-pointer disabled:opacity-40 ${
              selection === 'admin'
                ? 'bg-violet-950/60 border-violet-500/70 text-white'
                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-violet-400" />
              <div>
                <div className="text-xs font-semibold">Super Admin (Full Access)</div>
                <div className="text-[10px] text-slate-400">
                  Unrestricted access to all features, roles, and settings
                </div>
              </div>
            </div>
            {selection === 'admin' && <Check className="w-4 h-4 text-violet-400" />}
          </button>
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
            disabled={saving || isSelf}
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-lg disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{saving ? 'Saving...' : 'Apply Role'}</span>
          </button>
        </div>
      </div>
    </ModalShell>
  );
};
