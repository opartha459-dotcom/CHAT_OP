import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Plus,
  Search,
  Users,
  Key,
  Copy,
  Pencil,
  Trash2,
  Eye,
  AlertCircle,
  Loader2,
  Calendar
} from 'lucide-react';
import { ModalShell } from '../common/ModalShell';
import { Avatar } from '../common/Avatar';
import { PermissionSelector } from './PermissionSelector';
import { EmptyState, LoadingState, ConfirmationModal } from './AdminSharedUI';

export const RoleManagementTab = ({ authHeaders, showMsg, onRolesChanged }) => {
  const [roles, setRoles] = useState([]);
  const [permissionGroups, setPermissionGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create / Edit Modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [rolePerms, setRolePerms] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Detail & Assigned Users Modal
  const [detailModal, setDetailModal] = useState(null); // { role, assignedUsers }
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Safe Delete Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reassignRoleId, setReassignRoleId] = useState('');
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch('/api/admin/roles', { headers: authHeaders(), credentials: 'include' }),
        fetch('/api/admin/permissions', { headers: authHeaders(), credentials: 'include' })
      ]);
      const [rolesData, permsData] = await Promise.all([rolesRes.json(), permsRes.json()]);
      if (rolesData.success) setRoles(rolesData.roles || []);
      if (permsData.success) setPermissionGroups(permsData.groups || []);
    } catch (err) {
      console.error('[Load Roles Error]', err);
      showMsg?.('Failed to load roles.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, showMsg]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDesc('');
    setRolePerms([]);
    setFormError('');
    setFormOpen(true);
  };

  const openEditModal = (role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDesc(role.description || '');
    setRolePerms(role.permissions || []);
    setFormError('');
    setFormOpen(true);
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleName.trim()) {
      setFormError('Role name is required.');
      return;
    }
    if (rolePerms.length === 0) {
      setFormError('Select at least one permission.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const isEdit = Boolean(editingRole?._id);
      const res = await fetch(isEdit ? `/api/admin/roles/${editingRole._id}` : '/api/admin/roles', {
        method: isEdit ? 'PUT' : 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          name: roleName.trim(),
          description: roleDesc.trim(),
          permissions: rolePerms
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.message || 'Failed to save role.');
        return;
      }

      setFormOpen(false);
      await loadData();
      onRolesChanged?.();
      showMsg?.(data.message || 'Role saved.');
    } catch (err) {
      setFormError(err.message || 'Network error saving role.');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (role) => {
    try {
      const res = await fetch(`/api/admin/roles/${role._id}/duplicate`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
        onRolesChanged?.();
        showMsg?.(data.message);
      } else {
        showMsg?.(data.message || 'Failed to duplicate role.');
      }
    } catch {
      showMsg?.('Error duplicating role.');
    }
  };

  const openDetails = async (role) => {
    setDetailModal({ role, assignedUsers: [] });
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/roles/${role._id}`, {
        headers: authHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setDetailModal({ role: data.role, assignedUsers: data.assignedUsers || [] });
      }
    } catch {
      showMsg?.('Error loading role details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const confirmDeleteRole = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/roles/${deleteTarget._id}`, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ reassignRoleId: reassignRoleId || null })
      });
      const data = await res.json();
      if (data.success) {
        setDeleteTarget(null);
        setReassignRoleId('');
        await loadData();
        onRolesChanged?.();
        showMsg?.(data.message);
      } else {
        showMsg?.(data.message || 'Failed to delete role.');
      }
    } catch {
      showMsg?.('Error deleting role.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredRoles = roles.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Role &amp; Permission Management</h2>
          <p className="text-xs text-slate-400">
            Create dynamic custom roles with granular permissions and assign them to users.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-600/20 transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Custom Role</span>
        </button>
      </div>

      {/* Protected Super Admin Notice */}
      <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white">Super Admin (Protected System Role)</div>
            <div className="text-[11px] text-slate-400 truncate">
              Full unrestricted platform control. Custom roles cannot modify or escalate to Super Admin.
            </div>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold shrink-0">
          ALL PERMISSIONS
        </span>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search custom roles..."
          className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#1E1833] border border-violet-900/40 text-white placeholder-slate-400 rounded-xl focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Roles Grid */}
      {loading ? (
        <LoadingState label="Loading custom roles..." />
      ) : filteredRoles.length === 0 ? (
        <EmptyState
          icon={Shield}
          title={search ? 'No matching roles' : 'No custom roles created yet'}
          description="Create custom roles like Discord Moderator, Support Team, or Content Manager with exact permissions."
          action={
            !search && (
              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
              >
                Create First Role
              </button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRoles.map((role) => (
            <div
              key={role._id}
              className="p-4 bg-[#1E1833] border border-violet-900/35 hover:border-indigo-500/40 rounded-2xl flex flex-col justify-between space-y-4 transition"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">{role.name}</h3>
                    <p className="text-[10px] font-mono text-indigo-300/70 truncate">@{role.slug}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-[10px] font-mono font-bold text-indigo-300 shrink-0">
                    {role.permissions?.length || 0} perms
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px]">
                  {role.description || 'No description provided.'}
                </p>

                <div className="flex items-center flex-wrap gap-3 text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{role.assignedUserCount || 0} users</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{new Date(role.updatedAt || role.createdAt).toLocaleDateString()}</span>
                  </span>
                  {role.createdBy?.username && (
                    <span className="text-[10px] text-slate-500 truncate">
                      by @{role.createdBy.username}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-1.5 pt-3 border-t border-violet-900/25">
                <button
                  type="button"
                  onClick={() => openDetails(role)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-[11px] font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Eye className="w-3 h-3" />
                  <span>Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => openEditModal(role)}
                  className="px-2.5 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-[11px] font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDuplicate(role)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-[11px] font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Duplicate</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget(role);
                    setReassignRoleId('');
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-[11px] font-semibold flex items-center space-x-1 cursor-pointer ml-auto"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Role Modal */}
      <ModalShell
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingRole ? `Edit Role: ${editingRole.name}` : 'Create Custom Role'}
        subtitle="Configure role identity and select granular permissions"
        icon={Key}
        iconTone="indigo"
        maxWidth="max-w-2xl"
        headerBg={true}
      >
        <form onSubmit={handleSaveRole} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Role Name *
              </label>
              <input
                type="text"
                required
                maxLength={60}
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g. Discord Moderator"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Description
              </label>
              <input
                type="text"
                maxLength={300}
                value={roleDesc}
                onChange={(e) => setRoleDesc(e.target.value)}
                placeholder="Brief summary of responsibilities..."
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Permissions *
            </label>
            <PermissionSelector
              groups={permissionGroups}
              selectedPermissions={rolePerms}
              onChange={setRolePerms}
            />
          </div>

          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-lg disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{saving ? 'Saving...' : editingRole ? 'Save Changes' : 'Create Role'}</span>
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Role Details & Assigned Users Modal */}
      <ModalShell
        isOpen={Boolean(detailModal)}
        onClose={() => setDetailModal(null)}
        title={detailModal?.role?.name || 'Role Details'}
        subtitle={detailModal?.role?.description || 'Permissions and assigned users'}
        icon={Shield}
        iconTone="violet"
        maxWidth="max-w-xl"
        headerBg={true}
      >
        {detailModal && (
          <div className="space-y-4">
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Assigned Permissions ({detailModal.role.permissions?.length || 0})
              </h4>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {(detailModal.role.permissions || []).map((perm) => (
                  <span
                    key={perm}
                    className="px-2 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-[10px] font-mono text-indigo-300"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Assigned Users ({detailModal.assignedUsers?.length || 0})
              </h4>
              {loadingDetail ? (
                <LoadingState label="Loading assigned users..." />
              ) : detailModal.assignedUsers.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center border border-slate-800 rounded-xl">
                  No users are currently assigned to this role.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {detailModal.assignedUsers.map((u) => (
                    <div
                      key={u._id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Avatar src={u.avatar} name={u.username} size="sm" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">
                            {u.nickname || u.username}{' '}
                            <span className="text-slate-400 font-mono">@{u.username}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{u.email}</div>
                        </div>
                      </div>
                      {u.isBanned && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                          Banned
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </ModalShell>

      {/* Safe Delete Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteRole}
        title={`Delete Role: ${deleteTarget?.name || ''}`}
        message={
          deleteTarget?.assignedUserCount > 0
            ? `${deleteTarget.assignedUserCount} user(s) currently hold this role. Choose a replacement role below or leave empty to restore them to Normal User.`
            : 'Are you sure you want to permanently delete this custom role?'
        }
        confirmLabel="Delete Role"
        tone="rose"
        loading={deleting}
      >
        {deleteTarget?.assignedUserCount > 0 && (
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Reassign Affected Users To
            </label>
            <select
              value={reassignRoleId}
              onChange={(e) => setReassignRoleId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">None (Restore Normal User access)</option>
              {roles
                .filter((r) => r._id !== deleteTarget._id)
                .map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name} ({r.permissions?.length || 0} perms)
                  </option>
                ))}
            </select>
          </div>
        )}
      </ConfirmationModal>
    </div>
  );
};
