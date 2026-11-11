
import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  Globe,
  Moon,
  Sun,
  Upload,
  X,
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
  const [replaceConfirmedChecked, setReplaceConfirmedChecked] =
    useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastImportSummary, setLastImportSummary] =
    useState<ImportSummary | null>(null);

  // ============================================
  // EXPORT BACKUP
  // ============================================

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

  // ============================================
  // SELECT & VALIDATE BACKUP FILE
  // ============================================

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setSelectedFileName(file.name);
    setLastImportSummary(null);
    setReplaceConfirmedChecked(false);
    setImportMode('merge');

    try {
      const rawText = await file.text();
      const result = validateBackupJson(rawText);

      setValidationResult(result);

      if (!result.valid) {
        showToast(
          result.error || 'Invalid backup file.',
          'error'
        );
      }
    } catch {
      setValidationResult({
        valid: false,
        error:
          'Could not read the selected file. Please ensure it is a valid .json file.',
      });
    }

    // Allow selecting the same file again.
    e.target.value = '';
  };

  // ============================================
  // EXECUTE IMPORT
  // ============================================

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
      const summary = await executeImportBackup(
        validationResult.data,
        importMode
      );

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

  // ============================================
  // SHARED CARD STYLES
  // ============================================

  const cardClass = `p-5 rounded-2xl border ${
    isDark
      ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
      : 'bg-white border-[hsl(40,10%,88%)] shadow-2xs'
  }`;

  const mutedText = isDark ? 'text-gray-400' : 'text-slate-500';

  const accentText = isDark
    ? 'text-[hsl(75,92%,56%)]'
    : 'text-[hsl(76,78%,42%)]';

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ============================================
          HEADER
      ============================================ */}

      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
          {lang === 'ar'
            ? 'الإعدادات وإدارة البيانات'
            : 'Settings & Data Management'}
        </h1>

        <p
          className={`text-sm mt-1 ${
            isDark ? 'text-gray-400' : 'text-slate-600'
          }`}
        >
          {lang === 'ar'
            ? 'تحكم في مظهر التطبيق ولغته، وقم بإدارة النسخ الاحتياطية لبياناتك.'
            : 'Manage application appearance, language, and your complete data backups.'}
        </p>
      </div>

      {/* ============================================
          1. APPEARANCE & LANGUAGE
      ============================================ */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* APPEARANCE CARD */}

        <div className={`${cardClass} space-y-3`}>

          <div className={`flex items-center gap-2 ${accentText} text-xs font-bold uppercase`}>
            {isDark ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}

            <span>
              {lang === 'ar' ? 'المظهر (Theme)' : 'Appearance'}
            </span>
          </div>

          <p className={`text-xs ${mutedText}`}>
            {lang === 'ar'
              ? 'اختر الوضع الداكن أو الفاتح حسب تفضيلك.'
              : 'Choose between dark and light appearance.'}
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">

            {/* DARK MODE */}

            <button
              type="button"
              onClick={() => updateSettings({ theme: 'dark' })}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                settings.theme === 'dark'
                  ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)] border-[hsl(75,92%,56%)]'
                  : isDark
                    ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300'
                    : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,85%)] text-slate-700'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />

              <span>
                {lang === 'ar' ? 'داكن' : 'Dark Mode'}
              </span>
            </button>

            {/* LIGHT MODE */}

            <button
              type="button"
              onClick={() => updateSettings({ theme: 'light' })}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                settings.theme === 'light'
                  ? 'bg-[hsl(76,78%,42%)] text-white border-[hsl(76,78%,42%)]'
                  : isDark
                    ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300'
                    : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,85%)] text-slate-700'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />

              <span>
                {lang === 'ar' ? 'فاتح' : 'Light Mode'}
              </span>
            </button>

          </div>
        </div>

        {/* LANGUAGE CARD */}

        <div className={`${cardClass} space-y-3`}>

          <div className={`flex items-center gap-2 ${accentText} text-xs font-bold uppercase`}>
            <Globe className="w-4 h-4" />

            <span>
              {lang === 'ar' ? 'اللغة (Language)' : 'Language'}
            </span>
          </div>

          <p className={`text-xs ${mutedText}`}>
            {lang === 'ar'
              ? 'اختر لغة التطبيق المفضلة لديك.'
              : 'Choose your preferred application language.'}
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">

            {/* ENGLISH */}

            <button
              type="button"
              onClick={() => updateSettings({ language: 'en' })}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                settings.language === 'en'
                  ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)] border-[hsl(75,92%,56%)]'
                  : isDark
                    ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300'
                    : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,85%)] text-slate-700'
              }`}
            >
              English
            </button>

            {/* ARABIC */}

            <button
              type="button"
              onClick={() => updateSettings({ language: 'ar' })}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
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

      </div>

      {/* ============================================
          2. BACKUP & DATA MANAGEMENT
      ============================================ */}

      <div className={`${cardClass} p-5 sm:p-6 space-y-6`}>

        {/* BACKUP HEADER */}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-inherit">

          <div className="space-y-1">

            <div className={`flex items-center gap-2 ${accentText} text-xs font-bold uppercase`}>
              <Database className="w-4 h-4" />

              <span>
                {lang === 'ar'
                  ? 'النسخ الاحتياطي واستعادة البيانات'
                  : 'Backup & Data Management'}
              </span>
            </div>

            <h2 className="text-lg font-display font-bold">
              {lang === 'ar'
                ? 'تصدير واستيراد جميع بيانات التطبيق'
                : 'Export & Import Backup'}
            </h2>

          </div>

          {/* DATABASE STATISTICS */}

          <div className="flex items-center gap-2 text-xs font-mono-num">

            <span
              className={`px-3 py-1 rounded-lg border ${
                isDark
                  ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300'
                  : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,88%)] text-slate-700'
              }`}
            >
              {workouts.length}{' '}
              {lang === 'ar' ? 'تمارين' : 'Workouts'} •{' '}

              {exercises.length}{' '}
              {lang === 'ar' ? 'في المكتبة' : 'Exercises'} •{' '}

              {weeklySchedule.length}{' '}
              {lang === 'ar' ? 'أيام' : 'Days'}
            </span>

          </div>

        </div>

        {/* EXPORT & IMPORT CARDS */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* EXPORT BACKUP */}

          <div
            className={`p-5 rounded-xl border flex flex-col justify-between gap-4 ${
              isDark
                ? 'bg-[hsl(240,5%,11%)]/80 border-[hsl(240,4%,19%)]'
                : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,88%)]'
            }`}
          >

            <div className="space-y-2">

              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                  isDark
                    ? 'bg-[hsl(75,92%,56%)]/15 border-[hsl(75,92%,56%)]/30 text-[hsl(75,92%,56%)]'
                    : 'bg-[hsl(76,78%,42%)]/10 border-[hsl(76,78%,42%)]/30 text-[hsl(76,78%,42%)]'
                }`}
              >
                <Download className="w-5 h-5" />
              </div>

              <h3 className="font-display font-bold text-base">
                {lang === 'ar' ? 'تصدير نسخة احتياطية' : 'Export Backup'}
              </h3>

              <p className={`text-xs leading-relaxed ${mutedText}`}>
                {lang === 'ar'
                  ? 'قم بتنزيل ملف JSON يحتوي على جميع بياناتك: سجل التمارين الكامل، المجموعات، الأوزان والوحدات الأصلية، مكتبة التمارين، التمارين المخصصة، الجدول الأسبوعي، والإعدادات.'
                  : 'Downloads a portable JSON file (GymTracker_Backup_YYYY-MM-DD.json) containing all workout history, sets, original weight units, custom exercises, weekly schedule, and preferences.'}
              </p>

            </div>

            <button
              type="button"
              onClick={handleExportBackup}
              className={`w-full py-3 px-4 rounded-xl ${
                isDark
                  ? 'bg-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,62%)]'
                  : 'bg-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,37%)]'
              } text-[hsl(240,10%,9%)] font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer`}
            >
              <Download className="w-4 h-4" />

              <span>
                {lang === 'ar'
                  ? 'تحميل ملف النسخة الاحتياطية (JSON)'
                  : 'Export Backup (.json)'}
              </span>
            </button>

          </div>

          {/* IMPORT BACKUP */}

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
                {lang === 'ar' ? 'استيراد نسخة احتياطية' : 'Import Backup'}
              </h3>

              <p className={`text-xs leading-relaxed ${mutedText}`}>
                {lang === 'ar'
                  ? 'اختر ملف نسخة احتياطية بصيغة JSON لاستعادة بياناتك. يدعم الاستيراد وضع الدمج الآمن أو استبدال جميع البيانات بعد التحقق من صحة الملف.'
                  : 'Select a previously exported JSON backup file. Validates its structure and version before allowing Merge or Replace All.'}
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
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full py-3 px-4 rounded-xl font-display font-bold text-xs sm:text-sm border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isDark
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 border-cyan-500 shadow-lg shadow-cyan-500/15'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-600'
                }`}
              >
                <Upload className="w-4 h-4" />

                <span>
                  {lang === 'ar'
                    ? 'اختيار ملف نسخة احتياطية للاستيراد'
                    : 'Import Backup (.json)'}
                </span>
              </button>

            </div>

          </div>

        </div>

        {/* ============================================
            VALIDATION ERROR
        ============================================ */}

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

                <p className="mt-1">
                  {validationResult.error}
                </p>

                <p className="text-xs opacity-80 mt-1">
                  {lang === 'ar'
                    ? 'لم يتم إجراء أي تغيير على بياناتك الحالية.'
                    : 'Your existing local data has not been modified.'}
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() => setValidationResult(null)}
              className="p-1 rounded-lg hover:bg-white/10"
              aria-label="Dismiss validation error"
            >
              <X className="w-4 h-4" />
            </button>

          </div>
        )}

        {/* ============================================
            IMPORT VALIDATION & CONFIRMATION
        ============================================ */}

        {validationResult &&
          validationResult.valid &&
          validationResult.summary && (

          <div
            className={`p-5 rounded-2xl border-2 space-y-5 ${
              isDark
                ? 'bg-[hsl(240,6%,5.5%)] border-[hsl(75,92%,56%)]/50'
                : 'bg-[hsl(76,78%,42%)]/5 border-[hsl(76,78%,42%)]/40'
            }`}
          >

            {/* VALIDATION HEADER */}

            <div className="flex items-start justify-between gap-3">

              <div>

                <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${accentText}`}>
                  <CheckCircle2 className="w-4 h-4" />

                  <span>
                    {lang === 'ar'
                      ? 'تم التحقق من صحة ملف النسخة الاحتياطية بنجاح'
                      : 'Backup File Validated Successfully'}
                  </span>
                </span>

                <h3 className="font-display font-bold text-base mt-1">
                  {selectedFileName}
                </h3>

                <p className="text-xs text-gray-400 font-mono-num mt-0.5">
                  Schema v{validationResult.summary.backupVersion} • Exported:{' '}
                  {new Date(
                    validationResult.summary.exportedAt
                  ).toLocaleString()}
                </p>

              </div>

              <button
                type="button"
                onClick={() => setValidationResult(null)}
                className="p-1.5 rounded-lg hover:bg-white/10"
                aria-label="Close import confirmation"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            {/* BACKUP CONTENT SUMMARY */}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">

              <div className={`p-3 rounded-xl border ${
                isDark
                  ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)]'
                  : 'bg-white border-[hsl(40,10%,88%)]'
              }`}>
                <div className={`font-mono-num text-lg font-bold ${accentText}`}>
                  {validationResult.summary.totalWorkouts}
                </div>

                <div className="text-[11px] text-gray-400">
                  {lang === 'ar' ? 'إجمالي التمارين' : 'Workout Sessions'}
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${
                isDark
                  ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)]'
                  : 'bg-white border-[hsl(40,10%,88%)]'
              }`}>
                <div className="font-mono-num text-lg font-bold text-cyan-400">
                  {validationResult.summary.totalExercises}
                </div>

                <div className="text-[11px] text-gray-400">
                  {lang === 'ar' ? 'تمارين المكتبة' : 'Library Exercises'}
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${
                isDark
                  ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)]'
                  : 'bg-white border-[hsl(40,10%,88%)]'
              }`}>
                <div className="font-mono-num text-lg font-bold text-purple-400">
                  {validationResult.summary.customExercises}
                </div>

                <div className="text-[11px] text-gray-400">
                  {lang === 'ar' ? 'تمارين مخصصة' : 'Custom Exercises'}
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${
                isDark
                  ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)]'
                  : 'bg-white border-[hsl(40,10%,88%)]'
              }`}>
                <div className="font-mono-num text-lg font-bold">
                  {validationResult.summary.scheduleDays}
                </div>

                <div className="text-[11px] text-gray-400">
                  {lang === 'ar' ? 'أيام الجدول' : 'Schedule Days'}
                </div>
              </div>

            </div>

            {/* IMPORT MODE SELECTION */}

            <div className="space-y-3">

              <label className="block text-xs font-bold uppercase tracking-wider">
                {lang === 'ar'
                  ? 'اختر وضع الاستيراد:'
                  : 'Select Import Mode:'}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {/* MERGE */}

                <button
                  type="button"
                  onClick={() => {
                    setImportMode('merge');
                    setReplaceConfirmedChecked(false);
                  }}
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

                  <div className={`font-display font-bold text-sm ${accentText}`}>
                    {lang === 'ar'
                      ? 'الخيار B: دمج البيانات (Merge)'
                      : 'OPTION B: MERGE (Recommended)'}
                  </div>

                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    {lang === 'ar'
                      ? 'يحتفظ بجميع بياناتك الحالية ويضيف السجلات الجديدة من النسخة الاحتياطية باستخدام المعرّفات الفريدة دون تكرار السجلات.'
                      : 'Keeps existing local data and merges records from backup using unique IDs. Avoids duplicate sessions and exercises.'}
                  </p>

                </button>

                {/* REPLACE ALL */}

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
                    {lang === 'ar'
                      ? 'الخيار A: استبدال الكل (Replace All)'
                      : 'OPTION A: REPLACE ALL'}
                  </div>

                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    {lang === 'ar'
                      ? 'يستبدل جميع البيانات المحلية الحالية بالكامل ببيانات ملف النسخة الاحتياطية المحدد.'
                      : 'Replaces all current local workouts, exercises, schedule, and preferences with the selected backup file.'}
                  </p>

                </button>

              </div>

            </div>

            {/* REPLACE ALL WARNING */}

            {importMode === 'replace' && (

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 space-y-2.5">

                <div className="flex items-start gap-2 text-xs text-amber-300">

                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />

                  <span>
                    <strong>
                      {lang === 'ar' ? 'تحذير هام:' : 'Warning:'}
                    </strong>{' '}

                    {lang === 'ar'
                      ? 'اختيار استبدال الكل سيقوم بمسح البيانات المحلية الحالية على هذا المتصفح واستبدالها ببيانات الملف المختار.'
                      : 'Replace All will overwrite all existing local data in this browser with the contents of the backup file.'}
                  </span>

                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-amber-200 cursor-pointer">

                  <input
                    type="checkbox"
                    checked={replaceConfirmedChecked}
                    onChange={(e) =>
                      setReplaceConfirmedChecked(e.target.checked)
                    }
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

            {/* IMPORT ACTIONS */}

            <div className="flex items-center justify-end gap-3 pt-2">

              <button
                type="button"
                onClick={() => {
                  setValidationResult(null);
                  setReplaceConfirmedChecked(false);
                }}
                disabled={isImporting}
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
                disabled={
                  isImporting ||
                  (importMode === 'replace' && !replaceConfirmedChecked)
                }
                onClick={handleExecuteImport}
                className={`px-5 py-2.5 rounded-xl font-display font-bold text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
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

        {/* ============================================
            IMPORT SUCCESS SUMMARY
        ============================================ */}

        {lastImportSummary && (

          <div
            className={`p-4 rounded-xl ${
              isDark
                ? 'bg-[hsl(75,92%,56%)]/10 border-[hsl(75,92%,56%)]/40 text-[hsl(75,92%,56%)]'
                : 'bg-[hsl(76,78%,42%)]/10 border-[hsl(76,78%,42%)]/35 text-[hsl(76,78%,42%)]'
            } border flex items-start justify-between gap-3`}
          >

            <div className="flex items-start gap-2.5 text-xs sm:text-sm">

              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />

              <div>

                <div className="font-bold">
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

            <button
              type="button"
              onClick={() => setLastImportSummary(null)}
              className="p-1 rounded-lg hover:bg-white/10"
              aria-label="Dismiss import summary"
            >
              <X className="w-4 h-4" />
            </button>

          </div>

        )}

      </div>

    </div>
  );
};
