'use client';

interface UserInfoProps {
  user: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
  };
}

export default function UserInfo({ user }: UserInfoProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
      <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
        👤 Информация об авторе
      </h3>
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
          {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-blue-900">
            {user.displayName || user.email || 'Анонимный пользователь'}
          </p>
          <p className="text-xs text-blue-600">
            ID: {user.uid.slice(0, 8)}...
          </p>
        </div>
      </div>
    </div>
  );
}
