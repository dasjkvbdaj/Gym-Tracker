import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Database,
  Download,
  Globe,
  HardDrive,
  Info,
  Moon,
  Scale,
  ShieldAlert,
  Smartphone,
  Sun,
  Upload,
  X,
  UserCheck,
} from 'lucide-react';
import { useGym } from '../context/GymContext';
import {
  BackupValidationResult,
  executeImportBackup,
  exportFullBackup,
  ImportSummary,
  validateBackupJson,
} from '../services/backupService';

export const SettingsPage: React.FC = () => {
  const {
    settings,
    updateSettings,
    workouts,
    exercises,
    weeklySchedule,
    setCurrentSection,
    showToast,
  } = useGym();

  const lang = settings.language;
  const isDark = settings.theme === 'dark';

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Import Backup Validation & Confirmation State
  const [selectedFileName, setSelectedFileName] = useState('');
  const [validationResult, setValidationResult] =
    useState<BackupValidationResult | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
  const [replaceConfirmedChecked, setReplaceConfirmedChecked] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastImportSummary, setLastImportSummary] =
    useState<ImportSummary | null>(null);

  // --- Body Weight State (Persisted in localStorage) ---
  const [bodyWeight, setBodyWeight] = useState<string>(() => {
    return localStorage.getItem('gym_tracker_user_body_weight') || '';
  });
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>(() => {
    return (localStorage.getItem('gym_tracker_user_weight_unit') as 'kg' | 'lbs') || settings.preferredWeightUnit || 'kg';
  });

  const handleSaveBodyWeight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bodyWeight || isNaN(Number(bodyWeight))) {
      showToast(
        lang === 'ar' ? 'الرجاء إدخال وزن صحيح.' : 'Please enter a valid weight.',
        'error'
      );
      return;
    }

    localStorage.setItem('gym_tracker_user_body_weight', bodyWeight);
    localStorage.setItem('gym_tracker_user_weight_unit', weightUnit);

    showToast(
      lang === 'ar'
        ? `تم حفظ وزن الجسم بنجاح: ${bodyWeight} ${weightUnit}`
        : `Body weight saved successfully: ${bodyWeight} ${weightUnit}`,
      'success'
    );
  };

  const handleExportBackup = async () => {
    try {
      const { filename } = await exportFullBackup();
      showToast(
        lang === 'ar'
          ? `تم تصدير النسخة الاحتياطية بنجاح: ${filename}`
          : `Exported complete backup: ${filename}`,
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast(
        lang === 'ar'
          ? 'حدث خطأ أثناء تصدير النسخة الاحتياطية.'
          : 'Failed to export backup file.',
        'error'
      );
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setLastImportSummary(null);
    setReplaceConfirmedChecked(false);
    try {
      const rawText = await file.text();
      const result = validateBackupJson(rawText);
      setValidationResult(result);
      if (!result.valid) {
        showToast(result.error || 'Invalid backup file.', 'error');
      }
    } catch {
      setValidationResult({
        valid: false,
        error: 'Could not read the selected file. Please ensure it is a valid .json file.',
      });
    }
    e.target.value = '';
  };

  const handleExecuteImport = async () => {
    if (!validationResult?.valid || !validationResult.data) return;
    if (importMode === 'replace' && !replaceConfirmedChecked) {
      showToast(
        lang === 'ar'
          ? 'يرجى تأكيد الموافقة على استبدال البيانات الحالية أولاً.'
          : 'Please check the confirmation box before replacing all local data.',
        'error'
      );
      return;
    }

    setIsImporting(true);
    try {
      const summary = await executeImportBackup(validationResult.data, importMode);
      setLastImportSummary(summary);
      setValidationResult(null);
      showToast(
        lang === 'ar'
          ? 'تم استيراد النسخة الاحتياطية وتحديث جميع البيانات بنجاح!'
          : 'Backup imported successfully! All application data has been updated.',
        'success'
      );
    } catch (err) {
      console.error('Import failed:', err);
      showToast(
        lang === 'ar'
          ? 'فشل الاستيراد — تم الحفاظ على بياناتك الحالية دون تغيير.'
          : 'Import failed — your existing local data was safely preserved.',
        'error'
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-display font-bold">
          {lang === 'ar' ? 'الإعدادات وإدارة البيانات' : 'Settings & Data Management'}
        </h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
          {lang === 'ar'
            ? 'تحكم في المظهر، اللغة، وحدة الوزن الافتراضية، وزن الجسم، والنسخ الاحتياطي الكامل لبياناتك المحلية.'
            : 'Configure appearance, language, default weight unit, body weight, and manage complete local device backups.'}
        </p>
      </div>

      {/* 1. APPEARANCE, LANGUAGE & WEIGHT PREFERENCES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Appearance Card */}
        <div
          className={`p-5 rounded-2xl border space-y-3 ${
            isDark
              ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
              : 'bg-white border-[hsl(40,10%,88%)] shadow-2xs'
          }`}
        >
          <div
            className={`flex items-center gap-2 ${
              isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
            } text-xs font-bold uppercase`}
          >
            {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span>{lang === 'ar' ? 'المظهر (Theme)' : 'Appearance'}</span>
          </div>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            {lang === 'ar'
              ? 'الوضع الليلي هو الافتراضي لراحة العين داخل الجيم.'
              : 'Dark Mode is default for optimal gym-floor visibility.'}
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => updateSettings({ theme: 'dark' })}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                settings.theme === 'dark'
                  ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)] border-[hsl(75,92%,56%)]'
                  : isDark
                  ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300'
                  : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,85%)] text-slate-700'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'داكن (Dark)' : 'Dark Mode'}</span>
            </button>
            <button
              onClick={() => updateSettings({ theme: 'light' })}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                settings.theme === 'light'
                  ? 'bg-[hsl(76,78%,42%)] text-white border-[hsl(76,78%,42%)]'
                  : isDark
                  ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300'
                  : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,85%)] text-slate-700'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'فاتح (Light)' : 'Light Mode'}</span>
            </button>
          </div>
        </div>

        {/* Language Card */}
        <div
          className={`p-5 rounded-2xl border space-y-3 ${
            isDark
              ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
              : 'bg-white border-[hsl(40,10%,88%)] shadow-2xs'
          }`}
        >
          <div
            className={`flex items-center gap-2 ${
              isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
            } text-xs font-bold uppercase`}
          >
            <Globe className="w-4 h-4" />
            <span>{lang === 'ar' ? 'اللغة (Language)' : 'Language'}</span>
          </div>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            {lang === 'ar'
              ? 'يدعم التطبيق الإنجليزية والعربية مع تخطيط RTL كامل.'
              : 'Supports English and Arabic with automatic RTL layout.'}
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => updateSettings({ language: 'en' })}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold border cursor-pointer ${
                settings.language === 'en'
                  ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)] border-[hsl(75,92%,56%)]'
                  : isDark
                  ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300'
                  : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,85%)] text-slate-700'
              }`}
            >
              English
            </button>
            <button
              onClick={() => updateSettings({ language: 'ar' })}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold border cursor-pointer ${
                settings.language === 'ar'
                  ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)] border-[hsl(75,92%,56%)]'
                  : isDark
                  ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300'
                  : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,85%)] text-slate-700'
              }`}
            >
              العربية (RTL)
            </button>
          </div>
        </div>

        {/* Default Weight Unit Card */}
        <div
          className={`p-5 rounded-2xl border space-y-3 ${
            isDark
              ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
              : 'bg-white border-[hsl(40,10%,88%)] shadow-2xs'
          }`}
        >
          <div
            className={`flex items-center gap-2 ${
              isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
            } text-xs font-bold uppercase`}
          >
            <Scale className="w-4 h-4" />
            <span>
              {lang === 'ar' ? 'وحدة الوزن الافتراضية' : 'Preferred Weight Unit'}
            </span>
          </div>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            {lang === 'ar'
              ? 'تنطبق على التمارين الجديدة فقط ولا تغير وحدات التمارين السابقة أبداً.'
              : 'Applies only to new entries. Never overrides historical workout units.'}
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => updateSettings({ preferredWeightUnit: 'kg' })}
              className={`py-2.5 px-3 rounded-xl font-mono-num text-xs font-bold border cursor-pointer ${
                settings.preferredWeightUnit === 'kg'
                  ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)] border-[hsl(75,92%,56%)]'
                  : isDark
                  ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300'
                  : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,85%)] text-slate-700'
              }`}
            >
              Kilograms (kg)
            </button>
            <button
              onClick={() => updateSettings({ preferredWeightUnit: 'lbs' })}
              className={`py-2.5 px-3 rounded-xl font-mono-num text-xs font-bold border cursor-pointer ${
                settings.preferredWeightUnit === 'lbs'
                  ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)] border-[hsl(75,92%,56%)]'
                  : isDark
                  ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300'
                  : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,85%)] text-slate-700'
              }`}
            >
              Pounds (lbs)
            </button>
          </div>
        </div>
      </div>

      {/* --- NEW SECTION: PERSONAL BODY WEIGHT TRACKER --- */}
      <div
        className={`p-5 rounded-2xl border space-y-4 ${
          isDark
            ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
            : 'bg-white border-[hsl(40,10%,88%)] shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div
              className={`flex items-center gap-2 text-xs font-bold uppercase ${
                isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>
                {lang === 'ar' ? 'تتبع وزن الجسم الشخصي' : 'Personal Body Weight'}
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
              {lang === 'ar'
                ? 'سجل وزنك الحالي لحفظه بشكل دائم ومتابعته (يتم تخزينه محلياً ولن يضيع عند إعادة تحميل الصفحة).'
                : 'Log and save your current body weight permanently on this device.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveBodyWeight} className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <div className="relative w-full sm:w-64">
            <input
              type="number"
              step="0.1"
              value={bodyWeight}
              onChange={(e) => setBodyWeight(e.target.value)}
              placeholder={lang === 'ar' ? 'أدخل وزنك (مثال: 75)' : 'Enter your weight (e.g. 75)'}
              className={`w-full py-2.5 px-4 rounded-xl border font-mono-num text-sm outline-none ${
                isDark
                  ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white focus:border-[hsl(75,92%,56%)]'
                  : 'bg-gray-50 border-gray-300 text-slate-900 focus:border-[hsl(76,78%,42%)]'
              }`}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={weightUnit}
              onChange={(e) => setWeightUnit(e.target.value as 'kg' | 'lbs')}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                isDark
                  ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white'
                  : 'bg-gray-50 border-gray-300 text-slate-900'
              }`}
            >
              <option value="kg">KG</option>
              <option value="lbs">LBS</option>
            </select>

            <button
              type="submit"
              className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-display font-bold text-xs cursor-pointer ${
                isDark
                  ? 'bg-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,62%)] text-[hsl(240,10%,9%)]'
                  : 'bg-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,37%)] text-white'
              }`}
            >
              {lang === 'ar' ? 'حفظ الوزن' : 'Save Weight'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. WEEKLY SCHEDULE EDITOR SHORTCUT */}
      <div
        className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDark
            ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
            : 'bg-white border-[hsl(40,10%,88%)] shadow-2xs'
        }`}
      >
        <div className="space-y-1">
          <div
            className={`flex items-center gap-2 text-xs font-bold uppercase ${
              isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>
              {lang === 'ar'
                ? 'تخصيص جدول التمارين الأسبوعي'
                : 'Weekly Workout Schedule Configuration'}
            </span>
          </div>
          <p
            className={`text-xs sm:text-sm ${
              isDark ? 'text-gray-300' : 'text-slate-600'
            }`}
          >
            {lang === 'ar'
              ? 'عدّل أيام التمرين، الفئات العضلية المخصصة لكل يوم، والتمارين المرتبطة بها.'
              : 'Edit workout days, assigned muscle groups, and planned exercises for Monday through Sunday.'}
          </p>
        </div>
        <button
          onClick={() => setCurrentSection('schedule')}
          className={`px-4 py-2.5 rounded-xl ${
            isDark
              ? 'bg-[hsl(75,92%,56%)]/15 hover:bg-[hsl(75,92%,56%)]/25 text-[hsl(75,92%,56%)] border-[hsl(75,92%,56%)]/30'
              : 'bg-[hsl(76,78%,42%)]/10 hover:bg-[hsl(76,78%,42%)]/15 text-[hsl(76,78%,42%)] border-[hsl(76,78%,42%)]/30'
          } border font-display font-bold text-xs shrink-0 cursor-pointer`}
        >
          {lang === 'ar' ? 'فتح محرر الجدول الأسبوعي' : 'Edit Weekly Schedule'}
        </button>
      </div>

      {/* 3. DATA MANAGEMENT: EXPORT BACKUP & IMPORT BACKUP */}
      <div
        className={`p-5 sm:p-6 rounded-2xl border space-y-6 ${
          isDark
            ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
            : 'bg-white border-[hsl(40,10%,88%)] shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-inherit">
          <div className="space-y-1">
            <div
              className={`flex items-center gap-2 ${
                isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
              } text-xs font-bold uppercase`}
            >
              <Database className="w-4 h-4" />
              <span>
                {lang === 'ar'
                  ? 'النسخ الاحتياطي واستعادة البيانات (Export & Import Backup)'
                  : 'Complete Local Backup & Restore'}
              </span>
            </div>
            <h2 className="text-lg font-display font-bold">
              {lang === 'ar'
                ? 'تصدير واستيراد جميع بيانات التطبيق'
                : 'Export Backup & Import Backup'}
            </h2>
          </div>
          {/* Current Local Database Stats Pill */}
          <div className="flex items-center gap-2 text-xs font-mono-num">
            <span
              className={`px-3 py-1 rounded-lg border ${
                isDark
                  ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300'
                  : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,88%)] text-slate-700'
              }`}
            >
              {workouts.length} {lang === 'ar' ? 'تمارين' : 'Workouts'} •{' '}
              {exercises.length} {lang === 'ar' ? 'في المكتبة' : 'Exercises'} •{' '}
              {weeklySchedule.length} {lang === 'ar' ? 'أيام' : 'Days'}
            </span>
          </div>
        </div>

        {/* Two Prominent Controls: Export Backup & Import Backup */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* EXPORT BACKUP CARD */}
          <div
            className={`p-5 rounded-xl border flex flex-col justify-between gap-4 ${
              isDark
                ? 'bg-[hsl(240,5%,11%)]/80 border-[hsl(240,4%,19%)]'
                : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,88%)]'
            }`}
          >
            <div className="space-y-2">
              <div
                className={`w-10 h-10 rounded-xl ${
                  isDark
                    ? 'bg-[hsl(75,92%,56%)]/15 border-[hsl(75,92%,56%)]/30 text-[hsl(75,92%,56%)]'
                    : 'bg-[hsl(76,78%,42%)]/10 border-[hsl(76,78%,42%)]/30 text-[hsl(76,78%,42%)]'
                } border flex items-center justify-center`}
              >
                <Download className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-base">
                {lang === 'ar' ? 'تصدير نسخة احتياطية (Export Backup)' : 'Export Backup'}
              </h3>
              <p
                className={`text-xs leading-relaxed ${
                  isDark ? 'text-gray-400' : 'text-slate-600'
                }`}
              >
                {lang === 'ar'
                  ? 'يقوم بتنزيل ملف JSON يحتوي على جميع بياناتك: سجل التمارين الكامل، المجموعات، الأوزان والوحدات الأصلية، مكتبة التمارين، التمارين المخصصة، الجدول الأسبوعي، والإعدادات.'
                  : 'Downloads a portable JSON file containing ALL workout history, sets, original weight units, custom exercises, weekly schedule, and preferences.'}
              </p>
            </div>
            <button
              onClick={handleExportBackup}
              className={`w-full py-3 px-4 rounded-xl ${
                isDark
                  ? 'bg-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,62%)]'
                  : 'bg-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,37%)]'
              } text-[hsl(240,10%,9%)] font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer`}
            >
              <Download className="w-4 h-4" />
              <span>
                {lang === 'ar' ? 'تحميل ملف النسخة الاحتياطية (JSON)' : 'Export Backup (.json)'}
              </span>
            </button>
          </div>

          {/* IMPORT BACKUP CARD */}
          <div
            className={`p-5 rounded-xl border flex flex-col justify-between gap-4 ${
              isDark
                ? 'bg-[hsl(240,5%,11%)]/80 border-[hsl(240,4%,19%)]'
                : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,88%)]'
            }`}
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-base">
                {lang === 'ar' ? 'استيراد نسخة احتياطية (Import Backup)' : 'Import Backup'}
              </h3>
              <p
                className={`text-xs leading-relaxed ${
                  isDark ? 'text-gray-400' : 'text-slate-600'
                }`}
              >
                {lang === 'ar'
                  ? 'اختر ملف نسخة احتياطية (.json) لاستعادة بياناتك. يدعم وضعين: "استبدال الكل (Replace All)" أو "الدمج الآمن (Merge)" مع التحقق المسبق من سلامة الملف.'
                  : 'Select a previously exported JSON backup file. Validates structure and version first, then lets you choose between Replace All or Merge modes.'}
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`w-full py-3 px-4 rounded-xl font-display font-bold text-xs sm:text-sm border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isDark
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 border-cyan-500 shadow-lg shadow-cyan-500/15'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-600'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>
                  {lang === 'ar' ? 'اختيار ملف نسخة احتياطية للاستيراد' : 'Import Backup (.json)'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* VALIDATION ERROR ALERT */}
        {validationResult && !validationResult.valid && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 text-xs sm:text-sm">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-red-400">
                  {lang === 'ar'
                    ? `فشل التحقق من الملف (${selectedFileName})`
                    : `Invalid Backup File (${selectedFileName})`}
                </div>
                <p className="mt-1">{validationResult.error}</p>
                <p className="text-xs opacity-80 mt-1">
                  {lang === 'ar'
                    ? 'لم يتم إجراء أي تغيير على بياناتك الحالية.'
                    : 'Your existing local data has not been modified.'}
                </p>
              </div>
            </div>
            <button onClick={() => setValidationResult(null)} className="p-1 rounded-lg hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* IMPORT CONFIRMATION & MODE SELECTION PANEL */}
        {validationResult && validationResult.valid && validationResult.summary && (
          <div
            className={`p-5 rounded-2xl border-2 space-y-5 ${
              isDark
                ? 'bg-[hsl(240,6%,5.5%)] border-[hsl(75,92%,56%)]/50'
                : 'bg-[hsl(76,78%,42%)]/5 border-[hsl(76,78%,42%)]/40'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                    isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {lang === 'ar'
                      ? 'تم التحقق من صحة ملف النسخة الاحتياطية بنجاح'
                      : 'Backup File Validated Successfully'}
                  </span>
                </span>
                <h3 className="font-display font-bold text-base mt-1">{selectedFileName}</h3>
                <p className="text-xs text-gray-400 font-mono-num mt-0.5">
                  Schema v{validationResult.summary.backupVersion} • Exported:{' '}
                  {new Date(validationResult.summary.exportedAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setValidationResult(null)} className="p-1.5 rounded-lg hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Backup Contents Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div
                className={`p-3 rounded-xl border ${
                  isDark
                    ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)]'
                    : 'bg-white border-[hsl(40,10%,88%)]'
                }`}
              >
                <div
                  className={`font-mono-num text-lg font-bold ${
                    isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
                  }`}
                >
                  {validationResult.summary.totalWorkouts}
                </div>
                <div className="text-[11px] text-gray-400">
                  {lang === 'ar' ? 'إجمالي التمارين' : 'Workout Sessions'}
                </div>
              </div>
              <div
                className={`p-3 rounded-xl border ${
                  isDark
                    ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)]'
                    : 'bg-white border-[hsl(40,10%,88%)]'
                }`}
              >
                <div className="font-mono-num text-lg font-bold text-cyan-400">
                  {validationResult.summary.totalExercises}
                </div>
                <div className="text-[11px] text-gray-400">
                  {lang === 'ar' ? 'تمارين المكتبة' : 'Library Exercises'}
                </div>
              </div>
              <div
                className={`p-3 rounded-xl border ${
                  isDark
                    ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)]'
                    : 'bg-white border-[hsl(40,10%,88%)]'
                }`}
              >
                <div className="font-mono-num text-lg font-bold text-purple-400">
                  {validationResult.summary.customExercises}
                </div>
                <div className="text-[11px] text-gray-400">
                  {lang === 'ar' ? 'تمارين مخصصة' : 'Custom Exercises'}
                </div>
              </div>
              <div
                className={`p-3 rounded-xl border ${
                  isDark
                    ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)]'
                    : 'bg-white border-[hsl(40,10%,88%)]'
                }`}
              >
                <div className="font-mono-num text-lg font-bold">
                  {validationResult.summary.scheduleDays}
                </div>
                <div className="text-[11px] text-gray-400">
                  {lang === 'ar' ? 'أيام الجدول' : 'Schedule Days'}
                </div>
              </div>
            </div>

            {/* Choose Import Mode */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider">
                {lang === 'ar' ? 'اختر وضع الاستيراد:' : 'Select Import Mode:'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setImportMode('merge')}
                  className={`p-4 rounded-xl border text-start transition-all cursor-pointer ${
                    importMode === 'merge'
                      ? isDark
                        ? 'bg-[hsl(75,92%,56%)]/15 border-[hsl(75,92%,56%)] ring-1 ring-[hsl(75,92%,56%)]/40'
                        : 'bg-[hsl(76,78%,42%)]/10 border-[hsl(76,78%,42%)] ring-1 ring-[hsl(76,78%,42%)]/30'
                      : isDark
                      ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)]'
                      : 'bg-white border-[hsl(40,10%,88%)]'
                  }`}
                >
                  <div
                    className={`font-display font-bold text-sm ${
                      isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
                    }`}
                  >
                    {lang === 'ar' ? 'الخيار B: دمج البيانات (Merge)' : 'OPTION B: MERGE (Recommended)'}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    {lang === 'ar'
                      ? 'يحتفظ بجميع بياناتك الحالية ويضيف السجلات الجديدة من النسخة الاحتياطية باستخدام المعرّفات الفريدة دون تكرار.'
                      : 'Keeps existing local data and merges records from backup using unique IDs.'}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setImportMode('replace')}
                  className={`p-4 rounded-xl border text-start transition-all cursor-pointer ${
                    importMode === 'replace'
                      ? 'bg-amber-500/15 border-amber-500 ring-1 ring-amber-500/40'
                      : isDark
                      ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)]'
                      : 'bg-white border-[hsl(40,10%,88%)]'
                  }`}
                >
                  <div className="font-display font-bold text-sm text-amber-400">
                    {lang === 'ar' ? 'الخيار A: استبدال الكل (Replace All)' : 'OPTION A: REPLACE ALL'}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    {lang === 'ar'
                      ? 'يستبدل جميع البيانات المحلية الحالية بالكامل ببيانات ملف النسخة الاحتياطية المحدد.'
                      : 'Replaces all current local workouts, exercises, schedule, and preferences.'}
                  </p>
                </button>
              </div>
            </div>

            {importMode === 'replace' && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 space-y-2.5">
                <div className="flex items-start gap-2 text-xs text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>{lang === 'ar' ? 'تحذير هام:' : 'Warning:'}</strong>{' '}
                    {lang === 'ar'
                      ? 'اختيار "استبدال الكل" سيقوم بمسح البيانات المحلية الحالية على هذا المتصفح واستبدالها ببيانات الملف المختار.'
                      : 'Replace All will overwrite all existing local data in this browser.'}
                  </span>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceConfirmedChecked}
                    onChange={(e) => setReplaceConfirmedChecked(e.target.checked)}
                    className="rounded border-amber-400 text-amber-500 focus:ring-amber-500"
                  />
                  <span>
                    {lang === 'ar'
                      ? 'أؤكد رغبتي في استبدال جميع البيانات المحلية الحالية'
                      : 'I understand and confirm replacing all existing local data'}
                  </span>
                </label>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setValidationResult(null)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                  isDark
                    ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)] text-gray-300'
                    : 'bg-white border-[hsl(40,10%,85%)] text-slate-700'
                }`}
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isImporting}
                onClick={handleExecuteImport}
                className={`px-5 py-2.5 rounded-xl font-display font-bold text-xs cursor-pointer ${
                  importMode === 'replace'
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : isDark
                    ? 'bg-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,62%)] text-[hsl(240,10%,9%)]'
                    : 'bg-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,37%)] text-white'
                }`}
              >
                {isImporting
                  ? lang === 'ar'
                    ? 'جارٍ الاستيراد...'
                    : 'Importing...'
                  : importMode === 'replace'
                  ? lang === 'ar'
                    ? 'تأكيد استبدال جميع البيانات'
                    : 'Confirm & Replace All Data'
                  : lang === 'ar'
                  ? 'تأكيد دمج البيانات'
                  : 'Confirm & Merge Backup'}
              </button>
            </div>
          </div>
        )}

        {/* IMPORT SUCCESS SUMMARY BANNER */}
        {lastImportSummary && (
          <div
            className={`p-4 rounded-xl ${
              isDark
                ? 'bg-[hsl(75,92%,56%)]/10 border-[hsl(75,92%,56%)]/40 text-[hsl(75,92%,56%)]'
                : 'bg-[hsl(76,78%,42%)]/10 border-[hsl(76,78%,42%)]/35 text-[hsl(76,78%,42%)]'
            } border flex items-start justify-between gap-3`}
          >
            <div className="flex items-start gap-2.5 text-xs sm:text-sm">
              <CheckCircle2
                className={`w-5 h-5 ${isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'} shrink-0 mt-0.5`}
              />
              <div>
                <div className={`font-bold ${isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'}`}>
                  {lang === 'ar'
                    ? 'اكتمل استيراد النسخة الاحتياطية بنجاح!'
                    : 'Backup Import Completed Successfully!'}
                </div>
                <p className="mt-1 font-mono-num text-xs">
                  Mode: {lastImportSummary.mode.toUpperCase()} • Workouts added:{' '}
                  {lastImportSummary.workoutsAdded} • Workouts updated:{' '}
                  {lastImportSummary.workoutsUpdated} • Exercises added:{' '}
                  {lastImportSummary.exercisesAdded}
                </p>
              </div>
            </div>
            <button onClick={() => setLastImportSummary(null)} className="p-1 rounded-lg hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 4. DEVICE TRANSFER GUIDE & LOCAL STORAGE PRIVACY REMINDER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Device Transfer Workflow */}
        <div
          className={`p-5 rounded-2xl border space-y-3 ${
            isDark
              ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
              : 'bg-white border-[hsl(40,10%,88%)] shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase">
            <Smartphone className="w-4 h-4" />
            <span>
              {lang === 'ar' ? 'نقل البيانات إلى هاتف أو جهاز جديد' : 'How to Transfer Data to a New Phone'}
            </span>
          </div>
          <div className={`text-xs space-y-2 leading-relaxed ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
            <p>
              <strong className={isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'}>
                {lang === 'ar' ? 'على الهاتف القديم:' : '1. On Old Phone:'}
              </strong>{' '}
              {lang === 'ar'
                ? 'افتح الإعدادات ⟵ اضغط "تصدير نسخة احتياطية" لتنزيل ملف JSON، ثم أرسل الملف إلى هاتفك الجديد.'
                : 'Open Settings → Press Export Backup to download your JSON file, then send it to your new phone.'}
            </p>
            <p>
              <strong className="text-cyan-400">
                {lang === 'ar' ? 'على الهاتف الجديد:' : '2. On New Phone:'}
              </strong>{' '}
              {lang === 'ar'
                ? 'افتح نفس الموقع ⟵ الإعدادات ⟵ اضغط "استيراد نسخة احتياطية" ⟵ اختر ملف JSON ⟵ اختر استبدال الكل أو دمج ثم أكد.'
                : 'Open this website → Navigate to Settings → Press Import Backup → Select the JSON file → Choose Replace All or Merge and confirm.'}
            </p>
          </div>
        </div>

        {/* Local Storage Reminder */}
        <div
          className={`p-5 rounded-2xl border space-y-3 ${
            isDark
              ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
              : 'bg-white border-[hsl(40,10%,88%)] shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase">
            <ShieldAlert className="w-4 h-4" />
            <span>
              {lang === 'ar' ? 'تنبيه هام حول التخزين المحلي (IndexedDB)' : 'Important Local Browser Storage Notice'}
            </span>
          </div>
          <div className={`text-xs space-y-2 leading-relaxed ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
            <p className="flex items-start gap-2">
              <HardDrive
                className={`w-4 h-4 ${
                  isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
                } shrink-0 mt-0.5`}
              />
              <span>
                {lang === 'ar'
                  ? 'يتم تخزين جميع تمارينك محلياً على جهازك داخل المتصفح (IndexedDB) بدون أي خوادم سحابية أو حسابات.'
                  : 'All workout data is stored privately on your device inside IndexedDB without cloud servers or accounts.'}
              </span>
            </p>
            <p className="flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                {lang === 'ar'
                  ? 'فتح الموقع على هاتف جديد لن ينقل البيانات تلقائياً، كما أن مسح بيانات المتصفح (Clear Site Data) قد يؤدي لحذف السجل المحلي. احتفظ دائماً بنسخة احتياطية عبر زر التصدير.'
                  : 'Local browser data does not automatically sync across devices, and clearing browser data may erase local records.'}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
