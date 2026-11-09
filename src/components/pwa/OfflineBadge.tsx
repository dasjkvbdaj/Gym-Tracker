import React from 'react';
import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useGym } from '../../context/GymContext';

export const OfflineBadge: React.FC = () => {
  const isOnline = useNetworkStatus();
  const { settings } = useGym();
  const lang = settings.language;
  const isDark = settings.theme === 'dark';

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-20 sm:bottom-4 start-4 end-4 sm:start-auto sm:end-4 z-40 px-3.5 py-2 rounded-xl border flex items-center gap-2.5 shadow-lg backdrop-blur-md animate-fade-in ${
        isDark
          ? 'bg-[#181F2C]/90 border-emerald-500/30 text-emerald-400'
          : 'bg-white/95 border-emerald-300 text-emerald-800'
      }`}
    >
      <WifiOff className="w-4 h-4 shrink-0 text-emerald-400" />
      <div className="text-xs font-semibold">
        {lang === 'ar'
          ? 'أنت غير متصل بالإنترنت — وضع PWA نشط وكافة الميزات تعمل محلياً'
          : 'Offline Mode Active — Full access and local data preserved'}
      </div>
    </div>
  );
};

