import React from 'react';
import {
  Activity,
  Calendar as CalendarIcon,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  Moon,
  Play,
  Settings as SettingsIcon,
  Sun,
  TrendingUp,
  X,
  AlertCircle,
  Info,
  Globe,
} from 'lucide-react';

import { useGym } from '../../context/GymContext';
import { AppSection } from '../../types/workout';
import { UI_TEXT } from '../../utils/i18n';
import { OfflineBadge } from '../pwa/OfflineBadge';

export const AppNavigation: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const {
    currentSection,
    setCurrentSection,
    activeWorkout,
    settings,
    updateSettings,
    toasts,
    dismissToast,
  } = useGym();

  const lang = settings.language;
  const t = UI_TEXT[lang];
  const isDark = settings.theme === 'dark';

  // DESKTOP NAVIGATION
  const navItems: {
    id: AppSection;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'schedule', label: t.myWorkout, icon: ClipboardList },
    { id: 'exercises', label: t.exercises, icon: Dumbbell },
    {
      id: 'start-workout',
      label: activeWorkout ? t.resumeWorkout : t.startWorkout,
      icon: Play,
    },
    { id: 'calendar', label: t.calendar, icon: CalendarIcon },
    { id: 'progress', label: t.progress, icon: TrendingUp },
    { id: 'settings', label: t.settings, icon: SettingsIcon },
  ];

  // MOBILE BOTTOM NAVIGATION
  const mobileBottomItems: {
    id: AppSection;
    label: string;
    icon: React.FC<{ className?: string }>;
    isCenter?: boolean;
  }[] = [
    {
      id: 'dashboard',
      label: lang === 'ar' ? 'الرئيسية' : 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'schedule',
      label: lang === 'ar' ? 'جدولي' : 'Schedule',
      icon: ClipboardList,
    },
    {
      id: 'start-workout',
      label: activeWorkout
        ? lang === 'ar' ? 'متابعة' : 'Active'
        : lang === 'ar' ? 'تمرين' : 'Workout',
      icon: Play,
      isCenter: true,
    },
    {
      id: 'calendar',
      label: lang === 'ar' ? 'التقويم' : 'Calendar',
      icon: CalendarIcon,
    },
    {
      id: 'progress',
      label: lang === 'ar' ? 'التطور' : 'Progress',
      icon: TrendingUp,
    },
  ];

  const toggleTheme = () => {
    updateSettings({
      theme: isDark ? 'light' : 'dark',
    });
  };

  const toggleLanguage = () => {
    updateSettings({
      language: lang === 'en' ? 'ar' : 'en',
    });
  };

  return (
    <div
      className={`min-h-screen flex flex-col lg:flex-row ${
        isDark
          ? 'bg-[hsl(240,6%,4%)] text-[hsl(0,0%,97%)]'
          : 'bg-[hsl(40,20%,97.5%)] text-[hsl(240,10%,9%)]'
      }`}
    >
      {/* DESKTOP SIDEBAR */}
      <aside
        className={`hidden lg:flex lg:flex-col lg:w-[264px] lg:fixed lg:inset-y-0 z-30 border-e ${
          isDark
            ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
            : 'bg-white border-[hsl(40,10%,88%)] shadow-sm'
        }`}
      >
        {/* BRAND */}
        <div className="p-5 flex items-center justify-between border-b border-inherit">
          <button
            onClick={() => setCurrentSection('dashboard')}
            className="flex items-center gap-3 text-start group focus:outline-none"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                isDark
                  ? 'bg-[hsl(75,92%,56%)]/15 border border-[hsl(75,92%,56%)]/40 text-[hsl(75,92%,56%)] group-hover:bg-[hsl(75,92%,56%)] group-hover:text-[hsl(240,6%,4%)]'
                  : 'bg-[hsl(76,78%,42%)]/10 border border-[hsl(76,78%,42%)]/30 text-[hsl(76,78%,42%)] group-hover:bg-[hsl(76,78%,42%)] group-hover:text-white'
              }`}
            >
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <div className="font-display font-bold text-lg tracking-tight leading-none flex items-center gap-1.5">
                IRONPULSE
                <span
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    isDark ? 'bg-[hsl(75,92%,56%)]' : 'bg-[hsl(76,78%,42%)]'
                  }`}
                />
              </div>
              <p
                className={`text-xs mt-0.5 ${
                  isDark ? 'text-gray-400' : 'text-slate-500'
                }`}
              >
                {t.appTagline}
              </p>
            </div>
          </button>
        </div>

        {/* START / RESUME */}
        <div className="p-4">
          <button
            onClick={() => setCurrentSection('start-workout')}
            className={`w-full py-3 px-4 rounded-xl font-display font-semibold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg cursor-pointer ${
              activeWorkout
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/15'
                : isDark
                ? 'bg-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,62%)] text-[hsl(240,6%,4%)] shadow-[hsl(75,92%,56%)]/15'
                : 'bg-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,38%)] text-white shadow-[hsl(76,78%,42%)]/15'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{activeWorkout ? t.resumeWorkout : t.startWorkout}</span>
            {activeWorkout && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-950/20 font-bold">
                {lang === 'ar' ? 'نشط' : 'Active'}
              </span>
            )}
          </button>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentSection(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? isDark
                      ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)] border border-[hsl(75,92%,56%)]/30 font-semibold'
                      : 'bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)] border border-[hsl(76,78%,42%)]/25 font-semibold'
                    : isDark
                    ? 'text-gray-400 hover:text-gray-100 hover:bg-[hsl(240,5%,11%)]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-[hsl(40,15%,94%)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? isDark
                          ? 'text-[hsl(75,92%,56%)]'
                          : 'text-[hsl(76,78%,42%)]'
                        : isDark
                        ? 'text-gray-400'
                        : 'text-slate-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.id === 'start-workout' && activeWorkout && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                )}
              </button>
            );
          })}
        </nav>

        {/* PREFERENCES */}
        <div
          className={`p-4 border-t space-y-3 ${
            isDark
              ? 'border-[hsl(240,4%,16%)] bg-[hsl(240,6%,4%)]'
              : 'border-[hsl(40,10%,88%)] bg-[hsl(40,15%,95%)]'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>
              {lang === 'ar' ? 'الوحدة الافتراضية:' : 'Default Unit:'}
            </span>
            <span
              className={`font-mono-num font-semibold uppercase px-2 py-0.5 rounded border ${
                isDark
                  ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)] border-[hsl(75,92%,56%)]/30'
                  : 'bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)] border-[hsl(76,78%,42%)]/25'
              }`}
            >
              {settings.preferredWeightUnit}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={toggleTheme}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)] text-gray-300 hover:border-[hsl(240,4%,19%)]'
                  : 'bg-white border-[hsl(40,10%,88%)] text-slate-700 hover:bg-[hsl(40,15%,94%)]'
              }`}
              title="Toggle Dark / Light Theme"
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-700" />
              )}
              <span>
                {isDark
                  ? lang === 'ar' ? 'نهاري' : 'Light'
                  : lang === 'ar' ? 'ليلي' : 'Dark'}
              </span>
            </button>
            <button
              onClick={toggleLanguage}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)] text-gray-300 hover:border-[hsl(240,4%,19%)]'
                  : 'bg-white border-[hsl(40,10%,88%)] text-slate-700 hover:bg-[hsl(40,15%,94%)]'
              }`}
              title="Switch Language (English / العربية)"
            >
              <Globe
                className={`w-3.5 h-3.5 ${
                  isDark
                    ? 'text-[hsl(75,92%,56%)]'
                    : 'text-[hsl(76,78%,42%)]'
                }`}
              />
              <span>{lang === 'en' ? 'العربية' : 'English'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header
        className={`lg:hidden sticky top-0 z-30 border-b backdrop-blur-md ${
          isDark
            ? 'bg-[hsl(240,6%,4%)]/90 border-[hsl(240,4%,16%)]'
            : 'bg-white/90 border-[hsl(40,10%,88%)]'
        }`}
      >
        <div className="px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setCurrentSection('dashboard')}
            className="flex items-center gap-2.5 focus:outline-none"
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDark
                  ? 'bg-[hsl(75,92%,56%)]/15 border border-[hsl(75,92%,56%)]/40 text-[hsl(75,92%,56%)]'
                  : 'bg-[hsl(76,78%,42%)]/10 border border-[hsl(76,78%,42%)]/30 text-[hsl(76,78%,42%)]'
              }`}
            >
              <Dumbbell className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-base tracking-tight">
              IRONPULSE
            </span>
          </button>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleLanguage}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
                isDark
                  ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)] text-gray-300'
                  : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,88%)] text-slate-700'
              }`}
            >
              {lang === 'en' ? 'عربي' : 'EN'}
            </button>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg border ${
                isDark
                  ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)] text-amber-400'
                  : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,88%)] text-slate-700'
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* MOBILE SECTION PILLS */}
        <div className="px-3 pb-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentSection(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? isDark
                      ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,6%,4%)] font-semibold shadow-sm'
                      : 'bg-[hsl(76,78%,42%)] text-white font-semibold shadow-sm'
                    : isDark
                    ? 'bg-[hsl(240,5%,7.5%)] text-gray-400 border border-[hsl(240,4%,16%)]'
                    : 'bg-[hsl(40,15%,94%)] text-slate-600 border border-[hsl(40,10%,88%)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 lg:ps-[264px] flex flex-col min-w-0">
        {/* ACTIVE WORKOUT BANNER */}
        {activeWorkout && currentSection !== 'start-workout' && (
          <div className="sticky top-0 z-20 bg-amber-500/15 border-b border-amber-500/40 backdrop-blur-md px-4 py-2.5">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <Activity className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="text-xs sm:text-sm font-medium">
                  <span className="font-semibold text-amber-400">
                    {t.activeWorkout}:
                  </span>{' '}
                  <span>{activeWorkout.title}</span>
                  <span className="ms-2 text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                    {lang === 'ar' ? 'جلسة نشطة' : 'In Progress'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setCurrentSection('start-workout')}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{t.resumeWorkout}</span>
              </button>
            </div>
          </div>
        )}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-28 lg:pb-10">
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav
        className={`lg:hidden fixed bottom-0 inset-x-0 z-30 h-[68px] border-t backdrop-blur-lg px-2 flex items-center justify-around ${
          isDark
            ? 'bg-[hsl(240,5%,7.5%)]/95 border-[hsl(240,4%,16%)]'
            : 'bg-white/95 border-[hsl(40,10%,88%)]'
        }`}
      >
        {mobileBottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          if (item.isCenter) {
            return (
              <button
                key={item.id}
                onClick={() => setCurrentSection(item.id)}
                className="flex flex-col items-center justify-center -mt-4 focus:outline-none"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                    activeWorkout
                      ? 'bg-amber-500 text-slate-950 shadow-amber-500/25'
                      : isDark
                      ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,6%,4%)] shadow-[hsl(75,92%,56%)]/25'
                      : 'bg-[hsl(76,78%,42%)] text-white shadow-[hsl(76,78%,42%)]/25'
                  }`}
                >
                  <Icon className="w-5 h-5 fill-current" />
                </div>
                <span
                  className={`text-[10px] font-semibold mt-1 ${
                    activeWorkout
                      ? 'text-amber-400'
                      : isActive
                      ? isDark
                        ? 'text-[hsl(75,92%,56%)]'
                        : 'text-[hsl(76,78%,42%)]'
                      : isDark
                      ? 'text-gray-300'
                      : 'text-slate-700'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          }
          return (
            <button
              key={item.id}
              onClick={() => setCurrentSection(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl min-w-[56px] transition-colors ${
                isActive
                  ? isDark
                    ? 'text-[hsl(75,92%,56%)]'
                    : 'text-[hsl(76,78%,42%)]'
                  : isDark
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-1">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* OFFLINE STATUS */}
      <OfflineBadge />

      {/* TOAST NOTIFICATIONS */}
      <div className="fixed bottom-20 lg:bottom-6 end-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md transition-all ${
              toast.type === 'error'
                ? 'bg-red-950/90 border-red-500/40 text-red-200'
                : toast.type === 'info'
                ? isDark
                  ? 'bg-[hsl(240,5%,11%)]/95 border-[hsl(240,4%,19%)] text-gray-100'
                  : 'bg-slate-900 text-white border-slate-700'
                : isDark
                ? 'bg-[hsl(240,5%,7.5%)]/95 border-[hsl(75,92%,56%)]/40 text-[hsl(75,92%,56%)]'
                : 'bg-[hsl(76,78%,42%)] text-white border-[hsl(76,78%,42%)]/40'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
              {toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              ) : toast.type === 'info' ? (
                <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              ) : (
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 ${
                    isDark ? 'text-[hsl(75,92%,56%)]' : 'text-white'
                  }`}
                />
              )}
              <span>{toast.text}</span>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
