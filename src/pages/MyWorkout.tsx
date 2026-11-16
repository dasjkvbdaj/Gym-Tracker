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
  Plus,
  BookmarkPlus,
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

interface CustomPreset {
  id: string;
  name: string;
  schedule: Record<DayName, { title: string; workoutType: 'strength' | 'rest'; muscleGroups: MuscleGroup[] }>;
}

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
  const [isSaving, setIsSaving] = useState(false);
  const [scheduleCopied, setScheduleCopied] = useState(false);

  // حفظ القوالب المخصصة للمستخدم (تتخزن بالـ State أو تزيدها حسب الرغبة)
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([
    {
      id: 'default_ppl_cardio',
      name: 'Pull / Push / Cardio / Legs',
      schedule: {
        Monday: { title: 'Back + Shoulders + Traps + Biceps', workoutType: 'strength', muscleGroups: ['Back', 'Shoulders', 'Traps', 'Biceps'] },
        Tuesday: { title: 'Chest + Shoulders + Triceps + Forearms', workoutType: 'strength', muscleGroups: ['Chest', 'Shoulders', 'Triceps', 'Forearms'] },
        Wednesday: { title: 'Cardio', workoutType: 'strength', muscleGroups: ['Cardio'] },
        Thursday: { title: 'Legs', workoutType: 'strength', muscleGroups: ['Legs'] },
        Friday: { title: 'Back + Shoulders + Traps + Biceps', workoutType: 'strength', muscleGroups: ['Back', 'Shoulders', 'Traps', 'Biceps'] },
        Saturday: { title: 'Chest + Shoulders + Triceps + Forearms', workoutType: 'strength', muscleGroups: ['Chest', 'Shoulders', 'Triceps', 'Forearms'] },
        Sunday: { title: 'Rest Day', workoutType: 'rest', muscleGroups: [] },
      },
    },
  ]);

  const [newPresetName, setNewPresetName] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  const trainingDays = useMemo(() => {
    return weeklySchedule.filter(
      (day) =>
        day.workoutType !== 'rest' &&
        (day.muscleGroups.length > 0 || (day.title && day.title !== 'Rest Day' && day.title !== 'يوم راحة'))
    );
  }, [weeklySchedule]);

  // Copy weekly schedule
  const handleCopySchedule = () => {
    const scheduleText = weeklySchedule
      .map((day) => {
        const dayName = translateDayName(day.day, lang);
        const details =
          day.workoutType === 'rest'
            ? isArabic ? 'يوم راحة' : 'Rest Day'
            : day.title || (day.muscleGroups.length > 0 ? day.muscleGroups.map((mg) => translateMuscleGroup(mg, lang)).join(' + ') : 'Rest Day');

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
        title: day.title || '',
        muscleGroups: [...day.muscleGroups],
        assignedExerciseIds: [...day.assignedExerciseIds],
      }))
    );
    setSelectedPresetId('');
    setNewPresetName('');
    setIsEditModalOpen(true);
  };

  // تطبيق قالب محفوظ مسبقاً
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (!presetId) return;

    const preset = customPresets.find((p) => p.id === presetId);
    if (!preset) return;

    setDraftSchedule((previous) =>
      previous.map((item) => {
        const dayData = preset.schedule[item.day];
        if (!dayData) return item;
        return {
          ...item,
          title: dayData.title,
          workoutType: dayData.workoutType,
          muscleGroups: [...dayData.muscleGroups],
        };
      })
    );
  };

  // حفظ الجدول الحالي كقالب جديد بالـ Dropdown
  const handleSaveAsNewPreset = () => {
    if (!newPresetName.trim()) return;

    const scheduleMap: Record<DayName, { title: string; workoutType: 'strength' | 'rest'; muscleGroups: MuscleGroup[] }> = {} as any;
    
    draftSchedule.forEach((d) => {
      scheduleMap[d.day] = {
        title: d.title || (d.workoutType === 'rest' ? 'Rest Day' : 'Workout'),
        workoutType: d.workoutType,
        muscleGroups: [...d.muscleGroups],
      };
    });

    const newPreset: CustomPreset = {
      id: `preset_${Date.now()}`,
      name: newPresetName.trim(),
      schedule: scheduleMap,
    };

    setCustomPresets((prev) => [...prev, newPreset]);
    setSelectedPresetId(newPreset.id);
    setNewPresetName('');
  };

  const handleDayTitleChange = (dayName: DayName, newTitle: string) => {
    setDraftSchedule((previous) =>
      previous.map((item) => {
        if (item.day !== dayName) return item;
        return {
          ...item,
          title: newTitle,
        };
      })
    );
  };

  const toggleMuscleGroup = (
    day: DayName,
    muscleGroup: MuscleGroup
  ) => {
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
          workoutType: updatedGroups.length === 0 && !item.title ? 'rest' : 'strength',
        };
      })
    );
  };

  const toggleRestDay = (day: DayName) => {
    setDraftSchedule((previous) =>
      previous.map((item) => {
        if (item.day !== day) return item;

        if (item.workoutType === 'rest') {
          return {
            ...item,
            workoutType: 'strength',
            title: item.title || 'Workout Day',
          };
        }

        return {
          ...item,
          workoutType: 'rest',
          title: isArabic ? 'يوم راحة' : 'Rest Day',
          muscleGroups: [],
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
          title: day.title || (day.muscleGroups.length > 0 ? day.muscleGroups.join(' + ') : (isArabic ? 'يوم راحة' : 'Rest Day')),
          workoutType: day.workoutType,
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
              ? 'نظّم أيام تمرينك واحفظ جداولك المخصصة بكل سهولة.'
              : 'Organize and save your custom workout schedules.'}
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

      {/* WEEKLY SCHEDULE SUMMARY */}
      <div
        className={`rounded-2xl border p-4 sm:p-5 ${
          isDark
            ? 'bg-[hsl(75,92%,56%)]/5 border-[hsl(75,92%,56%)]/20'
            : 'bg-[hsl(76,78%,42%)]/5 border-[hsl(76,78%,42%)]/20'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p
              className={`text-xs font-medium ${
                isDark ? 'text-gray-400' : 'text-slate-500'
              }`}
            >
              {isArabic ? 'أيام التمرين' : 'Training Days'}
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
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
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isDark ? 'bg-[hsl(75,92%,56%)]/15' : 'bg-[hsl(76,78%,42%)]/10'
            }`}
          >
            <Dumbbell
              className={`w-6 h-6 ${
                isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
              }`}
            />
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
                      dayItem.workoutType === 'rest'
                        ? isDark
                          ? 'bg-gray-800 text-gray-400'
                          : 'bg-gray-100 text-slate-500'
                        : isDark
                        ? 'bg-[hsl(75,92%,56%)]/10 text-[hsl(75,92%,56%)]'
                        : 'bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)]'
                    }`}
                  >
                    {dayItem.workoutType === 'rest'
                      ? (isArabic ? 'راحة' : 'REST')
                      : (isArabic ? 'تمرين' : 'TRAINING')}
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
                    {dayItem.title || (isArabic ? 'يوم راحة' : 'Rest Day')}
                  </h3>
                  {dayItem.muscleGroups.length > 0 && (
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
                  )}
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
                    ? 'اختر جدولاً محفوظاً أو أنشئ جدولاً مخصصاً جديداً.'
                    : 'Select a saved schedule preset or create a new custom one.'}
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

            {/* PRESET SELECTOR & SAVER BAR */}
            <div
              className={`p-4 border-b space-y-3 ${
                isDark
                  ? 'bg-[hsl(240,5%,10%)] border-[hsl(240,4%,19%)]'
                  : 'bg-[hsl(40,20%,97%)] border-[hsl(40,10%,90%)]'
              }`}
            >
              <div className="flex flex-col sm:flex-row gap-2 items-center">
                <select
                  value={selectedPresetId}
                  onChange={(e) => handleSelectPreset(e.target.value)}
                  className={`w-full sm:flex-1 px-3 py-2 rounded-xl text-xs font-semibold border outline-none cursor-pointer ${
                    isDark
                      ? 'bg-[hsl(240,6%,5%)] border-[hsl(240,4%,22%)] text-white'
                      : 'bg-white border-[hsl(40,10%,84%)] text-slate-800'
                  }`}
                >
                  <option value="">
                    {isArabic ? '— اختر قالباً محفوظاً (Presets) —' : '— Select a Saved Preset —'}
                  </option>
                  {customPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* SAVE NEW PRESET INPUT */}
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder={isArabic ? 'اسم الجدول الجديد (مثال: جدول الشتاء)...' : 'New schedule name (e.g., Winter Split)...'}
                  className={`w-full sm:flex-1 px-3 py-2 rounded-xl text-xs font-semibold border outline-none ${
                    isDark
                      ? 'bg-[hsl(240,6%,5%)] border-[hsl(240,4%,22%)] text-white focus:border-[hsl(75,92%,56%)]'
                      : 'bg-white border-[hsl(40,10%,84%)] text-slate-800 focus:border-[hsl(76,78%,42%)]'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleSaveAsNewPreset}
                  disabled={!newPresetName.trim()}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 ${
                    isDark
                      ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)] hover:bg-[hsl(75,92%,50%)]'
                      : 'bg-[hsl(76,78%,42%)] text-white hover:bg-[hsl(76,78%,37%)]'
                  }`}
                >
                  <BookmarkPlus className="w-4 h-4" />
                  {isArabic ? 'حفظ كقالب' : 'Save Preset'}
                </button>
              </div>
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
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-semibold mb-1 opacity-75">
                            {isArabic ? 'اسم أو عنوان التمرين لهذا اليوم:' : 'Custom Workout Title:'}
                          </label>
                          <input
                            type="text"
                            value={dayItem.title || ''}
                            onChange={(e) => handleDayTitleChange(dayItem.day, e.target.value)}
                            placeholder={isArabic ? 'مثال: Chest + Triceps' : 'e.g., Chest + Triceps'}
                            className={`w-full px-3 py-2 rounded-lg text-xs font-semibold border outline-none transition-all ${
                              isDark
                                ? 'bg-[hsl(240,6%,5%)] border-[hsl(240,4%,22%)] text-white focus:border-[hsl(75,92%,56%)]'
                                : 'bg-white border-[hsl(40,10%,84%)] text-slate-800 focus:border-[hsl(76,78%,42%)]'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold mb-1 opacity-75">
                            {isArabic ? 'العضلات المستهدفة (اختياري):' : 'Targeted Muscle Groups:'}
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {MUSCLE_GROUPS.map((mg) => {
                              const active = dayItem.muscleGroups.includes(mg);
                              return (
                                <button
                                  key={mg}
                                  type="button"
                                  onClick={() => toggleMuscleGroup(dayItem.day, mg)}
                                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border flex items-center gap-1 transition-all cursor-pointer ${
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
                        </div>
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
