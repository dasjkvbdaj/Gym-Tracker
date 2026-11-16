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
  Trash2,
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

  // حالة النافذة المتقدمة الجديدة (Pop-up لتحديد النظام والاسم والروتيشن المخصص)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [scheduleTitleInput, setScheduleTitleInput] = useState('My Custom Split');
  const [selectedMode, setSelectedMode] = useState<'fixed' | 'rotating'>(
    settings.scheduleMode || 'fixed'
  );

  // حالة أيام الروتيشن المخصصة (Rotating Days List)
  const [rotatingDays, setRotatingDays] = useState<
    { id: string; title: string; isRest: boolean; muscleGroups: MuscleGroup[] }[]
  >(
    settings.rotatingDays || [
      { id: '1', title: 'Day 1 (Pull)', isRest: false, muscleGroups: ['Back', 'Shoulders', 'Biceps'] },
      { id: '2', title: 'Day 2 (Push)', isRest: false, muscleGroups: ['Chest', 'Shoulders', 'Triceps'] },
      { id: '3', title: 'Day 3 (Rest)', isRest: true, muscleGroups: [] },
      { id: '4', title: 'Day 4 (Legs)', isRest: false, muscleGroups: ['Legs'] },
    ]
  );

  const trainingDays = useMemo(() => {
    return weeklySchedule.filter(
      (day) =>
        day.workoutType !== 'rest' &&
        day.muscleGroups.length > 0
    );
  }, [weeklySchedule]);

  const generateDayTitle = (groups: MuscleGroup[]) => {
    if (groups.length === 0) {
      return isArabic ? 'يوم راحة' : 'Rest Day';
    }
    return groups
      .map((group) => translateMuscleGroup(group, lang))
      .join(' + ');
  };

  const handleCopySchedule = () => {
    const scheduleText =
      selectedMode === 'rotating'
        ? rotatingDays
            .map((d, i) => `Day ${i + 1} (${d.title}): ${d.isRest ? 'Rest Day' : d.muscleGroups.map(mg => translateMuscleGroup(mg, lang)).join(' + ')}`)
            .join('\n')
        : weeklySchedule
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
    setIsEditModalOpen(true);
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
          workoutType: updatedGroups.length === 0 ? 'rest' : 'strength',
          title: generateDayTitle(updatedGroups),
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

  // وظائف إدارة الـ Rotating المخصص داخل الـ Pop-up
  const handleAddRotatingDay = () => {
    setRotatingDays([
      ...rotatingDays,
      {
        id: Math.random().toString(),
        title: `Day ${rotatingDays.length + 1}`,
        isRest: false,
        muscleGroups: ['Back'],
      },
    ]);
  };

  const handleRemoveRotatingDay = (id: string) => {
    setRotatingDays(rotatingDays.filter((d) => d.id !== id));
  };

  const handleToggleRotatingMuscle = (id: string, mg: MuscleGroup) => {
    setRotatingDays(
      rotatingDays.map((d) => {
        if (d.id !== id) return d;
        const exists = d.muscleGroups.includes(mg);
        const updated = exists
          ? d.muscleGroups.filter((g) => g !== mg)
          : [...d.muscleGroups, mg];
        return { ...d, muscleGroups: updated };
      })
    );
  };

  const handleToggleRotatingRest = (id: string) => {
    setRotatingDays(
      rotatingDays.map((d) => {
        if (d.id !== id) return d;
        return { ...d, isRest: !d.isRest, muscleGroups: !d.isRest ? [] : ['Back'] };
      })
    );
  };

  const handleSaveConfiguration = () => {
    // حفظ إعدادات النظام في الـ Settings أو الـ LocalStorage حسب رغبتك
    settings.scheduleMode = selectedMode;
    settings.rotatingDays = rotatingDays;
    setIsConfigModalOpen(false);
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className={`px-4 py-3 rounded-xl font-display font-bold text-sm flex items-center gap-2 border transition-all cursor-pointer ${
              isDark
                ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-[hsl(75,92%,56%)] hover:bg-[hsl(240,5%,15%)]'
                : 'bg-white border-[hsl(40,10%,88%)] text-indigo-700 hover:bg-gray-50'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            {isArabic ? 'إعداد النظام (Configure Split)' : 'Configure Split'}
          </button>

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
              {selectedMode === 'rotating'
                ? isArabic ? 'نظام الدورة (Rotating)' : 'Rotating Cycle'
                : isArabic ? 'أيام التمرين (Fixed)' : 'Fixed Training Days'}
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span
                className={`text-3xl font-display font-bold ${
                  isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
                }`}
              >
                {selectedMode === 'rotating' ? rotatingDays.length : trainingDays.length}
              </span>
              <span
                className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-slate-500'
                }`}
              >
                {selectedMode === 'rotating'
                  ? isArabic ? 'أيام متسلسلة دورية' : 'Sequence Days'
                  : `/ 7 ${isArabic ? 'أيام' : 'Days'}`}
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

      {/* TRAINING DAYS DISPLAY */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-base">
            {selectedMode === 'rotating'
              ? isArabic ? 'تسلسل الدورة المخصص' : 'Custom Rotating Sequence'
              : isArabic ? 'برنامج الأسبوع' : 'Weekly Training Split'}
          </h2>
        </div>

        {selectedMode === 'rotating' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {rotatingDays.map((d, index) => (
              <div
                key={d.id}
                className={`relative overflow-hidden rounded-2xl border p-4 transition-colors ${
                  isDark
                    ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
                    : 'bg-white border-[hsl(40,10%,88%)] shadow-xs'
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
                      {d.title}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-1 rounded-md ${
                      d.isRest
                        ? 'bg-gray-500/15 text-gray-400'
                        : isDark
                        ? 'bg-[hsl(75,92%,56%)]/10 text-[hsl(75,92%,56%)]'
                        : 'bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)]'
                    }`}
                  >
                    {d.isRest ? (isArabic ? 'راحة' : 'REST') : (isArabic ? 'تمرين' : 'WORKOUT')}
                  </span>
                </div>

                <div
                  className={`mt-4 pt-3 border-t ${
                    isDark ? 'border-[hsl(240,4%,16%)]' : 'border-[hsl(40,10%,92%)]'
                  }`}
                >
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                    {d.isRest
                      ? (isArabic ? 'يوم راحة واستشفاء' : 'Rest and recovery day')
                      : d.muscleGroups.map((mg) => translateMuscleGroup(mg, lang)).join(' + ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {trainingDays.map((dayItem, index) => (
              <div
                key={dayItem.day}
                className={`relative overflow-hidden rounded-2xl border p-4 transition-colors ${
                  isDark
                    ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
                    : 'bg-white border-[hsl(40,10%,88%)] shadow-xs'
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CONFIGURATION POP-UP MODAL (النافذة المنبثقة الجديدة التي طلبتها) */}
      {isConfigModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsConfigModalOpen(false);
            }
          }}
        >
          <div
            className={`w-full max-w-2xl max-h-[90vh] rounded-2xl border flex flex-col overflow-hidden shadow-2xl ${
              isDark
                ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)] text-white'
                : 'bg-white border-[hsl(40,10%,88%)] text-slate-900'
            }`}
          >
            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              <h2 className="text-lg font-bold">
                {isArabic ? 'إعداد نظام التمرين (Schedule Configuration)' : 'Schedule Configuration'}
              </h2>
              <button onClick={() => setIsConfigModalOpen(false)}>
                <X className="w-5 h-5 cursor-pointer" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* 1. اسم التمرين / الخطة (Emput) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold">
                  {isArabic ? 'اسم الجدول أو الخطة (Schedule Name)' : 'Schedule Name'}
                </label>
                <input
                  type="text"
                  value={scheduleTitleInput}
                  onChange={(e) => setScheduleTitleInput(e.target.value)}
                  placeholder="e.g. Emput Split"
                  className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none ${
                    isDark ? 'bg-[hsl(240,5%,11%)] border-gray-700 text-white' : 'bg-gray-50 border-gray-300'
                  }`}
                />
              </div>

              {/* 2. اختيار النمط: Fixed أم Rotating */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold">
                  {isArabic ? 'اختر نمط النظام (Mode)' : 'Select Mode'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedMode('fixed')}
                    className={`py-3 px-4 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                      selectedMode === 'fixed'
                        ? isDark ? 'bg-[hsl(75,92%,56%)] text-black border-transparent' : 'bg-indigo-700 text-white border-transparent'
                        : isDark ? 'bg-[hsl(240,5%,11%)] border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-300 text-slate-700'
                    }`}
                  >
                    {isArabic ? 'ثابت (Fixed Split)' : 'Fixed Split'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMode('rotating')}
                    className={`py-3 px-4 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                      selectedMode === 'rotating'
                        ? isDark ? 'bg-[hsl(75,92%,56%)] text-black border-transparent' : 'bg-indigo-700 text-white border-transparent'
                        : isDark ? 'bg-[hsl(240,5%,11%)] border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-300 text-slate-700'
                    }`}
                  >
                    {isArabic ? 'دوري (Rotating Split)' : 'Rotating Split'}
                  </button>
                </div>
              </div>

              {/* 3. إذا اخترت Rotating، يظهر لك محرر الأيام المخصص */}
              {selectedMode === 'rotating' && (
                <div className="space-y-3 pt-3 border-t border-inherit">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[hsl(75,92%,56%)]">
                      {isArabic ? 'أيام الدورة المخصصة (Custom Days)' : 'Custom Rotating Days'}
                    </span>
                    <button
                      type="button"
                      onClick={handleAddRotatingDay}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-700 text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {isArabic ? 'إضافة يوم (Add Day)' : 'Add Day'}
                    </button>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {rotatingDays.map((d, idx) => (
                      <div
                        key={d.id}
                        className={`p-3 rounded-xl border space-y-2 ${
                          isDark ? 'bg-[hsl(240,5%,11%)] border-gray-800' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={d.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRotatingDays(rotatingDays.map(item => item.id === d.id ? { ...item, title: val } : item));
                            }}
                            className={`font-bold text-xs px-2 py-1 rounded border ${isDark ? 'bg-black border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleRotatingRest(d.id)}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold border cursor-pointer ${
                                d.isRest ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                              }`}
                            >
                              {d.isRest ? (isArabic ? 'راحة (Rest)' : 'Rest') : (isArabic ? 'تمرين (Workout)' : 'Workout')}
                            </button>
                            {rotatingDays.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveRotatingDay(d.id)}
                                className="text-red-500 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {!d.isRest && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {MUSCLE_GROUPS.map((mg) => {
                              const active = d.muscleGroups.includes(mg);
                              return (
                                <button
                                  key={mg}
                                  type="button"
                                  onClick={() => handleToggleRotatingMuscle(d.id, mg)}
                                  className={`px-2 py-1 rounded text-[10px] font-medium border cursor-pointer ${
                                    active
                                      ? 'bg-indigo-700 text-white border-indigo-700'
                                      : isDark ? 'bg-black border-gray-800 text-gray-400' : 'bg-white border-gray-200 text-slate-600'
                                  }`}
                                >
                                  {translateMuscleGroup(mg, lang)}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={`p-4 border-t flex justify-end gap-2 ${isDark ? 'border-gray-800 bg-black/20' : 'border-gray-200 bg-gray-50'}`}>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveConfiguration}
                className="px-5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold cursor-pointer"
              >
                {isArabic ? 'حفظ النظام (Save)' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SCHEDULE MODAL (للأيام الثابتة التقليدية) */}
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
            <div
              className={`p-5 border-b flex items-center justify-between ${
                isDark ? 'border-[hsl(240,4%,19%)]' : 'border-[hsl(40,10%,90%)]'
              }`}
            >
              <div>
                <h2 className="text-lg font-display font-bold">
                  {isArabic ? 'تعديل الجدول الأسبوعي' : 'Edit Weekly Schedule'}
                </h2>
              </div>
              <button onClick={handleCancel} disabled={isSaving}>
                <X className="w-5 h-5" />
              </button>
            </div>

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
                        <CalendarDays className="w-4 h-4 text-indigo-500" />
                        <h3 className="text-sm font-bold">
                          {translateDayName(dayItem.day, lang)}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleRestDay(dayItem.day)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                          isRest ? 'bg-amber-500/20 text-amber-300' : 'bg-gray-500/10 text-gray-400'
                        }`}
                      >
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
                              className={`px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer ${
                                active
                                  ? 'bg-indigo-700 text-white border-indigo-700'
                                  : isDark ? 'bg-black border-gray-800 text-gray-400' : 'bg-white border-gray-200 text-slate-600'
                              }`}
                            >
                              {active && <Check className="w-3 h-3 inline mr-1" />}
                              {translateMuscleGroup(mg, lang)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-indigo-700 text-white text-xs font-bold cursor-pointer"
              >
                {isArabic ? 'حفظ التعديلات' : 'Save Updates'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
