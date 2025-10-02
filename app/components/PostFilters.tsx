'use client';

import { useState } from 'react';

interface PostFiltersProps {
  authorFilter: string;
  tagFilter: string;
  appliedAuthorFilter: string;
  appliedTagFilter: string;
  onAuthorFilterChange: (value: string) => void;
  onTagFilterChange: (value: string) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
}

export default function PostFilters({
  authorFilter,
  tagFilter,
  appliedAuthorFilter,
  appliedTagFilter,
  onAuthorFilterChange,
  onTagFilterChange,
  onApplyFilters,
  onResetFilters,
}: PostFiltersProps) {
  return (
    <div className="card p-6 mb-8 animate-slide-in">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        🔍 Фильтры
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="form-label">👤 Автор</label>
          <input
            type="text"
            value={authorFilter}
            onChange={(e) => onAuthorFilterChange(e.target.value)}
            placeholder="Имя автора"
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">#️⃣ Тег</label>
          <input
            type="text"
            value={tagFilter}
            onChange={(e) => onTagFilterChange(e.target.value)}
            placeholder="Напр. react"
            className="form-input"
          />
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
          <button
            onClick={onApplyFilters}
            className="btn btn-primary flex-1"
          >
            ✅ Применить
          </button>
          <button
            onClick={onResetFilters}
            className="btn btn-outline flex-1"
          >
            🗑️ Сбросить
          </button>
        </div>
      </div>
      {(appliedAuthorFilter || appliedTagFilter) && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center text-sm text-blue-800">
            <span className="mr-2">🎯</span>
            Активные фильтры:
            {appliedAuthorFilter && (
              <span className="ml-2 px-2 py-1 bg-blue-100 rounded">
                Автор: {appliedAuthorFilter}
              </span>
            )}
            {appliedTagFilter && (
              <span className="ml-2 px-2 py-1 bg-blue-100 rounded">
                Тег: {appliedTagFilter}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
