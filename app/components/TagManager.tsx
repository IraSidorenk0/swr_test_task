'use client';

interface TagManagerProps {
  tags: string[];
  maxTags?: number;
  onTagsChange: (tags: string[]) => void;
  error?: string;
}

export default function TagManager({ tags, maxTags = 10, onTagsChange, error }: TagManagerProps) {
  const addTag = () => {
    if (tags.length < maxTags) {
      onTagsChange([...tags, '']);
    }
  };

  const removeTag = (index: number) => {
    const newTags = tags.filter((_, i) => i !== index);
    onTagsChange(newTags);
  };

  const updateTag = (index: number, value: string) => {
    const newTags = [...tags];
    newTags[index] = value;
    onTagsChange(newTags);
  };

  return (
    <div>
      <label className="form-label">
        🏷️ Теги * (минимум 1, максимум {maxTags})
      </label>
      <div className="space-y-2">
        {tags.map((tag, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={tag}
              onChange={(e) => updateTag(index, e.target.value)}
              className="form-input flex-1"
              placeholder={`Тег ${index + 1}`}
            />
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="btn btn-danger px-3"
              aria-label="Удалить тег"
            >
              🗑️
            </button>
          </div>
        ))}
        {tags.length < maxTags && (
          <button
            type="button"
            onClick={addTag}
            className="btn btn-success text-sm"
          >
            ➕ Добавить тег
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
