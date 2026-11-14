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
  Calendar
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
  dateKey = null
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

  return (
    <div className="w-full flex flex-col space-y-4 font-sans">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {(title || subtitle) && (
          <div>
            {title && <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>}
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        )}

        <div className="flex items-center space-x-2 self-start sm:self-auto ml-auto">
          {headerActions}

          {/* View Mode Toggle Button */}
          <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => handleToggleView('list')}
              className={`p-1.5 rounded-lg transition text-xs flex items-center space-x-1 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
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
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
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
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
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
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 cursor-pointer font-medium"
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
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                title="From date"
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer font-medium max-w-[135px] sm:max-w-none"
              />
              <span className="text-slate-400 text-xs">–</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                title="To date"
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer font-medium max-w-[135px] sm:max-w-none"
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
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 cursor-pointer font-medium"
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
              className="text-xs px-2.5 py-2 text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 font-medium transition cursor-pointer flex items-center space-x-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Content Rendering: Loading, Empty, Grid or List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Loading data records...</p>
        </div>
      ) : paginatedItems.length === 0 ? (
        <div className="py-16 px-4 flex flex-col items-center justify-center text-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{emptyTitle}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{emptyDescription}</p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="mt-2 text-xs font-semibold px-3 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-w-0">
          {paginatedItems.map((item, index) => (
            <div
              key={item._id || item.id || index}
              onClick={() => onItemClick && onItemClick(item)}
              className={`min-w-0 overflow-hidden ${onItemClick ? 'cursor-pointer' : ''}`}
            >
              {renderItem
                ? renderItem(item, 'grid')
                : (
                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs hover:border-indigo-400 dark:hover:border-indigo-500 transition">
                    <pre className="text-xs text-slate-700 dark:text-slate-300 overflow-x-auto">
                      {JSON.stringify(item, null, 2)}
                    </pre>
                  </div>
                )}
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          {renderRow ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedItems.map((item, index) => (
                <div
                  key={item._id || item.id || index}
                  onClick={() => onItemClick && onItemClick(item)}
                  className={onItemClick ? 'cursor-pointer' : ''}
                >
                  {renderRow(item, index)}
                </div>
              ))}
            </div>
          ) : columns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={`px-4 py-3 ${col.className || ''}`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedItems.map((item, idx) => (
                    <tr
                      key={item._id || item.id || idx}
                      onClick={() => onItemClick && onItemClick(item)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      {columns.map((col) => (
                        <td key={col.key} className={`px-4 py-3.5 text-slate-700 dark:text-slate-300 ${col.cellClassName || ''}`}>
                          {col.render ? col.render(item) : item[col.key] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedItems.map((item, index) => (
                <div
                  key={item._id || item.id || index}
                  onClick={() => onItemClick && onItemClick(item)}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  {renderItem ? renderItem(item, 'list') : (
                    <div className="text-xs text-slate-800 dark:text-slate-200">
                      {JSON.stringify(item)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-1 select-none">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing <span className="font-semibold text-slate-800 dark:text-white">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-semibold text-slate-800 dark:text-white">{Math.min(currentPage * pageSize, totalItems)}</span> of{' '}
            <span className="font-semibold text-slate-800 dark:text-white">{totalItems}</span> results
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
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
