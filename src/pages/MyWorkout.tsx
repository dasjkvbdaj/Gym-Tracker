import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  Dumbbell,
  Edit3,
  Moon,
  Save,
  X,
  Copy,
  Layers,
  Sparkles,
} from 'lucide-react';

import { useGym } from '../context/GymContext';
import {
  DayName,
  MuscleGroup,
  WeeklyScheduleDay,
} from '../types/workout';

import {
  MUSCLE_GROUPS,
  translateDayName,
  translateMuscleGroup,
} from '../utils/i18n';

// تعريف قوالب الجداول التدريبية (Workout Splits)
type SplitPresetKey = 'custom' | 'ppl_cardio' | 'ppl_classic' | 'upper_lower' | 'bro_split';

interface SplitPreset {
  id: SplitPresetKey;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  schedule: Partial<Record<DayName, MuscleGroup[]>>;
}

const SPLIT_PRESETS: SplitPreset[] = [
  {
    id: 'ppl_cardio',
    labelEn: 'Pull / Push / Cardio / Legs (Your Split)',
    labelAr: 'سحب / دفع / كارديو / أرجل (جدولك الحالي)',
    descriptionEn: 'Mon: Pull • Tue: Push • Wed: Cardio • Thu: Legs • Fri: Pull • Sat: Push • Sun: Rest',
    descriptionAr: 'الاثنين: سحب • الثلاثاء: دفع • الأربعاء: كارديو • الخميس: أرجل • الجمعة: سحب • السبت: دفع',
    schedule: {
      Monday: ['Back', 'Shoulders', 'Traps', 'Biceps'],
      Tuesday: ['Chest', 'Shoulders', 'Triceps', 'Forearms'],
      Wednesday: ['Cardio'],
      Thursday: ['Legs'],
      Friday: ['Back', 'Shoulders', 'Traps', 'Biceps'],
      Saturday: ['Chest', 'Shoulders', 'Triceps', 'Forearms'],
      Sunday: [],
    },
  },
  {
    id: 'ppl_classic',
    labelEn: 'Push / Pull / Legs (6 Days PPL)',
    labelAr: 'بوش بول ليجز كلاسيك (6 أيام)',
    descriptionEn: 'High frequency PPL twice a week with Sunday rest',
    descriptionAr: 'تمرين كل عضلة مرتين بالأسبوع مع راحة يوم الأحد',
    schedule: {
      Monday: ['Chest', 'Shoulders', 'Triceps', 'Forearms'],
      Tuesday: ['Back', 'Shoulders', 'Traps', 'Biceps'],
      Wednesday: ['Legs'],
      Thursday: ['Chest', 'Shoulders', 'Triceps', 'Forearms'],
      Friday: ['Back', 'Shoulders', 'Traps', 'Biceps'],
      Saturday: ['Legs'],
      Sunday: [],
    },
  },
  {
    id: 'upper_lower',
    labelEn: 'Upper / Lower Split (4 Days)',
    labelAr: 'علوي / سفلي (Upper / Lower)',
    descriptionEn: 'Mon/Thu: Upper Body • Tue/Fri: Lower Body • Wed/Weekend: Rest/Cardio',
    descriptionAr: 'الاثنين والخميس: علوي • الثلاثاء والجمعة: سفلي',
    schedule: {
      Monday: ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'],
      Tuesday: ['Legs'],
      Wednesday: ['Cardio'],
      Thursday: ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'],
      Friday: ['Legs'],
      Saturday: [],
      Sunday: [],
    },
  },
  {
    id: 'bro_split',
    labelEn: 'Bro Split (5 Days Body Part)',
    labelAr: 'برو سبليت (Bro Split - عضلة كل يوم)',
    descriptionEn: 'Dedicated day for each major muscle group',
    descriptionAr: 'تخصيص يوم كامل لكل عضلة رئيسية في الأسبوع',
    schedule: {
      Monday: ['Chest'],
      Tuesday: ['Back', 'Traps'],
      Wednesday: ['Shoulders'],
      Thursday: ['Legs'],
      Friday: ['Biceps', 'Triceps', 'Forearms'],
      Saturday: ['Cardio'],
      Sunday: [],
    },
  },
];

