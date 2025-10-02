'use client';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onRefresh?: () => void;
  showTroubleshooting?: boolean;
}

export default function ErrorMessage({ 
  title = 'Ошибка подключения к Firebase',
  message, 
  onRetry, 
  onRefresh,
  showTroubleshooting = false 
}: ErrorMessageProps) {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-red-500 text-center max-w-md">
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <p className="mb-4">{message}</p>
        
        {showTroubleshooting && (
          <div className="text-sm text-gray-600 bg-gray-100 p-4 rounded-lg">
            <p className="font-semibold mb-2">Возможные причины:</p>
            <ul className="text-left space-y-1">
              <li>• Проверьте настройки Firebase Security Rules</li>
              <li>• Убедитесь, что Firestore Database инициализирован</li>
              <li>• Проверьте подключение к интернету</li>
            </ul>
            <p className="mt-2 text-xs">
              См. файл FIREBASE_SETUP_GUIDE.md для подробных инструкций
            </p>
          </div>
        )}
        
        {(onRetry || onRefresh) && (
          <div className="flex gap-2 mt-4">
            {onRetry && (
              <button
                onClick={onRetry}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Попробовать снова
              </button>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                Обновить
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
