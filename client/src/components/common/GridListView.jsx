import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutGrid,
  List,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  SlidersHorizontal,
  X,
  Calendar,
  Trash2,
  Check
} from 'lucide-react';

/**
 * Reusable, responsive GridListView component.
 * Provides switchable Grid & List views, search, multi-field filtering,
 * column sorting, pagination, empty states, and local layout persistence.
 */
export const GridListView = ({
  items = [],
  renderItem,
  renderRow,
  columns = [],
  searchPlaceholder = 'Search records...',
  searchKeys = [],
  filters = [],
  sortOptions = [],
  defaultSort = null,
  pageSize = 12,
  storageKey = null,
  initialView = 'grid',
  title = '',
  subtitle = '',
  headerActions = null,
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items matching your criteria.',
  onItemClick = null,
  /** key on each item used for date-range filtering, e.g. 'createdAt' */
  dateKey = null,
  /** Optional multi-select & bulk delete support */
  selectable = false,
  selectedIds = [],
  onSelectionChange = null,
  isItemSelectable = () => true,
  onBulkDelete = null,
  bulkDeleting = false,
  bulkDeleteLabel = 'Delete Selected'
}) => {
  // Layout persistence (defaults to initialView, which is 'grid')
  const [viewMode, setViewMode] = useState(() => {
    if (storageKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${storageKey}_view`);
      if (saved === 'grid' || saved === 'list') return saved;
    }
    return initialView;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [currentSort, setCurrentSort] = useState(defaultSort || (sortOptions[0] || null));
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Sync layout mode to localStorage
  const handleToggleView = (mode) => {
    setViewMode(mode);
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(`${storageKey}_view`, mode);
    }
  };

  // Reset to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilters, currentSort, dateFrom, dateTo]);

  // Handle active filter changes
  const handleFilterChange = (key, value) => {
    setActiveFilters((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleClearFilters = () => {
    setActiveFilters({});
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
  };

  // Filtered & Sorted items computation
  const processedItems = useMemo(() => {
    if (!Array.isArray(items)) return [];

    let result = [...items];

    // 1. Text Search Filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((item) => {
        if (!item) return false;
        if (searchKeys.length > 0) {
          return searchKeys.some((k) => {
            const val = k.split('.').reduce((acc, part) => acc && acc[part], item);
            return val !== undefined && val !== null && String(val).toLowerCase().includes(q);
          });
        }
        // Generic fallback search across stringified values
        return Object.values(item).some(
          (v) => v !== null && v !== undefined && typeof v !== 'object' && String(v).toLowerCase().includes(q)
        );
      });
    }

    // 2. Multi-Filter Dropdowns
    Object.entries(activeFilters).forEach(([filterKey, filterValue]) => {
      if (filterValue !== undefined && filterValue !== '' && filterValue !== 'all') {
        result = result.filter((item) => {
          const itemVal = filterKey.split('.').reduce((acc, part) => acc && acc[part], item);
          if (typeof filterValue === 'boolean') {
            return Boolean(itemVal) === filterValue;
          }
          return String(itemVal) === String(filterValue);
        });
      }
    });

    // 3. Date range filter
    if (dateKey && (dateFrom || dateTo)) {
      result = result.filter((item) => {
        const raw = dateKey.split('.').reduce((acc, p) => acc && acc[p], item);
        if (!raw) return false;
        const ts = new Date(raw).getTime();
        if (dateFrom && ts < new Date(dateFrom).getTime()) return false;
        if (dateTo) {
          const endOfDay = new Date(dateTo);
          endOfDay.setHours(23, 59, 59, 999);
          if (ts > endOfDay.getTime()) return false;
        }
        return true;
      });
    }

    // 4. Sorting
    if (currentSort && currentSort.key) {
      const { key, direction = 'asc' } = currentSort;
      result.sort((a, b) => {
        const valA = key.split('.').reduce((acc, part) => acc && acc[part], a);
        const valB = key.split('.').reduce((acc, part) => acc && acc[part], b);

        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (typeof valA === 'string') {
          return direction === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        if (typeof valA === 'number' || valA instanceof Date || !isNaN(Date.parse(valA))) {
          const numA = new Date(valA).getTime() || valA;
          const numB = new Date(valB).getTime() || valB;
          return direction === 'asc' ? numA - numB : numB - numA;
        }

        return direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      });
    }

    return result;
  }, [items, searchTerm, searchKeys, activeFilters, currentSort, dateKey, dateFrom, dateTo]);

  // Pagination calculation
  const totalItems = processedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedItems.slice(start, start + pageSize);
  }, [processedItems, currentPage, pageSize]);

  const hasActiveFilters = searchTerm.trim() !== '' || Object.values(activeFilters).some((v) => v !== '' && v !== 'all') || !!dateFrom || !!dateTo;

  const getItemId = (item, idx) => item?._id || item?.id || String(idx);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectableOnPage = useMemo(
    () =>
      selectable
        ? paginatedItems
            .map((item, idx) => ({ item, id: getItemId(item, idx) }))
            .filter(({ item }) => isItemSelectable(item))
        : [],
    [selectable, paginatedItems, isItemSelectable]
  );

  const allOnPageSelected =
    selectableOnPage.length > 0 && selectableOnPage.every(({ id }) => selectedSet.has(id));

  const toggleSelectItem = (id) => {
    if (!onSelectionChange) return;
    if (selectedSet.has(id)) {
      onSelectionChange(selectedIds.filter((x) => x !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const toggleSelectPage = () => {
    if (!onSelectionChange) return;
    const pageIds = selectableOnPage.map((x) => x.id);
    if (allOnPageSelected) {
      const pageSet = new Set(pageIds);
      onSelectionChange(selectedIds.filter((id) => !pageSet.has(id)));
    } else {
      const merged = new Set([...selectedIds, ...pageIds]);
      onSelectionChange(Array.from(merged));
    }
  };

  const selectAllFiltered = () => {
    if (!onSelectionChange) return;
    const allIds = processedItems
      .filter((item) => isItemSelectable(item))
      .map((item, idx) => getItemId(item, idx));
    onSelectionChange(allIds);
  };

  const renderSelectCheckbox = (item, idx, extraClass = '') => {
    if (!selectable || !isItemSelectable(item)) return null;
    const id = getItemId(item, idx);
    const checked = selectedSet.has(id);
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleSelectItem(id);
        }}
        aria-label={checked ? 'Deselect item' : 'Select item'}
        className={`w-5 h-5 rounded-md border flex items-center justify-center transition cursor-pointer shrink-0 ${
          checked
            ? 'bg-gradient-to-tr from-violet-600 to-fuchsia-600 border-violet-400 text-white shadow-sm'
            : 'bg-[#19142B]/90 border-violet-700/60 hover:border-violet-400 text-transparent'
        } ${extraClass}`}
      >
        <Check className="w-3.5 h-3.5 stroke-[3]" />
      </button>
    );
  };

  return (
    <div className="w-full flex flex-col space-y-4 font-sans min-w-0">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {(title || subtitle) && (
          <div className="min-w-0">
            {title && <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">{title}</h2>}
            {subtitle && <p className="text-xs text-violet-300/70 mt-0.5">{subtitle}</p>}
          </div>
        )}

        <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto sm:ml-auto">
          {headerActions}

          {/* View Mode Toggle Button */}
          <div className="inline-flex items-center p-1 bg-[#19142B] rounded-xl border border-violet-900/40">
            <button
              onClick={() => handleToggleView('list')}
              className={`p-1.5 rounded-lg transition text-xs flex items-center space-x-1 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-violet-600/30 text-white border border-violet-500/30 shadow-xs font-semibold'
                  : 'text-violet-400/70 hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
              <span className="hidden md:inline">List</span>
            </button>
            <button
              onClick={() => handleToggleView('grid')}
              className={`p-1.5 rounded-lg transition text-xs flex items-center space-x-1 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-violet-600/30 text-white border border-violet-500/30 shadow-xs font-semibold'
                  : 'text-violet-400/70 hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden md:inline">Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Controls Bar: Search, Filters, Sorting */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 bg-[#231C38] border border-violet-900/30 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.3)] min-w-0">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-violet-400/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-8 py-2 bg-[#19142B] border border-violet-900/40 rounded-xl text-xs text-white placeholder-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-violet-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <div key={filter.key} className="relative">
              <select
                value={activeFilters[filter.key] !== undefined ? activeFilters[filter.key] : 'all'}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                className="text-xs bg-[#19142B] border border-violet-900/40 rounded-xl px-3 py-2 text-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 cursor-pointer font-medium"
              >
                <option value="all">{filter.label}: All</option>
                {filter.options.map((opt) => (
                  <option key={String(opt.value)} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {/* Date Range Filter */}
          {dateKey && (
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
              <Calendar className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                title="From date"
                className="text-xs bg-[#19142B] border border-violet-900/40 rounded-xl px-2 py-1.5 text-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 cursor-pointer font-medium max-w-[135px] sm:max-w-none"
              />
              <span className="text-violet-400 text-xs">–</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                title="To date"
                className="text-xs bg-[#19142B] border border-violet-900/40 rounded-xl px-2 py-1.5 text-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 cursor-pointer font-medium max-w-[135px] sm:max-w-none"
              />
            </div>
          )}

          {/* Sort Selector */}
          {sortOptions.length > 0 && (
            <div className="flex items-center space-x-1">
              <select
                value={currentSort ? `${currentSort.key}:${currentSort.direction}` : ''}
                onChange={(e) => {
                  const [key, direction] = e.target.value.split(':');
                  setCurrentSort({ key, direction });
                }}
                className="text-xs bg-[#19142B] border border-violet-900/40 rounded-xl px-3 py-2 text-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 cursor-pointer font-medium"
              >
                {sortOptions.map((sort) => (
                  <option key={`${sort.key}:${sort.direction}`} value={`${sort.key}:${sort.direction}`}>
                    Sort: {sort.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs px-2.5 py-2 text-violet-300 hover:text-rose-400 font-medium transition cursor-pointer flex items-center space-x-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Multi-Select & Bulk Action Bar */}
      {selectable && paginatedItems.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 bg-[#1F1833] border border-violet-800/40 rounded-2xl shadow-sm">
          <div className="flex items-center flex-wrap gap-2.5">
            <button
              type="button"
              onClick={toggleSelectPage}
              className="flex items-center space-x-2 text-xs font-semibold text-violet-200 hover:text-white cursor-pointer"
            >
              <span
                className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                  allOnPageSelected
                    ? 'bg-gradient-to-tr from-violet-600 to-fuchsia-600 border-violet-400 text-white'
                    : 'bg-[#19142B] border-violet-700/60 text-transparent'
                }`}
              >
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
              <span>Select Page ({selectableOnPage.length})</span>
            </button>

            {processedItems.length > paginatedItems.length && selectedIds.length < processedItems.filter(isItemSelectable).length && (
              <button
                type="button"
                onClick={selectAllFiltered}
                className="text-[11px] font-semibold text-violet-400 hover:text-violet-200 underline cursor-pointer"
              >
                Select all {processedItems.filter(isItemSelectable).length} matching
              </button>
            )}

            {selectedIds.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-600/30 text-violet-200 border border-violet-500/40 font-mono">
                {selectedIds.length} selected
              </span>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center space-x-2 ml-auto">
              <button
                type="button"
                onClick={() => onSelectionChange?.([])}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-violet-300 hover:text-white bg-white/5 hover:bg-white/10 transition cursor-pointer"
              >
                Clear
              </button>
              {onBulkDelete && (
                <button
                  type="button"
                  onClick={() => onBulkDelete(selectedIds)}
                  disabled={bulkDeleting}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 shadow-md shadow-rose-950/50 transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
                >
                  {bulkDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {bulkDeleteLabel} ({selectedIds.length})
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Content Rendering: Loading, Empty, Grid or List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-[#231C38] border border-violet-900/30 rounded-2xl sm:rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
          <p className="text-xs text-violet-300/70 font-mono">Loading data records...</p>
        </div>
      ) : paginatedItems.length === 0 ? (
        <div className="py-16 px-4 flex flex-col items-center justify-center text-center space-y-3 bg-[#231C38] border border-violet-900/30 rounded-2xl sm:rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
          <div className="w-12 h-12 rounded-2xl bg-violet-900/30 border border-violet-700/30 flex items-center justify-center text-violet-400">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{emptyTitle}</h3>
            <p className="text-xs text-violet-300/70 mt-1 max-w-sm">{emptyDescription}</p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="mt-2 text-xs font-semibold px-3 py-1.5 bg-violet-600/30 text-violet-300 border border-violet-500/30 rounded-xl hover:bg-violet-600/50 transition cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4 min-w-0">
          {paginatedItems.map((item, index) => {
            const id = getItemId(item, index);
            const isSelected = selectable && selectedSet.has(id);
            return (
              <div
                key={id}
                onClick={() => onItemClick && onItemClick(item)}
                className={`relative min-w-0 overflow-hidden rounded-2xl transition ${
                  isSelected ? 'ring-2 ring-fuchsia-500/80' : ''
                } ${onItemClick ? 'cursor-pointer' : ''}`}
              >
                {selectable && isItemSelectable(item) && (
                  <div className="absolute top-2.5 right-2.5 z-20">
                    {renderSelectCheckbox(item, index)}
                  </div>
                )}
                {renderItem
                  ? renderItem(item, 'grid')
                  : (
                    <div className="p-4 bg-[#231C38] border border-violet-900/30 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:border-violet-500/50 transition">
                      <pre className="text-xs text-violet-200 overflow-x-auto">
                        {JSON.stringify(item, null, 2)}
                      </pre>
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-[#231C38] border border-violet-900/30 rounded-2xl sm:rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.3)] overflow-hidden">
          {renderRow ? (
            <div className="divide-y divide-violet-950/60">
              {paginatedItems.map((item, index) => {
                const id = getItemId(item, index);
                const isSelected = selectable && selectedSet.has(id);
                return (
                  <div
                    key={id}
                    onClick={() => onItemClick && onItemClick(item)}
                    className={`flex items-center gap-3 ${isSelected ? 'bg-violet-900/25' : ''} ${onItemClick ? 'cursor-pointer' : ''}`}
                  >
                    {selectable && isItemSelectable(item) && (
                      <div className="pl-3.5 shrink-0">{renderSelectCheckbox(item, index)}</div>
                    )}
                    <div className="flex-1 min-w-0">{renderRow(item, index)}</div>
                  </div>
                );
              })}
            </div>
          ) : columns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1C1630] text-violet-300/80 font-semibold uppercase tracking-wider border-b border-violet-900/40">
                  <tr>
                    {selectable && <th className="pl-4 pr-2 py-3.5 w-8" />}
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={`px-4 py-3.5 ${col.className || ''}`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-950/60">
                  {paginatedItems.map((item, idx) => {
                    const id = getItemId(item, idx);
                    const isSelected = selectable && selectedSet.has(id);
                    return (
                      <tr
                        key={id}
                        onClick={() => onItemClick && onItemClick(item)}
                        className={`hover:bg-violet-900/20 transition ${isSelected ? 'bg-violet-900/25' : ''}`}
                      >
                        {selectable && (
                          <td className="pl-4 pr-2 py-3.5 w-8">{renderSelectCheckbox(item, idx)}</td>
                        )}
                        {columns.map((col) => (
                          <td key={col.key} className={`px-4 py-3.5 text-violet-200 ${col.cellClassName || ''}`}>
                            {col.render ? col.render(item) : item[col.key] || '-'}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="divide-y divide-violet-950/60">
              {paginatedItems.map((item, index) => {
                const id = getItemId(item, index);
                const isSelected = selectable && selectedSet.has(id);
                return (
                  <div
                    key={id}
                    onClick={() => onItemClick && onItemClick(item)}
                    className={`p-3 sm:p-4 hover:bg-violet-900/20 transition flex items-start gap-3 ${
                      isSelected ? 'bg-violet-900/25' : ''
                    }`}
                  >
                    {selectable && isItemSelectable(item) && (
                      <div className="pt-1 shrink-0">{renderSelectCheckbox(item, index)}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      {renderItem ? renderItem(item, 'list') : (
                        <div className="text-xs text-violet-200">
                          {JSON.stringify(item)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-1 select-none">
          <div className="text-xs text-violet-300/70">
            Showing <span className="font-semibold text-white">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-semibold text-white">{Math.min(currentPage * pageSize, totalItems)}</span> of{' '}
            <span className="font-semibold text-white">{totalItems}</span> results
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl bg-[#231C38] border border-violet-900/40 text-violet-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-violet-900/30 transition cursor-pointer"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 text-xs font-semibold text-violet-200">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl bg-[#231C38] border border-violet-900/40 text-violet-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-violet-900/30 transition cursor-pointer"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