export const MyWorkout: React.FC = () => {
  const {
    weeklySchedule,
    settings,
    updateScheduleDay,
  } = useGym();

  const lang = settings.language;
  const isDark = settings.theme === 'dark';
  const isArabic = lang === 'ar';

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [draftSchedule, setDraftSchedule] = useState<WeeklyScheduleDay[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<SplitPresetKey>('custom');
  const [isSaving, setIsSaving] = useState(false);
  const [scheduleCopied, setScheduleCopied] = useState(false);

  const trainingDays = useMemo(() => {
    return weeklySchedule.filter(
      (day) =>
        day.workoutType !== 'rest' &&
        day.muscleGroups.length > 0
    );
  }, [weeklySchedule]);

  // تحديد اسم الـ Split الحالي تلقائياً للعرض في الواجهة
  const detectedSplitName = useMemo(() => {
    for (const preset of SPLIT_PRESETS) {
      const isMatch = weeklySchedule.every((dayItem) => {
        const presetGroups = preset.schedule[dayItem.day] || [];
        if (presetGroups.length !== dayItem.muscleGroups.length) return false;
        return presetGroups.every((mg) => dayItem.muscleGroups.includes(mg));
      });
      if (isMatch) {
        return isArabic ? preset.labelAr : preset.labelEn;
      }
    }
    return isArabic ? 'جدول مخصص (Custom Split)' : 'Custom Split';
  }, [weeklySchedule, isArabic]);

  const generateDayTitle = (groups: MuscleGroup[]) => {
    if (groups.length === 0) {
      return isArabic ? 'يوم راحة' : 'Rest Day';
    }

    return groups
      .map((group) => translateMuscleGroup(group, lang))
      .join(' + ');
  };

  // تطبيق القالب المختار على الجدول المؤقت (Draft)
  const handleApplyPreset = (presetKey: SplitPresetKey) => {
    setSelectedPreset(presetKey);
    if (presetKey === 'custom') return;

    const preset = SPLIT_PRESETS.find((p) => p.id === presetKey);
    if (!preset) return;

    setDraftSchedule((previous) =>
      previous.map((dayItem) => {
        const groups = preset.schedule[dayItem.day] ?? [];
        const validGroups = groups.filter((mg) => MUSCLE_GROUPS.includes(mg));
        return {
          ...dayItem,
          muscleGroups: validGroups,
          workoutType: validGroups.length === 0 ? 'rest' : 'strength',
          title: generateDayTitle(validGroups),
        };
      })
    );
  };

  // Copy weekly schedule
  const handleCopySchedule = () => {
    const scheduleText = weeklySchedule
      .map((day) => {
        const dayName = translateDayName(day.day, lang);
        const details =
          day.workoutType === 'rest' || day.muscleGroups.length === 0
            ? isArabic ? 'يوم راحة' : 'Rest Day'
            : day.muscleGroups.map((mg) => translateMuscleGroup(mg, lang)).join(' + ');

        return `${dayName}: ${details}`;
      })
      .join('\n');

    navigator.clipboard.writeText(scheduleText).then(() => {
      setScheduleCopied(true);
      setTimeout(() => setScheduleCopied(false), 2000);
    });
  };

  const openEditSchedule = () => {
    setDraftSchedule(
      weeklySchedule.map((day) => ({
        ...day,
        muscleGroups: [...day.muscleGroups],
        assignedExerciseIds: [...day.assignedExerciseIds],
      }))
    );
    setSelectedPreset('custom');
    setIsEditModalOpen(true);
  };

  const toggleMuscleGroup = (
    day: DayName,
    muscleGroup: MuscleGroup
  ) => {
    setSelectedPreset('custom');
    setDraftSchedule((previous) =>
      previous.map((item) => {
        if (item.day !== day) return item;

        const exists = item.muscleGroups.includes(muscleGroup);
        const updatedGroups = exists
          ? item.muscleGroups.filter((group) => group !== muscleGroup)
          : [...item.muscleGroups, muscleGroup];

        return {
          ...item,
          muscleGroups: updatedGroups,
          workoutType: updatedGroups.length === 0 ? 'rest' : 'strength',
          title: generateDayTitle(updatedGroups),
        };
      })
    );
  };

  const toggleRestDay = (day: DayName) => {
    setSelectedPreset('custom');
    setDraftSchedule((previous) =>
      previous.map((item) => {
        if (item.day !== day) return item;

        if (item.workoutType === 'rest') {
          return {
            ...item,
            workoutType: 'strength',
            muscleGroups: item.muscleGroups.length > 0 ? item.muscleGroups : ['Back'],
            title: generateDayTitle(
              item.muscleGroups.length > 0 ? item.muscleGroups : ['Back']
            ),
          };
        }

        return {
          ...item,
          workoutType: 'rest',
          muscleGroups: [],
          title: generateDayTitle([]),
        };
      })
    );
  };

  const handleSaveSchedule = async () => {
    setIsSaving(true);
    try {
      for (const day of draftSchedule) {
        const updatedDay: WeeklyScheduleDay = {
          ...day,
          title: generateDayTitle(day.muscleGroups),
          workoutType: day.muscleGroups.length === 0 ? 'rest' : 'strength',
          muscleGroups: [...day.muscleGroups],
        };
        await updateScheduleDay(updatedDay);
      }
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to update weekly schedule:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraftSchedule([]);
    setIsEditModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays
              className={`w-5 h-5 ${
                isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
              }`}
            />
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                isDark ? 'text-gray-400' : 'text-slate-500'
              }`}
            >
              {isArabic ? 'برنامجك الأسبوعي' : 'Training Split'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
            {isArabic ? 'جدول التمارين الأسبوعي' : 'My Workout Schedule'}
          </h1>
          <p
            className={`text-sm mt-1 ${
              isDark ? 'text-gray-400' : 'text-slate-600'
            }`}
          >
            {isArabic
              ? 'نظّم أيام تمرينك والعضلات التي تستهدفها خلال الأسبوع.'
              : 'Your weekly training days and targeted muscle groups.'}
          </p>
        </div>

        {/* HEADER ACTIONS */}
        <div className="flex items-center justify-between w-full sm:w-auto sm:min-w-[320px] gap-2">
          <button
            onClick={openEditSchedule}
            className={`px-5 py-3 rounded-xl font-display font-bold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
              isDark
                ? 'bg-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,50%)] text-[hsl(240,10%,9%)] shadow-[hsl(75,92%,56%)]/15'
                : 'bg-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,37%)] text-white shadow-[hsl(76,78%,42%)]/15'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            {isArabic ? 'تعديل الجدول' : 'Edit Schedule'}
          </button>

          <button
            onClick={handleCopySchedule}
            className={`px-4 py-3 rounded-xl font-display font-bold text-sm flex items-center gap-2 border transition-all cursor-pointer ${
              isDark
                ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-200 hover:bg-[hsl(240,5%,15%)]'
                : 'bg-white border-[hsl(40,10%,88%)] text-slate-700 hover:bg-gray-50'
            }`}
          >
            {scheduleCopied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>
              {scheduleCopied
                ? isArabic ? 'تم النسخ!' : 'Copied!'
                : isArabic ? 'نسخ الجدول' : 'Copy Schedule'}
            </span>
          </button>
        </div>
      </div>

      {/* WEEKLY SCHEDULE SUMMARY + ACTIVE SPLIT BADGE */}
      <div
        className={`rounded-2xl border p-4 sm:p-5 ${
          isDark
            ? 'bg-[hsl(75,92%,56%)]/5 border-[hsl(75,92%,56%)]/20'
            : 'bg-[hsl(76,78%,42%)]/5 border-[hsl(76,78%,42%)]/20'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                isDark ? 'bg-[hsl(75,92%,56%)]/15' : 'bg-[hsl(76,78%,42%)]/10'
              }`}
            >
              <Dumbbell
                className={`w-6 h-6 ${
                  isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
                }`}
              />
            </div>
            <div>
              <p
                className={`text-xs font-medium ${
                  isDark ? 'text-gray-400' : 'text-slate-500'
                }`}
              >
                {isArabic ? 'أيام التمرين' : 'Training Days'}
              </p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span
                  className={`text-3xl font-display font-bold ${
                    isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
                  }`}
                >
                  {trainingDays.length}
                </span>
                <span
                  className={`text-sm ${
                    isDark ? 'text-gray-400' : 'text-slate-500'
                  }`}
                >
                  / 7 {isArabic ? 'أيام' : 'Days'}
                </span>
              </div>
            </div>
          </div>

          {/* ACTIVE SPLIT INDICATOR */}
          <div
            className={`px-3.5 py-2.5 rounded-xl border flex items-center gap-2.5 ${
              isDark
                ? 'bg-[hsl(240,5%,10%)] border-[hsl(240,4%,19%)]'
                : 'bg-white border-[hsl(40,10%,88%)]'
            }`}
          >
            <Layers
              className={`w-4 h-4 shrink-0 ${
                isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
              }`}
            />
            <div>
              <span
                className={`block text-[10px] uppercase tracking-wider font-semibold ${
                  isDark ? 'text-gray-500' : 'text-slate-400'
                }`}
              >
                {isArabic ? 'النظام النشط' : 'Active Split'}
              </span>
              <span className="text-xs font-bold">
                {detectedSplitName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TRAINING DAYS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-base">
            {isArabic ? 'برنامج الأسبوع' : 'Weekly Training Split'}
          </h2>
          <span
            className={`text-xs ${
              isDark ? 'text-gray-500' : 'text-slate-400'
            }`}
          >
            {trainingDays.length} {isArabic ? 'أيام تمرين' : 'Training Days'}
          </span>
        </div>

        {trainingDays.length === 0 ? (
          <div
            className={`rounded-2xl border border-dashed p-10 text-center ${
              isDark
                ? 'border-[hsl(240,4%,19%)] bg-[hsl(240,5%,7.5%)]'
                : 'border-[hsl(40,10%,85%)] bg-white'
            }`}
          >
            <Dumbbell
              className={`w-8 h-8 mx-auto mb-3 ${
                isDark ? 'text-gray-500' : 'text-slate-400'
              }`}
            />
            <p className="text-sm font-semibold">
              {isArabic ? 'لم يتم إعداد جدول التمارين بعد.' : 'No training schedule configured yet.'}
            </p>
            <p
              className={`text-xs mt-1 ${
                isDark ? 'text-gray-500' : 'text-slate-400'
              }`}
            >
              {isArabic ? 'اضغط على تعديل الجدول لإنشاء برنامجك الأسبوعي.' : 'Click Edit Schedule to create your weekly training split.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {trainingDays.map((dayItem, index) => (
              <div
                key={dayItem.day}
                className={`relative overflow-hidden rounded-2xl border p-4 transition-colors ${
                  isDark
                    ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)] hover:border-[hsl(75,92%,56%)]/40'
                    : 'bg-white border-[hsl(40,10%,88%)] hover:border-[hsl(76,78%,42%)]/40 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isDark
                          ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)]'
                          : 'bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)]'
                      }`}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={`text-sm font-bold uppercase tracking-wide ${
                        isDark ? 'text-gray-300' : 'text-slate-600'
                      }`}
                    >
                      {translateDayName(dayItem.day, lang)}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-1 rounded-md ${
                      isDark
                        ? 'bg-[hsl(75,92%,56%)]/10 text-[hsl(75,92%,56%)]'
                        : 'bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)]'
                    }`}
                  >
                    {isArabic ? 'تمرين' : 'TRAINING'}
                  </span>
                </div>

                <div
                  className={`mt-4 pt-3 border-t ${
                    isDark ? 'border-[hsl(240,4%,16%)]' : 'border-[hsl(40,10%,92%)]'
                  }`}
                >
                  <h3
                    className={`text-base font-display font-bold leading-relaxed ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {generateDayTitle(dayItem.muscleGroups)}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {dayItem.muscleGroups.map((mg) => (
                      <span
                        key={mg}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                          isDark
                            ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300'
                            : 'bg-[hsl(40,15%,96%)] border-[hsl(40,10%,88%)] text-slate-700'
                        }`}
                      >
                        {translateMuscleGroup(mg, lang)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDIT SCHEDULE MODAL */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSaving) {
              handleCancel();
            }
          }}
        >
          <div
            className={`w-full max-w-2xl max-h-[90vh] rounded-2xl border flex flex-col overflow-hidden ${
              isDark
                ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)]'
                : 'bg-white border-[hsl(40,10%,88%)]'
            }`}
          >
            {/* MODAL HEADER */}
            <div
              className={`p-5 border-b flex items-center justify-between ${
                isDark ? 'border-[hsl(240,4%,19%)]' : 'border-[hsl(40,10%,90%)]'
              }`}
            >
              <div>
                <h2 className="text-lg font-display font-bold">
                  {isArabic ? 'تعديل الجدول الأسبوعي' : 'Edit Weekly Schedule'}
                </h2>
                <p
                  className={`text-xs mt-1 ${
                    isDark ? 'text-gray-400' : 'text-slate-500'
                  }`}
                >
                  {isArabic
                    ? 'اختر نظام تمرين جاهز من القائمة أو خصّص كل يوم يدوياً.'
                    : 'Select a workout split preset or customize each day manually.'}
                </p>
              </div>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-slate-500'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SPLIT PRESET DROPDOWN SELECTOR */}
            <div
              className={`px-5 py-4 border-b ${
                isDark
                  ? 'bg-[hsl(240,5%,10%)] border-[hsl(240,4%,19%)]'
                  : 'bg-[hsl(40,20%,97%)] border-[hsl(40,10%,90%)]'
              }`}
            >
              <label
                htmlFor="split-preset-select"
                className="flex items-center gap-1.5 text-xs font-bold mb-2"
              >
                <Sparkles
                  className={`w-3.5 h-3.5 ${
                    isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
                  }`}
                />
                {isArabic
                  ? 'اختر نظام التمرين (Workout Split Preset):'
                  : 'Quick-Fill Workout Split Preset:'}
              </label>

              <select
                id="split-preset-select"
                value={selectedPreset}
                onChange={(e) => handleApplyPreset(e.target.value as SplitPresetKey)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border outline-none transition-all cursor-pointer ${
                  isDark
                    ? 'bg-[hsl(240,6%,5%)] border-[hsl(240,4%,22%)] text-white focus:border-[hsl(75,92%,56%)]'
                    : 'bg-white border-[hsl(40,10%,84%)] text-slate-800 focus:border-[hsl(76,78%,42%)]'
                }`}
              >
                <option value="custom">
                  {isArabic ? '— مخصص (تعديل يدوي للأيام) —' : '— Custom (Manual Selection) —'}
                </option>
                {SPLIT_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {isArabic ? preset.labelAr : preset.labelEn}
                  </option>
                ))}
              </select>

              {selectedPreset !== 'custom' && (
                <p
                  className={`text-[11px] mt-2 ${
                    isDark ? 'text-[hsl(75,92%,56%)]/90' : 'text-[hsl(76,78%,38%)]'
                  }`}
                >
                  {isArabic
                    ? SPLIT_PRESETS.find((p) => p.id === selectedPreset)?.descriptionAr
                    : SPLIT_PRESETS.find((p) => p.id === selectedPreset)?.descriptionEn}
                </p>
              )}
            </div>

            {/* DAYS LIST */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {draftSchedule.map((dayItem) => {
                const isRest = dayItem.workoutType === 'rest';
                return (
                  <div
                    key={dayItem.day}
                    className={`rounded-xl border p-4 space-y-3 ${
                      isDark
                        ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)]'
                        : 'bg-[hsl(40,20%,97.5%)] border-[hsl(40,10%,88%)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CalendarDays
                          className={`w-4 h-4 ${
                            isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
                          }`}
                        />
                        <h3 className="text-sm font-bold">
                          {translateDayName(dayItem.day, lang)}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleRestDay(dayItem.day)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                          isRest
                            ? isDark
                              ? 'bg-[hsl(75,92%,56%)]/15 border-[hsl(75,92%,56%)]/40 text-[hsl(75,92%,56%)]'
                              : 'bg-[hsl(76,78%,42%)]/10 border-[hsl(76,78%,42%)]/30 text-[hsl(76,78%,42%)]'
                            : isDark
                            ? 'bg-[hsl(240,6%,4%)] border-[hsl(240,4%,19%)] text-gray-400 hover:text-white'
                            : 'bg-white border-[hsl(40,10%,88%)] text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {isRest ? (
                          <Dumbbell className="w-3.5 h-3.5" />
                        ) : (
                          <Moon className="w-3.5 h-3.5" />
                        )}
                        {isRest ? (isArabic ? 'يوم تمرين' : 'Training Day') : (isArabic ? 'يوم راحة' : 'Rest Day')}
                      </button>
                    </div>

                    {!isRest && (
                      <div className="flex flex-wrap gap-2">
                        {MUSCLE_GROUPS.map((mg) => {
                          const active = dayItem.muscleGroups.includes(mg);
                          return (
                            <button
                              key={mg}
                              type="button"
                              onClick={() => toggleMuscleGroup(dayItem.day, mg)}
                              className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                                active
                                  ? isDark
                                    ? 'bg-[hsl(75,92%,56%)]/15 border-[hsl(75,92%,56%)] text-[hsl(75,92%,56%)]'
                                    : 'bg-[hsl(76,78%,42%)]/10 border-[hsl(76,78%,42%)] text-[hsl(76,78%,42%)]'
                                  : isDark
                                  ? 'bg-[hsl(240,6%,4%)] border-[hsl(240,4%,19%)] text-gray-400 hover:border-gray-500'
                                  : 'bg-white border-[hsl(40,10%,88%)] text-slate-600 hover:border-gray-400'
                              }`}
                            >
                              {active && <Check className="w-3 h-3" />}
                              {translateMuscleGroup(mg, lang)}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {isRest && (
                      <div
                        className={`flex items-center gap-2 py-2 text-xs ${
                          isDark ? 'text-gray-500' : 'text-slate-400'
                        }`}
                      >
                        <Moon className="w-4 h-4" />
                        {isArabic ? 'يوم راحة واستشفاء' : 'Rest and recovery day'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* MODAL FOOTER */}
            <div
              className={`p-4 sm:p-5 border-t flex items-center justify-end gap-2 ${
                isDark ? 'border-[hsl(240,4%,19%)] bg-[hsl(240,5%,9%)]' : 'border-[hsl(40,10%,90%)] bg-white'
              }`}
            >
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300 hover:bg-[hsl(240,5%,15%)]'
                    : 'bg-white border-[hsl(40,10%,88%)] text-slate-700 hover:bg-gray-50'
                }`}
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={isSaving}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                  isDark
                    ? 'bg-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,50%)] text-[hsl(240,10%,9%)]'
                    : 'bg-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,37%)] text-white'
                }`}
              >
                <Save className="w-4 h-4" />
                {isSaving
                  ? isArabic
                    ? 'جاري الحفظ...'
                    : 'Saving...'
                  : isArabic
                  ? 'حفظ التعديلات'
                  : 'Save Updates'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
