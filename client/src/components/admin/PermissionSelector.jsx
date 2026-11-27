import React, { useState, useMemo } from 'react';
import { Check, ChevronDown, ChevronRight, Search, ShieldCheck, X } from 'lucide-react';

export const PermissionSelector = ({
  groups = [],
  selectedPermissions = [],
  onChange
}) => {
  const [search, setSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const selectedSet = useMemo(() => new Set(selectedPermissions), [selectedPermissions]);
  const allKeys = useMemo(
    () => groups.flatMap((g) => g.permissions.map((p) => p.key)),
    [groups]
  );

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter(
          (p) =>
            p.label.toLowerCase().includes(q) ||
            p.key.toLowerCase().includes(q) ||
            (p.description || '').toLowerCase().includes(q) ||
            group.label.toLowerCase().includes(q)
        )
      }))
      .filter((g) => g.permissions.length > 0);
  }, [groups, search]);

  const togglePermission = (key) => {
    const next = new Set(selectedSet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(Array.from(next));
  };

  const selectAllInGroup = (group) => {
    const next = new Set(selectedSet);
    group.permissions.forEach((p) => next.add(p.key));
    onChange(Array.from(next));
  };

  const deselectAllInGroup = (group) => {
    const next = new Set(selectedSet);
    group.permissions.forEach((p) => next.delete(p.key));
    onChange(Array.from(next));
  };

  const toggleGroupCollapse = (groupId) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search permissions by name or key..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <span className="px-2.5 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-[11px] font-bold text-indigo-300 flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              {selectedSet.size} / {allKeys.length} selected
            </span>
          </span>
          <button
            type="button"
            onClick={() => onChange([...allKeys])}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 transition cursor-pointer"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={() => onChange([])}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 transition cursor-pointer"
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* Permission Groups */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {filteredGroups.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 border border-slate-800 rounded-2xl">
            No permissions match &ldquo;{search}&rdquo;.
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isCollapsed = Boolean(collapsedGroups[group.id]) && !search.trim();
            const groupKeys = group.permissions.map((p) => p.key);
            const selectedInGroup = groupKeys.filter((k) => selectedSet.has(k)).length;
            const allSelectedInGroup = selectedInGroup === groupKeys.length && groupKeys.length > 0;

            return (
              <div
                key={group.id}
                className="rounded-2xl border border-slate-800/90 bg-slate-900/50 overflow-hidden"
              >
                <div className="px-3.5 py-2.5 bg-slate-900/80 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleGroupCollapse(group.id)}
                    className="flex items-center space-x-2 text-left min-w-0 flex-1 cursor-pointer"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{group.label}</div>
                      {group.description && (
                        <div className="text-[10px] text-slate-400 truncate">{group.description}</div>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {selectedInGroup}/{groupKeys.length}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        allSelectedInGroup ? deselectAllInGroup(group) : selectAllInGroup(group)
                      }
                      className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                    >
                      {allSelectedInGroup ? 'Deselect' : 'Select All'}
                    </button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.permissions.map((perm) => {
                      const checked = selectedSet.has(perm.key);
                      return (
                        <button
                          key={perm.key}
                          type="button"
                          onClick={() => togglePermission(perm.key)}
                          className={`flex items-start space-x-2.5 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            checked
                              ? 'bg-indigo-950/50 border-indigo-500/50 text-white'
                              : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div
                            className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition ${
                              checked
                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                : 'border-slate-600 bg-slate-900'
                            }`}
                          >
                            {checked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold leading-tight">{perm.label}</div>
                            <div className="text-[10px] font-mono text-indigo-300/80 mt-0.5 truncate">
                              {perm.key}
                            </div>
                            {perm.description && (
                              <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                                {perm.description}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
