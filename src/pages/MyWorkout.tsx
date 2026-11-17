import React, { useMemo, useState, useEffect } from 'react';
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
  RefreshCw,
  ChevronDown,
} from 'lucide-react';

import { useGym } from '../context/GymContext';
import { generateId, db } from '../database/db';
import { useLiveQuery } from 'dexie-react-hooks';
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
    updateSettings,
    showToast,
  } = useGym();

  const lang = settings.language;
  const isDark = settings.theme === 'dark';
  const isArabic = lang === 'ar';

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [draftSchedule, setDraftSchedule] = useState<WeeklyScheduleDay[]>([]);
  
  // حالة خاصة لتعديل الـ Rotation Split النشط
  const [draftRotationDays, setDraftRotationDays] = useState<Array<{
    id: string;
    title: string;
    muscleGroups: MuscleGroup[];
    isRest: boolean;
  }>>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [scheduleCopied, setScheduleCopied] = useState(false);

  const savedSplits = useLiveQuery(() => db.workoutSplits.toArray(), [], []) || [];

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState('');
  const [scheduleType, setScheduleType] = useState<'fixed' | 'rotation'>('rotation');
  
  const [rotationDays, setRotationDays] = useState<Array<{
    id: string;
    title: string;
    muscleGroups: MuscleGroup[];
    isRest: boolean;
  }>>([
    { id: '1', title: 'Day 1 (Push)', muscleGroups: ['Chest', 'Shoulders', 'Triceps'], isRest: false },
    { id: '2', title: 'Day 2 (Pull)', muscleGroups: ['Back', 'Biceps', 'Traps'], isRest: false },
    { id: '3', title: 'Day 3 (Legs)', muscleGroups: ['Legs', 'Abs', 'Forearms'], isRest: false },
    { id: '4', title: 'Day 4 (Rest)', muscleGroups: [], isRest: true },
  ]);

  // @ts-ignore
  const activeSplitId = settings.activeSplitId || 'default';
  // @ts-ignore
  const currentSplitType = settings.activeSplitType || 'fixed';
  // @ts-ignore
  const activeSplitData = savedSplits.find(s => s.id === activeSplitId);
  const currentRotationList = activeSplitData?.daysData || rotationDays;

  const trainingDays = useMemo(() => {
    if (currentSplitType === 'rotation' && Array.isArray(currentRotationList)) {
      return currentRotationList.filter((d: any) => !d.isRest && d.muscleGroups?.length > 0);
    }
    return weeklySchedule.filter(
      (day) =>
        day.workoutType !== 'rest' &&
        day.muscleGroups.length > 0
    );
  }, [weeklySchedule, currentSplitType, currentRotationList]);

  const generateDayTitle = (groups: MuscleGroup[]) => {
    if (groups.length === 0) {
      return isArabic ? 'يوم راحة' : 'Rest Day';
    }
    return groups.map((group) => translateMuscleGroup(group, lang)).join(' + ');
  };

  const handleCopySchedule = () => {
    const scheduleText = currentSplitType === 'rotation'
      ? currentRotationList.map((d: any, idx: number) => `Day ${idx + 1} (${d.title}): ${d.isRest ? 'Rest' : d.muscleGroups.join(', ')}`).join('\n')
      : weeklySchedule.map((day) => `${translateDayName(day.day, lang)}: ${day.muscleGroups.join(', ')}`).join('\n');

    navigator.clipboard.writeText(scheduleText).then(() => {
      setScheduleCopied(true);
      setTimeout(() => setScheduleCopied(false), 2000);
    });
  };

  const openEditSchedule = () => {
    if (currentSplitType === 'rotation') {
      // تجهيز نسخة معدلة لأيام الـ Rotation
      setDraftRotationDays(
        JSON.parse(JSON.stringify(currentRotationList))
      );
    } else {
      setDraftSchedule(
        weeklySchedule.map((day) => ({
          ...day,
          muscleGroups: [...day.muscleGroups],
          assignedExerciseIds: [...day.assignedExerciseIds],
        }))
      );
    }
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

  // دوال تعديل الـ Rotation المؤقتة داخل الـ Modal
  const handleToggleDraftRotationMuscle = (dayId: string, mg: MuscleGroup) => {
    setDraftRotationDays(prev => prev.map(d => {
      if (d.id !== dayId) return d;
      const exists = d.muscleGroups.includes(mg);
      const updatedGroups = exists ? d.muscleGroups.filter(item => item !== mg) : [...d.muscleGroups, mg];
      return {
        ...d,
        muscleGroups: updatedGroups,
        isRest: updatedGroups.length === 0,
        title: `Day ${d.title.replace(/[^0-9]/g, '') || '1'} (${generateDayTitle(updatedGroups)})`
      };
    }));
  };

  const handleToggleDraftRotationRest = (dayId: string) => {
    setDraftRotationDays(prev => prev.map(d => {
      if (d.id !== dayId) return d;
      const nextRest = !d.isRest;
      return {
        ...d,
        isRest: nextRest,
        muscleGroups: nextRest ? [] : ['Chest', 'Shoulders', 'Triceps'],
        title: nextRest ? 'Rest Day' : 'Training Day'
      };
    }));
  };

  const handleSaveSchedule = async () => {
    setIsSaving(true);
    try {
      if (currentSplitType === 'rotation' && activeSplitData) {
        // تحديث جدول الـ Rotation في قاعدة البيانات
        const updatedSplitData = {
          ...activeSplitData,
          daysData: draftRotationDays,
        };
        await db.workoutSplits.put(updatedSplitData);
        showToast(isArabic ? 'تم حفظ تعديلات الـ Rotation بنجاح' : 'Rotation schedule updated successfully', 'success');
      } else {
        // تحديث الجدول الثابت اليومي
        for (const day of draftSchedule) {
          const updatedDay: WeeklyScheduleDay = {
            ...day,
            title: generateDayTitle(day.muscleGroups),
            workoutType: day.muscleGroups.length === 0 ? 'rest' : 'strength',
            muscleGroups: [...day.muscleGroups],
          };
          await updateScheduleDay(updatedDay);
        }
        showToast(isArabic ? 'تم حفظ التعديلات بنجاح' : 'Schedule updated successfully', 'success');
      }
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to update weekly schedule:', error);
      showToast(isArabic ? 'حدث خطأ أثناء الحفظ' : 'Error updating schedule', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraftSchedule([]);
    setDraftRotationDays([]);
    setIsEditModalOpen(false);
  };

  const handleToggleRotationMuscle = (dayId: string, mg: MuscleGroup) => {
    setRotationDays(prev => prev.map(d => {
      if (d.id !== dayId) return d;
      const exists = d.muscleGroups.includes(mg);
      const updatedGroups = exists ? d.muscleGroups.filter(item => item !== mg) : [...d.muscleGroups, mg];
      return {
        ...d,
        muscleGroups: updatedGroups,
        isRest: updatedGroups.length === 0,
        title: `${d.title.split('(')[0].trim()} (${generateDayTitle(updatedGroups)})`
      };
    }));
  };

  const handleToggleRotationRest = (dayId: string) => {
    setRotationDays(prev => prev.map(d => {
      if (d.id !== dayId) return d;
      const nextRest = !d.isRest;
      return {
        ...d,
        isRest: nextRest,
        muscleGroups: nextRest ? [] : ['Chest', 'Shoulders', 'Triceps'],
        title: nextRest ? 'Rest Day' : 'Training Day'
      };
    }));
  };

  const handleSaveNewSplit = async () => {
    if (!newScheduleName.trim()) {
      showToast(isArabic ? 'يرجى إدخال اسم للبرنامج' : 'Please enter a schedule name', 'error');
      return;
    }

    try {
      const newSplitId = generateId('split');
      const splitData = {
        id: newSplitId,
        name: newScheduleName.trim(),
        type: scheduleType,
        daysData: scheduleType === 'rotation' ? rotationDays : null,
        createdAt: Date.now(),
      };

      await db.workoutSplits.put(splitData);

      await updateSettings({
        // @ts-ignore
        activeSplitId: newSplitId,
        // @ts-ignore
        activeSplitName: newScheduleName.trim(),
        // @ts-ignore
        activeSplitType: scheduleType,
      });

      setIsCreateModalOpen(false);
      showToast(
        isArabic 
          ? `تم إنشاء وحفظ برنامج "${newScheduleName}" بنجاح!` 
          : `Split "${newScheduleName}" created and saved!`,
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast(isArabic ? 'حدث خطأ أثناء الحفظ' : 'Error saving schedule', 'error');
    }
  };

  const handleSelectSplit = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (selectedId === 'default') {
      await updateSettings({
        // @ts-ignore
        activeSplitId: 'default',
        // @ts-ignore
        activeSplitName: 'Standard Split',
        // @ts-ignore
        activeSplitType: 'fixed',
      });
      return;
    }

    const foundSplit = savedSplits.find(s => s.id === selectedId);
    if (foundSplit) {
      await updateSettings({
        // @ts-ignore
        activeSplitId: foundSplit.id,
        // @ts-ignore
        activeSplitName: foundSplit.name,
        // @ts-ignore
        activeSplitType: foundSplit.type,
      });

      showToast(
        isArabic ? `تم التبديل إلى برنامج: ${foundSplit.name}` : `Switched to split: ${foundSplit.name}`,
        'success'
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
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
              {isArabic ? 'برنامجك النشط' : 'Active Split'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-bold mt-1">
            {isArabic ? 'جدول التمارين الأسبوعي' : 'My Workout Schedule'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 sm:flex-initial min-w-[220px]">
            <select
              value={activeSplitId}
              onChange={handleSelectSplit}
              aria-label="Select Workout Split"
              className={`w-full px-4 py-3 rounded-xl font-display font-bold text-sm border appearance-none pr-10 cursor-pointer focus:outline-none ${
                isDark
                  ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white focus:border-[hsl(75,92%,56%)]'
                  : 'bg-white border-[hsl(40,10%,88%)] text-slate-900 focus:border-indigo-600 shadow-xs'
              }`}
            >
              <option value="default">
                {isArabic ? '⭐ النظام الافتراضي (Standard Split)' : '⭐ Standard Weekly Split'}
              </option>
              {savedSplits.map((split) => (
                <option key={split.id} value={split.id}>
                  {split.name} ({split.type.toUpperCase()})
                </option>
              ))}
            </select>
            <ChevronDown className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-gray-400' : 'text-slate-500'}`} />
          </div>

          <button
            onClick={() => {
              setNewScheduleName('');
              setScheduleType('rotation');
              setIsCreateModalOpen(true);
            }}
            className={`px-4 py-3 rounded-xl font-display font-bold text-sm flex items-center gap-2 transition-all cursor-pointer border ${
              isDark
                ? 'bg-[hsl(240,5%,11%)] border-[hsl(75,92%,56%)]/40 text-[hsl(75,92%,56%)] hover:bg-[hsl(240,5%,15%)]'
                : 'bg-white border-indigo-600 text-indigo-700 hover:bg-indigo-50 shadow-xs'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{isArabic ? 'إنشاء برنامج جديد' : 'Create New'}</span>
          </button>

          {/* زر التعديل أصبح يظهر دائماً سواء كان الجدول fixed أو rotation */}
          <button
            onClick={openEditSchedule}
            className={`px-4 py-3 rounded-xl font-display font-bold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
              isDark
                ? 'bg-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,50%)] text-[hsl(240,10%,9%)]'
                : 'bg-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,37%)] text-white'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>{isArabic ? 'تعديل الجدول' : 'Edit'}</span>
          </button>

          <button
            onClick={handleCopySchedule}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              isDark
                ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-200 hover:bg-[hsl(240,5%,15%)]'
                : 'bg-white border-[hsl(40,10%,88%)] text-slate-700 hover:bg-gray-50'
            }`}
            title={isArabic ? 'نسخ الجدول' : 'Copy Schedule'}
          >
            {scheduleCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div
        className={`rounded-2xl border p-4 sm:p-5 flex items-center justify-between ${
          isDark
            ? 'bg-[hsl(75,92%,56%)]/5 border-[hsl(75,92%,56%)]/20'
            : 'bg-[hsl(76,78%,42%)]/5 border-[hsl(76,78%,42%)]/20'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              isDark ? 'bg-[hsl(75,92%,56%)]/15' : 'bg-[hsl(76,78%,42%)]/10'
            }`}
          >
            {currentSplitType === 'rotation' ? (
              <RefreshCw className={`w-6 h-6 animate-spin ${isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'}`} />
            ) : (
              <Dumbbell className={`w-6 h-6 ${isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'}`} />
            )}
          </div>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              {isArabic ? 'نوع الجدول النشط حالياً' : 'Active Split Mode'}
            </p>
            <h3 className="text-base font-bold mt-0.5">
              {currentSplitType === 'rotation' 
                ? (isArabic ? 'نظام تدوير دوري (Rotation Cycle)' : 'Rotation Cycle Split') 
                : (isArabic ? 'نظام يومي ثابت (Fixed Day-by-Day)' : 'Fixed Day-by-Day Split')}
            </h3>
          </div>
        </div>
        <div className="text-right">
          <span className={`text-2xl font-bold ${isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'}`}>
            {trainingDays.length}
          </span>
          <span className={`text-xs block ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            {isArabic ? 'أيام تمرين' : 'Training Days'}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-base">
            {currentSplitType === 'rotation' ? (isArabic ? 'تسلسل أيام الـ Rotation' : 'Rotation Sequence') : (isArabic ? 'توزيع أيام الأسبوع' : 'Weekly Training Split')}
          </h2>
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
            {trainingDays.length} {isArabic ? 'أيام تمرين' : 'Training Days'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {currentSplitType === 'rotation' && Array.isArray(currentRotationList) ? (
            currentRotationList.map((rotDay: any, index: number) => (
              <div
                key={rotDay.id || index}
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
                        isDark ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)]' : 'bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)]'
                      }`}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className={`text-sm font-bold uppercase tracking-wide ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                      {isArabic ? `اليوم ${index + 1}` : `Day ${index + 1}`}
                    </span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-md ${
                    rotDay.isRest ? 'bg-gray-500/10 text-gray-400' : isDark ? 'bg-[hsl(75,92%,56%)]/10 text-[hsl(75,92%,56%)]' : 'bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)]'
                  }`}>
                    {rotDay.isRest ? (isArabic ? 'راحة' : 'REST') : (isArabic ? 'تمرين' : 'TRAINING')}
                  </span>
                </div>
                <div className={`mt-4 pt-3 border-t ${isDark ? 'border-[hsl(240,4%,16%)]' : 'border-[hsl(40,10%,92%)]'}`}>
                  <h3 className={`text-base font-display font-bold leading-relaxed ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {rotDay.isRest ? (isArabic ? 'يوم راحة' : 'Rest Day') : generateDayTitle(rotDay.muscleGroups)}
                  </h3>
                  {!rotDay.isRest && rotDay.muscleGroups?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {rotDay.muscleGroups.map((mg: string) => (
                        <span
                          key={mg}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                            isDark ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300' : 'bg-[hsl(40,15%,96%)] border-[hsl(40,10%,88%)] text-slate-700'
                          }`}
                        >
                          {translateMuscleGroup(mg as MuscleGroup, lang)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            weeklySchedule.map((dayItem, index) => {
              const isRest = dayItem.workoutType === 'rest';
              return (
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
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isDark ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)]' : 'bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)]'
                      }`}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className={`text-sm font-bold uppercase tracking-wide ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                        {translateDayName(dayItem.day, lang)}
                      </span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-md ${
                      isRest ? 'bg-gray-500/10 text-gray-400' : isDark ? 'bg-[hsl(75,92%,56%)]/10 text-[hsl(75,92%,56%)]' : 'bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)]'
                    }`}>
                      {isRest ? (isArabic ? 'راحة' : 'REST') : (isArabic ? 'تمرين' : 'TRAINING')}
                    </span>
                  </div>
                  <div className={`mt-4 pt-3 border-t ${isDark ? 'border-[hsl(240,4%,16%)]' : 'border-[hsl(40,10%,92%)]'}`}>
                    <h3 className={`text-base font-display font-bold leading-relaxed ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {generateDayTitle(dayItem.muscleGroups)}
                    </h3>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {dayItem.muscleGroups.map((mg) => (
                        <span
                          key={mg}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                            isDark ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300' : 'bg-[hsl(40,15%,96%)] border-[hsl(40,10%,88%)] text-slate-700'
                          }`}
                        >
                          {translateMuscleGroup(mg, lang)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CREATE NEW SCHEDULE MODAL */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
        >
          <div
            className={`w-full max-w-xl max-h-[90vh] rounded-2xl border flex flex-col overflow-hidden ${
              isDark ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)] text-white' : 'bg-white border-[hsl(40,10%,88%)] text-slate-900'
            }`}
          >
            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-[hsl(240,4%,19%)]' : 'border-[hsl(40,10%,90%)]'}`}>
              <div>
                <h2 className="text-lg font-display font-bold">
                  {isArabic ? 'إنشاء نظام تمرين جديد' : 'Create New Workout Split'}
                </h2>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {isArabic ? 'اسم البرنامج (Schedule Name)' : 'Schedule Name'}
                </label>
                <input
                  type="text"
                  placeholder={isArabic ? 'مثال: Push Pull Legs' : 'e.g. Push Pull Legs'}
                  value={newScheduleName}
                  onChange={(e) => setNewScheduleName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none ${
                    isDark ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  {isArabic ? 'نوع النظام (Split Type)' : 'Split Type'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduleType('fixed')}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      scheduleType === 'fixed' ? 'bg-indigo-600 text-white border-indigo-600' : isDark ? 'bg-[hsl(240,5%,11%)] border-gray-700 text-gray-400' : 'bg-white border-slate-300 text-slate-600'
                    }`}
                  >
                    {isArabic ? 'يومي ثابت (Fixed)' : 'Fixed'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleType('rotation')}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      scheduleType === 'rotation' ? 'bg-indigo-600 text-white border-indigo-600' : isDark ? 'bg-[hsl(240,5%,11%)] border-gray-700 text-gray-400' : 'bg-white border-slate-300 text-slate-600'
                    }`}
                  >
                    {isArabic ? 'دوري متسلسل (Rotation)' : 'Rotation'}
                  </button>
                </div>
              </div>

              {scheduleType === 'rotation' && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400">
                      {isArabic ? 'أيام الـ Rotation المسلسلة (Day 1, Day 2...)' : 'Rotation Sequence'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setRotationDays([
                          ...rotationDays,
                          {
                            id: Date.now().toString(),
                            title: `Day ${rotationDays.length + 1}`,
                            muscleGroups: ['Back', 'Biceps'],
                            isRest: false,
                          },
                        ]);
                      }}
                      className="text-xs text-indigo-400 font-bold hover:underline cursor-pointer"
                    >
                      {isArabic ? '+ إضافة يوم' : '+ Add Day'}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {rotationDays.map((d, idx) => (
                      <div
                        key={d.id}
                        className={`p-3 rounded-xl border space-y-2 ${
                          isDark ? 'bg-[hsl(240,5%,11%)] border-gray-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">
                            {isArabic ? `اليوم ${idx + 1}` : `Day ${idx + 1}`}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleRotationRest(d.id)}
                              className="text-[10px] px-2 py-0.5 rounded border border-gray-500/30"
                            >
                              {d.isRest ? (isArabic ? 'تحويل لتمرين' : 'Make Training') : (isArabic ? 'تحويل لراحة' : 'Make Rest')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setRotationDays(rotationDays.filter(item => item.id !== d.id))}
                              className="text-red-400 text-xs cursor-pointer"
                            >
                              {isArabic ? 'حذف' : 'Remove'}
                            </button>
                          </div>
                        </div>

                        {!d.isRest ? (
                          <div className="flex flex-wrap gap-1">
                            {MUSCLE_GROUPS.map((mg) => {
                              const active = d.muscleGroups.includes(mg);
                              return (
                                <button
                                  key={mg}
                                  type="button"
                                  onClick={() => handleToggleRotationMuscle(d.id, mg)}
                                  className={`px-2 py-1 rounded text-[10px] font-medium border cursor-pointer ${
                                    active
                                      ? 'bg-indigo-600 text-white border-indigo-600'
                                      : isDark ? 'bg-black/30 border-gray-800 text-gray-400' : 'bg-white border-slate-200 text-slate-600'
                                  }`}
                                >
                                  {translateMuscleGroup(mg, lang)}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-400 italic">
                            {isArabic ? 'يوم راحة (Rest Day)' : 'Rest Day'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={`p-4 sm:p-5 border-t flex items-center justify-end gap-2 ${isDark ? 'border-[hsl(240,4%,19%)] bg-[hsl(240,5%,9%)]' : 'border-[hsl(40,10%,90%)] bg-white'}`}>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                  isDark ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300' : 'bg-white border-[hsl(40,10%,88%)] text-slate-700'
                }`}
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveNewSplit}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
                  isDark ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)]' : 'bg-[hsl(76,78%,42%)] text-white'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>{isArabic ? 'حفظ وتفعيل البرنامج' : 'Save & Apply Split'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SCHEDULE MODAL (يعمل الآن للـ Fixed وللـ Rotation معاً) */}
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
              isDark ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)]' : 'bg-white border-[hsl(40,10%,88%)]'
            }`}
          >
            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-[hsl(240,4%,19%)]' : 'border-[hsl(40,10%,90%)]'}`}>
              <h2 className="text-lg font-display font-bold">
                {currentSplitType === 'rotation' 
                  ? (isArabic ? 'تعديل جدول الـ Rotation' : 'Edit Rotation Schedule')
                  : (isArabic ? 'تعديل الجدول الثابت' : 'Edit Fixed Schedule')}
              </h2>
              <button onClick={handleCancel} disabled={isSaving}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {currentSplitType === 'rotation' ? (
                // عرض نافذة تعديل أيام الـ Rotation (Day 1, Day 2...)
                draftRotationDays.map((d, index) => (
                  <div
                    key={d.id || index}
                    className={`rounded-xl border p-4 space-y-3 ${
                      isDark ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)]' : 'bg-[hsl(40,20%,97.5%)] border-[hsl(40,10%,88%)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold">
                        {isArabic ? `اليوم ${index + 1}` : `Day ${index + 1}`}
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleToggleDraftRotationRest(d.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                          d.isRest ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-500/30'
                        }`}
                      >
                        {d.isRest ? (isArabic ? 'يوم تمرين' : 'Make Training') : (isArabic ? 'يوم راحة' : 'Make Rest')}
                      </button>
                    </div>

                    {!d.isRest && (
                      <div className="flex flex-wrap gap-2">
                        {MUSCLE_GROUPS.map((mg) => {
                          const active = d.muscleGroups.includes(mg);
                          return (
                            <button
                              key={mg}
                              type="button"
                              onClick={() => handleToggleDraftRotationMuscle(d.id, mg)}
                              className={`px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer ${
                                active ? 'bg-indigo-600 text-white border-indigo-600' : isDark ? 'bg-black/20 border-gray-800 text-gray-400' : 'bg-white border-slate-200 text-slate-600'
                              }`}
                            >
                              {translateMuscleGroup(mg, lang)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                // عرض نافذة تعديل الأيام الثابتة (Monday, Tuesday...)
                draftSchedule.map((dayItem) => {
                  const isRest = dayItem.workoutType === 'rest';
                  return (
                    <div
                      key={dayItem.day}
                      className={`rounded-xl border p-4 space-y-3 ${
                        isDark ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)]' : 'bg-[hsl(40,20%,97.5%)] border-[hsl(40,10%,88%)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold">{translateDayName(dayItem.day, lang)}</h3>
                        <button
                          type="button"
                          onClick={() => toggleRestDay(dayItem.day)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                            isRest ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-500/30'
                          }`}
                        >
                          {isRest ? (isArabic ? 'يوم تمرين' : 'Make Training') : (isArabic ? 'يوم راحة' : 'Make Rest')}
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
                                  active ? 'bg-indigo-600 text-white border-indigo-600' : isDark ? 'bg-black/20 border-gray-800 text-gray-400' : 'bg-white border-slate-200 text-slate-600'
                                }`}
                              >
                                {translateMuscleGroup(mg, lang)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className={`p-4 sm:p-5 border-t flex items-center justify-end gap-2 ${isDark ? 'border-[hsl(240,4%,19%)] bg-[hsl(240,5%,9%)]' : 'bg-white'}`}>
              <button onClick={handleCancel} className="px-4 py-2.5 rounded-xl text-xs font-semibold border">
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleSaveSchedule} disabled={isSaving} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer">
                {isArabic ? 'حفظ التعديلات' : 'Save Updates'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
