import React, { useMemo, useState } from 'react';
import {
  Check,
  Dumbbell,
  Edit3,
  Flame,
  Info,
  Moon,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { useGym } from '../context/GymContext';
import { DayName, MuscleGroup, WeeklyScheduleDay } from '../types/workout';
import { getDateMetadata, toLocalDateString } from '../utils/dateUtils';
import {
  MUSCLE_GROUPS,
  translateDayName,
  translateMuscleGroup,
} from '../utils/i18n';

export const MyWorkout: React.FC = () => {
  const {
    weeklySchedule,
    exercises,
    settings,
    startNewWorkout,
    updateScheduleDay,
    assignExerciseToDay,
    removeExerciseFromDay,
    resetScheduleToDefault,
    setCurrentSection,
  } = useGym();

  const lang = settings.language;
  const isDark = settings.theme === 'dark';

  const todayStr = toLocalDateString(new Date());
  const todayMeta = getDateMetadata(todayStr);

  const [selectedDay, setSelectedDay] = useState<DayName>(todayMeta.dayOfWeek);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [isAddExerciseModalOpen, setIsAddExerciseModalOpen] = useState(false);
  const [filterMuscleGroup, setFilterMuscleGroup] = useState<MuscleGroup | 'ALL'>('ALL');

  const currentDayPlan: WeeklyScheduleDay = useMemo(() => {
    return (
      weeklySchedule.find((d) => d.day === selectedDay) || weeklySchedule[0]
    );
  }, [weeklySchedule, selectedDay]);

  // Edit state for current day plan
  const [editTitle, setEditTitle] = useState(currentDayPlan.title);
  const [editType, setEditType] = useState<'strength' | 'cardio' | 'rest'>(
    currentDayPlan.workoutType
  );
  const [editMuscleGroups, setEditMuscleGroups] = useState<MuscleGroup[]>(
    currentDayPlan.muscleGroups
  );
  const [editNotes, setEditNotes] = useState(currentDayPlan.notes || '');

  const openEditDayModal = () => {
    setEditTitle(currentDayPlan.title);
    setEditType(currentDayPlan.workoutType);
    setEditMuscleGroups(currentDayPlan.muscleGroups);
    setEditNotes(currentDayPlan.notes || '');
    setIsEditingPlan(true);
  };

  const handleSaveDayEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: WeeklyScheduleDay = {
      ...currentDayPlan,
      title:
        editTitle.trim() ||
        (editType === 'rest'
          ? 'Rest'
          : editType === 'cardio'
          ? 'Cardio — 1 Hour'
          : editMuscleGroups.join(' + ') || 'Strength Workout'),
      workoutType: editType,
      muscleGroups: editType === 'rest' ? [] : editMuscleGroups,
      notes: editNotes.trim(),
    };
    await updateScheduleDay(updated);
    setIsEditingPlan(false);
  };

  const toggleEditMuscleGroup = (mg: MuscleGroup) => {
    setEditMuscleGroups((prev) =>
      prev.includes(mg) ? prev.filter((item) => item !== mg) : [...prev, mg]
    );
  };

  // Assigned exercises resolved from library
  const assignedExercises = useMemo(() => {
    return currentDayPlan.assignedExerciseIds
      .map((id) => exercises.find((e) => e.id === id))
      .filter((e): e is NonNullable<typeof e> => Boolean(e));
  }, [currentDayPlan, exercises]);

  // Exercises available to add to this day
  const availableExercisesToAdd = useMemo(() => {
    return exercises.filter((e) => {
      if (currentDayPlan.assignedExerciseIds.includes(e.id)) return false;
      if (filterMuscleGroup !== 'ALL' && e.muscleGroup !== filterMuscleGroup) {
        return false;
      }
      return true;
    });
  }, [exercises, currentDayPlan.assignedExerciseIds, filterMuscleGroup]);

  const handleStartSelectedDayWorkout = async () => {
    // IMPORTANT: Weekly schedule NEVER determines the actual workout date.
    // Even if Monday's plan is started on Tuesday, actualDate is Tuesday's real local date.
    await startNewWorkout({
      workoutType: currentDayPlan.workoutType === 'cardio' ? 'cardio' : 'strength',
      title:
        currentDayPlan.workoutType === 'rest'
          ? 'Custom Strength Workout'
          : currentDayPlan.title,
      muscleGroups:
        currentDayPlan.muscleGroups.length > 0
          ? currentDayPlan.muscleGroups
          : ['Back'],
      exerciseIds: currentDayPlan.assignedExerciseIds,
      actualDate: todayStr,
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
            {lang === 'ar' ? 'جدول التمارين الأسبوعي' : 'My Workout — Weekly Schedule'}
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
            {lang === 'ar'
              ? 'اختر أي يوم لعرض وتخصيص العضلات والتمارين، أو ابدأ التمرين بتاريخ اليوم الفعلي.'
              : 'Select any day to view or customize muscle groups and exercises, or start that workout today.'}
          </p>
        </div>

        <button
          onClick={resetScheduleToDefault}
          className={`self-start sm:self-auto px-3.5 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
            isDark
              ? 'bg-[#121721] border-[#1F2937] text-gray-300 hover:border-gray-600'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'استعادة الجدول الافتراضي' : 'Reset Default Plan'}</span>
        </button>
      </div>

      {/* PLANNING REFERENCE NOTICE */}
      <div
        className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
          isDark
            ? 'bg-emerald-500/5 border-emerald-500/20 text-gray-300'
            : 'bg-emerald-50 border-emerald-200 text-slate-700'
        }`}
      >
        <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-emerald-400">
            {lang === 'ar' ? 'ملاحظة هامة:' : 'Flexible Scheduling:'}
          </strong>{' '}
          {lang === 'ar'
            ? 'الجدول الأسبوعي هو مرجع تنظيمي فقط. إذا قمت بأداء تمرين الإثنين في يوم الثلاثاء، فسيتم حفظه تلقائياً بتاريخ الثلاثاء الفعلي.'
            : "This weekly schedule is a planning reference only. If you perform Monday's Back workout on Tuesday, it will always be recorded with Tuesday's actual date."}
        </div>
      </div>

      {/* 7-DAY WEEKLY SCHEDULE SELECTOR GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {weeklySchedule.map((dayItem) => {
          const isSelected = dayItem.day === selectedDay;
          const isToday = dayItem.day === todayMeta.dayOfWeek;

          return (
            <button
              key={dayItem.day}
              onClick={() => {
                setSelectedDay(dayItem.day);
                setIsEditingPlan(false);
              }}
              className={`p-3.5 rounded-xl border text-start transition-all flex flex-col justify-between min-h-[112px] cursor-pointer ${
                isSelected
                  ? isDark
                    ? 'bg-emerald-500/15 border-emerald-500 ring-1 ring-emerald-500/40'
                    : 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500/30'
                  : isDark
                  ? 'bg-[#121721] border-[#1F2937] hover:border-gray-600'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span
                  className={`text-xs font-display font-bold uppercase tracking-wider ${
                    isSelected
                      ? 'text-emerald-400'
                      : isDark
                      ? 'text-gray-400'
                      : 'text-slate-500'
                  }`}
                >
                  {translateDayName(dayItem.day, lang)}
                </span>
                {isToday && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950">
                    {lang === 'ar' ? 'اليوم' : 'Today'}
                  </span>
                )}
              </div>

              <div className="mt-2">
                <div
                  className={`font-display font-semibold text-xs sm:text-sm line-clamp-2 ${
                    dayItem.workoutType === 'rest'
                      ? 'text-gray-500 italic'
                      : dayItem.workoutType === 'cardio'
                      ? 'text-cyan-400'
                      : isDark
                      ? 'text-gray-100'
                      : 'text-slate-900'
                  }`}
                >
                  {dayItem.title}
                </div>
                <div
                  className={`text-[11px] mt-1 font-mono-num ${
                    isDark ? 'text-gray-500' : 'text-slate-400'
                  }`}
                >
                  {dayItem.workoutType === 'rest'
                    ? lang === 'ar'
                      ? 'استشفاء'
                      : 'Recovery'
                    : dayItem.workoutType === 'cardio'
                    ? lang === 'ar'
                      ? 'كارديو'
                      : '1h Cardio'
                    : `${dayItem.assignedExerciseIds.length} ${
                        lang === 'ar' ? 'تمارين' : 'exercises'
                      }`}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* SELECTED DAY DETAIL PANEL */}
      <div
        className={`rounded-2xl border p-5 sm:p-6 space-y-6 ${
          isDark ? 'bg-[#121721] border-[#1F2937]' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-inherit">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-lg text-xs font-display font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {translateDayName(currentDayPlan.day, lang)}
              </span>

              {currentDayPlan.workoutType === 'cardio' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  <Flame className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'جلسة كارديو' : 'Cardio Day'}</span>
                </span>
              )}

              {currentDayPlan.workoutType === 'rest' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-500/15 text-gray-400 border border-gray-500/30">
                  <Moon className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'يوم راحة مخطط' : 'Scheduled Rest Day'}</span>
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-display font-bold">
              {currentDayPlan.title}
            </h2>

            {currentDayPlan.notes && (
              <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                {currentDayPlan.notes}
              </p>
            )}

            {/* Assigned Muscle Groups */}
            {currentDayPlan.muscleGroups.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  {lang === 'ar' ? 'العضلات المستهدفة:' : 'Assigned Muscle Groups:'}
                </span>
                {currentDayPlan.muscleGroups.map((mg) => (
                  <span
                    key={mg}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                      isDark
                        ? 'bg-[#181F2C] border-[#2D3748] text-emerald-300'
                        : 'bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  >
                    {translateMuscleGroup(mg, lang)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={openEditDayModal}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[#181F2C] border-[#2D3748] text-gray-200 hover:border-gray-500'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'تعديل خطة اليوم' : 'Edit Day Plan'}</span>
            </button>

            <button
              onClick={handleStartSelectedDayWorkout}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {currentDayPlan.workoutType === 'rest'
                  ? lang === 'ar'
                    ? 'بدء تمرين في يوم الراحة'
                    : 'Start Workout Anyway'
                  : lang === 'ar'
                  ? `بدء تمرين ${translateDayName(currentDayPlan.day, lang)}`
                  : `Start ${currentDayPlan.day}'s Workout`}
              </span>
            </button>
          </div>
        </div>

        {/* EDIT DAY PLAN FORM (COLLAPSIBLE) */}
        {isEditingPlan && (
          <form
            onSubmit={handleSaveDayEdit}
            className={`p-4 sm:p-5 rounded-xl border space-y-4 ${
              isDark ? 'bg-[#181F2C] border-[#2D3748]' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-sm">
                {lang === 'ar'
                  ? `تعديل خطة يوم ${translateDayName(currentDayPlan.day, lang)}`
                  : `Customize ${currentDayPlan.day}'s Schedule`}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingPlan(false)}
                className="p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5">
                  {lang === 'ar' ? 'عنوان التمرين' : 'Workout Day Title'}
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g., Back + Biceps + Forearms"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-emerald-500 ${
                    isDark
                      ? 'bg-[#121721] border-[#2D3748] text-gray-100'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">
                  {lang === 'ar' ? 'نوع اليوم' : 'Day Type'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['strength', 'cardio', 'rest'] as const).map((tOpt) => (
                    <button
                      key={tOpt}
                      type="button"
                      onClick={() => setEditType(tOpt)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold capitalize border transition-all cursor-pointer ${
                        editType === tOpt
                          ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                          : isDark
                          ? 'bg-[#121721] border-[#2D3748] text-gray-300'
                          : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      {tOpt === 'strength'
                        ? lang === 'ar'
                          ? 'حديد'
                          : 'Strength'
                        : tOpt === 'cardio'
                        ? lang === 'ar'
                          ? 'كارديو'
                          : 'Cardio'
                        : lang === 'ar'
                        ? 'راحة'
                        : 'Rest'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {editType !== 'rest' && (
              <div>
                <label className="block text-xs font-medium mb-2">
                  {lang === 'ar' ? 'العضلات المستهدفة' : 'Assigned Muscle Groups'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {MUSCLE_GROUPS.map((mg) => {
                    const active = editMuscleGroups.includes(mg);
                    return (
                      <button
                        key={mg}
                        type="button"
                        onClick={() => toggleEditMuscleGroup(mg)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                          active
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-semibold'
                            : isDark
                            ? 'bg-[#121721] border-[#2D3748] text-gray-400'
                            : 'bg-white border-slate-300 text-slate-600'
                        }`}
                      >
                        {active && <Check className="w-3 h-3" />}
                        <span>{translateMuscleGroup(mg, lang)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5">
                {lang === 'ar' ? 'ملاحظات إضافية' : 'Day Notes (Optional)'}
              </label>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Optional planning notes..."
                className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none focus:border-emerald-500 ${
                  isDark
                    ? 'bg-[#121721] border-[#2D3748] text-gray-100'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingPlan(false)}
                className={`px-4 py-2 rounded-xl text-xs font-medium border cursor-pointer ${
                  isDark
                    ? 'bg-[#121721] border-[#2D3748] text-gray-300'
                    : 'bg-white border-slate-300 text-slate-700'
                }`}
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs cursor-pointer"
              >
                {lang === 'ar' ? 'حفظ التعديلات' : 'Save Day Plan'}
              </button>
            </div>
          </form>
        )}

        {/* ASSIGNED EXERCISES FOR SELECTED DAY */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-display font-bold">
                {lang === 'ar'
                  ? `التمارين المخصصة ليوم ${translateDayName(currentDayPlan.day, lang)} (${assignedExercises.length})`
                  : `Assigned Exercises for ${currentDayPlan.day} (${assignedExercises.length})`}
              </h3>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                {lang === 'ar'
                  ? 'سيتم تحميل هذه التمارين تلقائياً عند الضغط على "بدء تمرين" لهذا اليوم.'
                  : 'These exercises load automatically when you start this day’s workout.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setFilterMuscleGroup(
                    currentDayPlan.muscleGroups[0] || 'ALL'
                  );
                  setIsAddExerciseModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === 'ar' ? 'إضافة تمرين لليوم' : 'Add Exercise to Day'}</span>
              </button>

              <button
                onClick={() => setCurrentSection('exercises')}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-[#181F2C] border-[#2D3748] text-gray-300 hover:border-gray-600'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                {lang === 'ar' ? 'مكتبة التمارين' : 'Exercise Library'}
              </button>
            </div>
          </div>

          {assignedExercises.length === 0 ? (
            <div
              className={`p-8 rounded-xl border border-dashed text-center space-y-2 ${
                isDark
                  ? 'border-[#2D3748] text-gray-400'
                  : 'border-slate-300 text-slate-500'
              }`}
            >
              <Dumbbell className="w-6 h-6 mx-auto opacity-50" />
              <p className="text-sm font-medium">
                {currentDayPlan.workoutType === 'rest'
                  ? lang === 'ar'
                    ? 'يوم راحة — لا توجد تمارين مجدولة، ولكن يمكنك بدء تمرين في أي وقت.'
                    : 'Scheduled Rest Day — No exercises assigned, though you can still train anytime.'
                  : lang === 'ar'
                  ? 'لم يتم تعيين تمارين لهذا اليوم بعد.'
                  : 'No exercises assigned to this day yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {assignedExercises.map((ex, idx) => (
                <div
                  key={ex.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                    isDark
                      ? 'bg-[#181F2C]/80 border-[#1F2937]'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 font-mono-num text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-display font-semibold text-sm truncate">
                        {ex.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                        <span className="text-emerald-400 font-medium">
                          {translateMuscleGroup(ex.muscleGroup, lang)}
                        </span>
                        <span className={isDark ? 'text-gray-500' : 'text-slate-400'}>•</span>
                        <span className="font-mono-num uppercase text-gray-400">
                          {ex.defaultWeightUnit === 'none'
                            ? lang === 'ar'
                              ? 'وزن الجسم'
                              : 'Bodyweight'
                            : ex.defaultWeightUnit}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => removeExerciseFromDay(currentDayPlan.day, ex.id)}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
                      isDark
                        ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10'
                        : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                    }`}
                    title="Remove exercise from this day"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL TO ASSIGN EXERCISES TO SELECTED DAY */}
      {isAddExerciseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg rounded-2xl border p-5 space-y-4 max-h-[85vh] flex flex-col ${
              isDark ? 'bg-[#121721] border-[#2D3748]' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between border-b border-inherit pb-3">
              <div>
                <h3 className="font-display font-bold text-base">
                  {lang === 'ar'
                    ? `إضافة تمارين ليوم ${translateDayName(currentDayPlan.day, lang)}`
                    : `Assign Exercises to ${currentDayPlan.day}`}
                </h3>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  {lang === 'ar'
                    ? 'اختر التمارين من المكتبة لإضافتها لجدول هذا اليوم'
                    : 'Select exercises from your library to include in this day’s plan'}
                </p>
              </div>
              <button
                onClick={() => setIsAddExerciseModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Muscle group filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setFilterMuscleGroup('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 cursor-pointer ${
                  filterMuscleGroup === 'ALL'
                    ? 'bg-emerald-500 text-slate-950 font-semibold'
                    : isDark
                    ? 'bg-[#181F2C] text-gray-300'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {lang === 'ar' ? 'الكل' : 'All Groups'}
              </button>
              {MUSCLE_GROUPS.map((mg) => (
                <button
                  key={mg}
                  onClick={() => setFilterMuscleGroup(mg)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 cursor-pointer ${
                    filterMuscleGroup === mg
                      ? 'bg-emerald-500 text-slate-950 font-semibold'
                      : isDark
                      ? 'bg-[#181F2C] text-gray-300'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {translateMuscleGroup(mg, lang)}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {availableExercisesToAdd.length === 0 ? (
                <p className="text-center py-8 text-xs text-gray-400">
                  {lang === 'ar'
                    ? 'جميع التمارين في هذه الفئة مضافة بالفعل لهذا اليوم.'
                    : 'All exercises in this category are already assigned to this day.'}
                </p>
              ) : (
                availableExercisesToAdd.map((ex) => (
                  <div
                    key={ex.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      isDark
                        ? 'bg-[#181F2C] border-[#2D3748]'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-display font-semibold text-sm">{ex.name}</div>
                      <div className="text-xs text-emerald-400">
                        {translateMuscleGroup(ex.muscleGroup, lang)} •{' '}
                        <span className="font-mono-num uppercase text-gray-400">
                          {ex.defaultWeightUnit === 'none'
                            ? 'Bodyweight'
                            : ex.defaultWeightUnit}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => assignExerciseToDay(currentDayPlan.day, ex.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'إضافة' : 'Add'}</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-inherit flex justify-end">
              <button
                onClick={() => setIsAddExerciseModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-xs cursor-pointer"
              >
                {lang === 'ar' ? 'تم' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
