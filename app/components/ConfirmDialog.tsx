'use client';

type ConfirmDialogProps = {
  isOpen: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  isOpen,
  title = 'Approve action',
  description = 'Are you sure? This action is irreversible.',
  confirmText = 'Approve',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6 mx-4 animate-[fadeIn_.15s_ease-out]">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
        )}
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{description}</p>
        )}
        <div className="flex justify-end gap-2">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            autoFocus
          >
            {cancelText}
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}


