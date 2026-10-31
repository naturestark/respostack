import React, { useState, useMemo } from 'react';
import {
  CATEGORIES,
  Responsibility,
  ResponsibilityCategory,
  SortOption,
} from '../../types/responsibility';
import { ResponsibilityCard } from '../responsibilities/ResponsibilityCard';
import { EmptyState } from '../common/EmptyState';
import { filterResponsibilities, sortResponsibilities } from '../../utils/filterSortUtils';

interface AllResponsibilitiesViewProps {
  responsibilities: Responsibility[];
  onToggleComplete: (id: string) => void;
  onEdit: (responsibility: Responsibility) => void;
  onDelete: (responsibility: Responsibility) => void;
  onNewResponsibility: () => void;
}

export const AllResponsibilitiesView: React.FC<AllResponsibilitiesViewProps> = ({
  responsibilities,
  onToggleComplete,
  onEdit,
  onDelete,
  onNewResponsibility,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ResponsibilityCategory | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [sortBy, setSortBy] = useState<SortOption>('urgency');

  // Filter and sort items
  const filteredAndSorted = useMemo(() => {
    const filtered = filterResponsibilities(responsibilities, {
      searchQuery,
      category: selectedCategory,
      completionStatus: statusFilter,
    });
    return sortResponsibilities(filtered, sortBy);
  }, [responsibilities, searchQuery, selectedCategory, statusFilter, sortBy]);

  const isFiltering =
    searchQuery.trim() !== '' || selectedCategory !== 'ALL' || statusFilter !== 'active';

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setStatusFilter('active');
    setSortBy('urgency');
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            All Responsibilities
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage, filter, and track all your active and past obligations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isFiltering && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs font-medium text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-md transition-colors"
            >
              Reset filters
            </button>
          )}
          <div className="text-xs font-medium text-slate-500">
            Showing <span className="font-bold text-slate-800">{filteredAndSorted.length}</span> of{' '}
            <span className="font-bold text-slate-800">{responsibilities.length}</span> total
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3.5">
        {/* Search input & Sort Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or notes..."
              aria-label="Search responsibilities by title or notes"
              className="w-full pl-9 pr-9 py-2 text-sm text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                aria-label="Clear search input"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg" role="group" aria-label="Filter by completion status">
            {(
              [
                { id: 'active', label: 'Active' },
                { id: 'completed', label: 'Done' },
                { id: 'all', label: 'All' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                aria-pressed={statusFilter === tab.id}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="sort-select" className="sr-only">
              Sort responsibilities by
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort responsibilities"
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="urgency">Sort: By Urgency</option>
              <option value="dueDateAsc">Due Date: Earliest First</option>
              <option value="dueDateDesc">Due Date: Latest First</option>
              <option value="recent">Recently Updated</option>
              <option value="titleAsc">Title: Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100" role="group" aria-label="Filter by category">
          <span className="text-xs font-semibold text-slate-400 mr-1">Categories:</span>
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            aria-pressed={selectedCategory === 'ALL'}
            className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                aria-pressed={isSelected}
                className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                  isSelected
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Responsibilities List */}
      {filteredAndSorted.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {filteredAndSorted.map((item) => (
            <ResponsibilityCard
              key={item.id}
              responsibility={item}
              onToggleComplete={onToggleComplete}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : responsibilities.length === 0 ? (
        <EmptyState
          title="No responsibilities yet"
          description="Respostack keeps your personal responsibilities organized in one private, offline place."
          actionLabel="Add Your First Responsibility"
          onAction={onNewResponsibility}
        />
      ) : (
        <EmptyState
          title="No matching responsibilities"
          description="No items matched your current filters and search query. Try resetting filters to see your saved items."
          actionLabel="Reset Filters"
          onAction={handleClearFilters}
        />
      )}
    </div>
  );
};
