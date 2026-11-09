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
          ? 'bg-[hsl(240,5%,11%)]/90 border-[hsl(75,92%,56%)]/30 text-[hsl(75,92%,56%)]'
          : 'bg-white/95 border-[hsl(76,78%,42%)]/30 text-[hsl(76,78%,42%)]'
      }`}
    >
      <WifiOff className={`w-4 h-4 shrink-0 ${
        isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
      }`} />
      <div className="text-xs font-semibold">
        {lang === 'ar'
          ? 'أنت غير متصل بالإنترنت — وضع PWA نشط وكافة الميزات تعمل محلياً'
          : 'Offline Mode Active — Full access and local data preserved'}
      </div>
    </div>
  );
};