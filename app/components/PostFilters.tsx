'use client';
import React, { useState } from 'react';

interface PostFiltersProps {
  authorFilter: string;
  tagFilter: string;
  onAuthorFilterChange: (value: string) => void;
  onTagFilterChange: (value: string) => void;
  onApplyFilters: (author: string, tag: string) => void;
  onResetFilters: () => void;
}

export const PostFilters = ({ 
  authorFilter, 
  tagFilter, 
  onAuthorFilterChange, 
  onTagFilterChange,
  onApplyFilters,
  onResetFilters
}: PostFiltersProps) => {
  const [localAuthorFilter, setLocalAuthorFilter] = useState(authorFilter);
  const [localTagFilter, setLocalTagFilter] = useState(tagFilter);

  const handleApply = () => {
    onAuthorFilterChange(localAuthorFilter);
    onTagFilterChange(localTagFilter);
    onApplyFilters(localAuthorFilter, localTagFilter);
  };

  const handleReset = () => {
    setLocalAuthorFilter('');
    setLocalTagFilter('');
    onResetFilters();
  };

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">👤 Author</label>
          <input
            type="text"
            value={localAuthorFilter}
            onChange={(e) => setLocalAuthorFilter(e.target.value)}
            placeholder="Author name"
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">#️⃣ Tag</label>
          <input
            type="text"
            value={localTagFilter}
            onChange={(e) => setLocalTagFilter(e.target.value)}
            placeholder="Tag name"
            className="form-input"
          />
        </div>
      </div>
      <div className="flex space-x-2 mt-4">
        <button
          onClick={handleApply}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Apply filters
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
        >
          Reset filters
        </button>
      </div>
    </div>
  );
};
