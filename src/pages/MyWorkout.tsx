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

  // حالة النافذة المنبثقة (Pop-up) لتغيير الإعدادات والـ Rotating المخصص
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [scheduleTitleInput, setScheduleTitleInput] = useState('Emput');
  const [selectedMode, setSelectedMode] = useState<'fixed' | 'rotating'>(
    settings.scheduleMode || 'fixed'
  );

  const [rotatingDays, setRotatingDays] = useState<
    { id: string; title: string; isRest: boolean; muscleGroups: MuscleGroup[] }[]
  >(
    settings.rotatingDays || [
      { id: '1', title: 'Day 1', isRest: false, muscleGroups: ['Back', 'Shoulders', 'Biceps'] },
      { id: '2', title: 'Day 2', isRest: false, muscleGroups: ['Chest', 'Shoulders', 'Triceps'] },
      { id: '3', title: 'Day 3', isRest: true, muscleGroups: [] },
      { id: '4', title: 'Day 4', isRest: false, muscleGroups: ['Legs'] },
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
            .map((d, i) => `${d.title}: ${d.isRest ? 'Rest Day' : d.muscleGroups.map(mg => translateMuscleGroup(mg, lang)).join(' + ')}`)
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
            {scheduleTitleInput}
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
            {isArabic ? 'تغيير الجدول (Change Schedule)' : 'Change Schedule'}
          </button>

          {selectedMode === 'fixed' && (
            <button
              onClick={openEditSchedule}
              className={`px-5 py-3 rounded-xl font-display font-bold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                isDark
                  ? 'bg-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,50%)] text-[hsl(240,10%,9%)]'
                  : 'bg-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,37%)] text-white'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              {isArabic ? 'تعديل أيام الأسبوع' : 'Edit Days'}
            </button>
          )}

          <button
            onClick={handleCopySchedule}
            className={`px-4 py-3 rounded-xl font-display font-bold text-sm flex items-center gap-2 border transition-all cursor-pointer ${
              isDark
                ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-200'
                : 'bg-white border-[hsl(40,10%,88%)] text-slate-700'
            }`}
          >
            {scheduleCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            <span>{scheduleCopied ? (isArabic ? 'تم النسخ!' : 'Copied!') : (isArabic ? 'نسخ الجدول' : 'Copy')}</span>
          </button>
        </div>
      </div>

      {/* TRAINING DAYS DISPLAY */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-base">
            {selectedMode === 'rotating'
              ? (isArabic ? 'تسلسل الدورة (Rotating Split)' : 'Rotating Split Sequence')
              : (isArabic ? 'الجدول الثابت (Fixed Split)' : 'Fixed Weekly Split')}
          </h2>
        </div>

        {selectedMode === 'rotating' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {rotatingDays.map((d, index) => (
              <div
                key={d.id}
                className={`relative overflow-hidden rounded-2xl border p-4 transition-colors ${
                  isDark ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]' : 'bg-white border-[hsl(40,10%,88%)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-indigo-500/15 text-indigo-400">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-bold uppercase tracking-wide">
                      {d.title}
                    </span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-md ${d.isRest ? 'bg-gray-500/15 text-gray-400' : 'bg-indigo-500/15 text-indigo-400'}`}>
                    {d.isRest ? 'REST' : 'WORKOUT'}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-inherit">
                  <p className="text-xs text-gray-400">
                    {d.isRest
                      ? (isArabic ? 'يوم راحة' : 'Rest Day')
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
                  isDark ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]' : 'bg-white border-[hsl(40,10%,88%)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-indigo-500/15 text-indigo-400">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-bold uppercase tracking-wide">
                      {translateDayName(dayItem.day, lang)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-inherit">
                  <h3 className="text-base font-display font-bold">
                    {generateDayTitle(dayItem.muscleGroups)}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CONFIGURATION POP-UP (النافذة المنبثقة التي طلبتها تماماً) */}
      {isConfigModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
          onClick={(e) => { if (e.target === e.currentTarget) setIsConfigModalOpen(false); }}
        >
          <div
            className={`w-full max-w-2xl max-h-[90vh] rounded-2xl border flex flex-col overflow-hidden shadow-2xl ${
              isDark ? 'bg-[hsl(240,5%,7.5%)] border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="p-5 border-b border-inherit flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {isArabic ? 'إعداد الجدول والتمرين' : 'Schedule Configuration'}
              </h2>
              <button onClick={() => setIsConfigModalOpen(false)}><X className="w-5 h-5 cursor-pointer" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* اسم الخطة (Emput) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold">
                  {isArabic ? 'اسم التمرين / الخطة' : 'Workout Name'}
                </label>
                <input
                  type="text"
                  value={scheduleTitleInput}
                  onChange={(e) => setScheduleTitleInput(e.target.value)}
                  className={fieldClass}
                />
              </div>

              {/* اختيار النمط: Fixed أو Rotating */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold">
                  {isArabic ? 'اختر النظام (Fixed / Rotating)' : 'Select Options'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedMode('fixed')}
                    className={`py-3 px-4 rounded-xl font-bold text-xs border cursor-pointer ${
                      selectedMode === 'fixed' ? 'bg-indigo-700 text-white border-transparent' : 'border-gray-500/30'
                    }`}
                  >
                    {isArabic ? 'ثابت (Fixed)' : 'Fixed'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMode('rotating')}
                    className={`py-3 px-4 rounded-xl font-bold text-xs border cursor-pointer ${
                      selectedMode === 'rotating' ? 'bg-indigo-700 text-white border-transparent' : 'border-gray-500/30'
                    }`}
                  >
                    {isArabic ? 'دوري (Rotating)' : 'Rotating'}
                  </button>
                </div>
              </div>

              {/* إذا اخترت Rotating، تظهر خيارات إضافة الأيام وتحديد عضلاتها */}
              {selectedMode === 'rotating' && (
                <div className="space-y-3 pt-3 border-t border-inherit">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      {isArabic ? 'أيام الدورة (Day 1, Day 2...)' : 'Rotating Days'}
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
                    {rotatingDays.map((d) => (
                      <div key={d.id} className="p-3 rounded-xl border border-gray-700 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={d.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRotatingDays(rotatingDays.map(item => item.id === d.id ? { ...item, title: val } : item));
                            }}
                            className="font-bold text-xs px-2 py-1 rounded border border-gray-600 bg-black text-white"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleRotatingRest(d.id)}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold border cursor-pointer ${
                                d.isRest ? 'bg-amber-500/20 text-amber-300' : 'bg-gray-500/20 text-gray-300'
                              }`}
                            >
                              {d.isRest ? (isArabic ? 'راحة (Rest)' : 'Rest') : (isArabic ? 'تمرين' : 'Workout')}
                            </button>
                            {rotatingDays.length > 1 && (
                              <button type="button" onClick={() => handleRemoveRotatingDay(d.id)} className="text-red-500 p-1 cursor-pointer">
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
                                    active ? 'bg-indigo-700 text-white border-indigo-700' : 'border-gray-800 text-gray-400'
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

            <div className="p-4 border-t border-inherit flex justify-end gap-2">
              <button onClick={() => setIsConfigModalOpen(false)} className="px-4 py-2 rounded-xl border text-xs cursor-pointer">
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleSaveConfiguration} className="px-5 py-2 rounded-xl bg-indigo-700 text-white text-xs font-bold cursor-pointer">
                {isArabic ? 'حفظ (Save)' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SCHEDULE MODAL (للأيام الثابتة) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3">
          <div className={`w-full max-w-2xl max-h-[90vh] rounded-2xl border flex flex-col overflow-hidden ${isDark ? 'bg-[hsl(240,5%,7.5%)] border-gray-700' : 'bg-white border-slate-200'}`}>
            <div className="p-5 border-b border-inherit flex items-center justify-between">
              <h2 className="text-lg font-bold">{isArabic ? 'تعديل أيام الأسبوع الثابتة' : 'Edit Fixed Days'}</h2>
              <button onClick={handleCancel}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {draftSchedule.map((dayItem) => {
                const isRest = dayItem.workoutType === 'rest';
                return (
                  <div key={dayItem.day} className="rounded-xl border p-4 space-y-3 border-gray-700">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold">{translateDayName(dayItem.day, lang)}</h3>
                      <button onClick={() => toggleRestDay(dayItem.day)} className="px-3 py-1 rounded text-xs border">
                        {isRest ? 'Training Day' : 'Rest Day'}
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
                              className={`px-3 py-1.5 rounded text-xs border cursor-pointer ${active ? 'bg-indigo-700 text-white' : 'border-gray-700 text-gray-400'}`}
                            >
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
            <div className="p-4 border-t border-inherit flex justify-end gap-2">
              <button onClick={handleCancel} className="px-4 py-2 border rounded text-xs">Cancel</button>
              <button onClick={handleSaveSchedule} className="px-4 py-2 bg-indigo-700 text-white text-xs rounded">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
