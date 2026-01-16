'use client';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onRefresh?: () => void;
  showTroubleshooting?: boolean;
}

export default function ErrorMessage({ 
  title = 'Error connecting to Firebase',
  message, 
  onRetry, 
  onRefresh,
  showTroubleshooting = false 
}: ErrorMessageProps) {
  return (
    <div className="flex justify-center items-center">
      <div className="text-red-500 text-center max-w-md">
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <p className="mb-4">{message}</p>
        
        {showTroubleshooting && (
          <div className="text-sm text-gray-600 bg-gray-100 p-4 rounded-lg">
            <p className="font-semibold mb-2">Reasons:</p>
            <ul className="text-left space-y-1">
              <li>• Check file FIREBASE_SETUP_GUIDE.md</li>
              <li>• Ensure that Firestore Database is initialized</li>
              <li>• Check your internet connection</li>
            </ul>
            <p className="mt-2 text-xs">
              See file FIREBASE_SETUP_GUIDE.md for detailed instructions
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
                Retry
              </button>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                Update
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
