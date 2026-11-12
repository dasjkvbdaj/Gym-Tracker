import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  History,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useGym } from '../context/GymContext';
import { generateId } from '../database/db';
import { getLastPerformanceForExercise } from '../services/progressService';
import {
  ExerciseEntry,
  MuscleGroup,
  SetEntry,
  WeightUnit,
} from '../types/workout';
import {
  formatFullDate,
  formatShortDate,
  formatTimeFromTimestamp,
  getDateMetadata,
  toLocalDateString,
} from '../utils/dateUtils';
import {
  MUSCLE_GROUPS,
  translateDayName,
  translateMuscleGroup,
} from '../utils/i18n';
import { formatSetPerformance } from '../utils/unitConversion';

export const StartWorkout: React.FC = () => {
  const {
    activeWorkout,
    completedWorkouts,
    exercises,
    weeklySchedule,
    settings,
    startNewWorkout,
    updateActiveWorkout,
    finishActiveWorkout,
    cancelActiveWorkout,
    addExercise,
    setCurrentSection,
    showToast,
  } = useGym();

  const lang = settings.language;
  const isDark = settings.theme === 'dark';
  const todayStr = toLocalDateString(new Date());
  const todayMeta = getDateMetadata(todayStr);

  // حالة اختيار التمارين قبل بدء الـ Timer الفعلي للجلسة الجديدة
  const [selectedExerciseIdsForNewWorkout, setSelectedExerciseIdsForNewWorkout] = useState<string[]>([]);
  const [isSelectingExercises, setIsSelectingExercises] = useState(false);
  const [pendingWorkoutConfig, setPendingWorkoutConfig] = useState<{
    workoutType: 'strength' | 'cardio';
    title: string;
    muscleGroups: MuscleGroup[];
  } | null>(null);

  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [pickerMuscleFilter, setPickerMuscleFilter] = useState<MuscleGroup | 'ALL'>('ALL');
  const [pickerSearch, setPickerSearch] = useState('');
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  const [showQuickCreateEx, setShowQuickCreateEx] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExMuscle, setNewExMuscle] = useState<MuscleGroup>('Back');

  const isCardioExercise = (entry: ExerciseEntry) => {
    return (
      entry.muscleGroup === 'Cardio' ||
      entry.exerciseNameSnapshot.toLowerCase().includes('cardio') ||
      entry.exerciseNameSnapshot.toLowerCase().includes('treadmill') ||
      entry.exerciseNameSnapshot.toLowerCase().includes('elliptical') ||
      entry.exerciseNameSnapshot.toLowerCase().includes('bike') ||
      entry.exerciseNameSnapshot.toLowerCase().includes('stair') ||
      entry.exerciseNameSnapshot.toLowerCase().includes('rowing') ||
      entry.exerciseNameSnapshot.toLowerCase().includes('running')
    );
  };

  const handleDateChange = async (newDateStr: string) => {
    if (!activeWorkout || !newDateStr) return;
    await updateActiveWorkout({
      ...activeWorkout,
      actualDate: newDateStr,
    });
  };

  const handleTitleChange = async (newTitle: string) => {
    if (!activeWorkout) return;
    await updateActiveWorkout({
      ...activeWorkout,
      title: newTitle,
    });
  };

  const handleToggleWorkoutMuscleGroup = async (mg: MuscleGroup) => {
    if (!activeWorkout) return;
    const exists = activeWorkout.muscleGroups.includes(mg);
    const updatedGroups = exists
      ? activeWorkout.muscleGroups.filter((m) => m !== mg)
      : [...activeWorkout.muscleGroups, mg];

    await updateActiveWorkout({
      ...activeWorkout,
      muscleGroups: updatedGroups.length > 0 ? updatedGroups : [mg],
    });
  };

  const handleAddExerciseToSession = async (exerciseId: string) => {
    if (!activeWorkout) return;
    const libEx = exercises.find((e) => e.id === exerciseId);
    if (!libEx) return;

    const lastPerf = getLastPerformanceForExercise(libEx.id, completedWorkouts);
    const initialUnit: WeightUnit = libEx.isBodyweight ? 'none' : lastPerf ? lastPerf.weightType : libEx.defaultWeightUnit || settings.preferredWeightUnit;
    const isCardio = libEx.muscleGroup === 'Cardio' || libEx.name.toLowerCase().includes('treadmill') || libEx.name.toLowerCase().includes('elliptical') || libEx.name.toLowerCase().includes('bike') || libEx.name.toLowerCase().includes('running') || libEx.name.toLowerCase().includes('cardio');
    const defaultFirstWeight = isCardio ? null : initialUnit === 'none' ? null : lastPerf && lastPerf.bestSet && lastPerf.bestSet.weight !== null ? lastPerf.bestSet.weight : 0;
    const defaultFirstReps = isCardio ? 30 : lastPerf && lastPerf.bestSet ? lastPerf.bestSet.reps : 10;
    
    const newEntry: ExerciseEntry = {
      id: generateId('ex_entry'),
      exerciseId: libEx.id,
      exerciseNameSnapshot: libEx.name,
      muscleGroup: libEx.muscleGroup,
      weightType: isCardio ? 'none' : initialUnit,
      sets: [
        {
          id: generateId('set'),
          setNumber: 1,
          weight: defaultFirstWeight,
          reps: defaultFirstReps,
          completed: false,
        },
      ],
      caloriesBurned: isCardio ? 0 : undefined,
      notes: '',
    };

    const updatedGroups = activeWorkout.muscleGroups.includes(libEx.muscleGroup)
      ? activeWorkout.muscleGroups
      : [...activeWorkout.muscleGroups, libEx.muscleGroup];

    await updateActiveWorkout({
      ...activeWorkout,
      muscleGroups: updatedGroups,
      exercises: [...activeWorkout.exercises, newEntry],
    });

    showToast(
      lang === 'ar' ? `تمت إضافة "${libEx.name}" للتمرين` : `Added "${libEx.name}" to workout`,
      'success'
    );
  };

  const handleQuickCreateAndAddExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExName.trim()) return;

    const created = await addExercise({
      name: newExName.trim(),
      muscleGroup: newExMuscle,
    });
    await handleAddExerciseToSession(created.id);
    setNewExName('');
    setShowQuickCreateEx(false);
  };

  const handleRemoveExerciseEntry = async (entryId: string) => {
    if (!activeWorkout) return;
    await updateActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.filter((e) => e.id !== entryId),
    });
  };

  const handleExerciseUnitChange = async (
    entryId: string,
    newUnit: WeightUnit
  ) => {
    if (!activeWorkout) return;

    const updatedExercises = activeWorkout.exercises.map((entry) => {
      if (entry.id !== entryId) return entry;
      const updatedSets = entry.sets.map((s) => ({
        ...s,
        weight: newUnit === 'none' ? null : s.weight ?? 0,
      }));
      return {
        ...entry,
        weightType: newUnit,
        sets: updatedSets,
      };
    });
    await updateActiveWorkout({ ...activeWorkout, exercises: updatedExercises });
  };

  const handleUpdateCalories = async (entryId: string, calories: number) => {
    if (!activeWorkout) return;
    const updatedExercises = activeWorkout.exercises.map((entry) => {
      if (entry.id !== entryId) return entry;
      return { ...entry, caloriesBurned: Math.max(0, calories) };
    });
    await updateActiveWorkout({ ...activeWorkout, exercises: updatedExercises });
  };

  const handleAddSet = async (entryId: string) => {
    if (!activeWorkout) return;

    const updatedExercises = activeWorkout.exercises.map((entry) => {
      if (entry.id !== entryId) return entry;
      const prevSet = entry.sets[entry.sets.length - 1];
      const nextSetNumber = entry.sets.length + 1;
      const newSet: SetEntry = {
        id: generateId('set'),
        setNumber: nextSetNumber,
        weight: entry.weightType === 'none' ? null : prevSet && prevSet.weight !== null ? prevSet.weight : 0,
        reps: prevSet ? prevSet.reps : 10,
        completed: false,
      };
      return { ...entry, sets: [...entry.sets, newSet] };
    });
    await updateActiveWorkout({ ...activeWorkout, exercises: updatedExercises });
  };

  const handleRemoveSet = async (entryId: string, setId: string) => {
    if (!activeWorkout) return;

    const updatedExercises = activeWorkout.exercises.map((entry) => {
      if (entry.id !== entryId) return entry;
      const filtered = entry.sets.filter((s) => s.id !== setId);
      const renumbered = filtered.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
      return { ...entry, sets: renumbered };
    });
    await updateActiveWorkout({ ...activeWorkout, exercises: updatedExercises });
  };

  const handleUpdateSet = async (
    entryId: string,
    setId: string,
    field: 'weight' | 'reps' | 'completed',
    value: number | boolean | null
  ) => {
    if (!activeWorkout) return;

    const updatedExercises = activeWorkout.exercises.map((entry) => {
      if (entry.id !== entryId) return entry;
      const updatedSets = entry.sets.map((s) => {
        if (s.id !== setId) return s;
        if (field === 'weight') {
          const safeWeight = entry.weightType === 'none' ? null : value === null ? 0 : Math.max(0, Number(value));
          return { ...s, weight: safeWeight };
        }
        if (field === 'reps') {
          const safeReps = Math.max(0, Math.round(Number(value || 0)));
          return { ...s, reps: safeReps };
        }
        if (field === 'completed') {
          return { ...s, completed: Boolean(value) };
        }
        return s;
      });
      return { ...entry, sets: updatedSets };
    });
    await updateActiveWorkout({ ...activeWorkout, exercises: updatedExercises });
  };

  const handleFinishSession = async () => {
    if (!activeWorkout) return;

    if (activeWorkout.exercises.length === 0) {
      showToast(
        lang === 'ar' ? 'يرجى إضافة تمرين واحد على الأقل قبل إنهاء الجلسة.' : 'Please add at least one exercise before finishing the workout.',
        'error'
      );
      return;
    }
    await finishActiveWorkout();
    setCurrentSection('dashboard');
  };

  const filteredLibraryExercises = useMemo(() => {
    return exercises.filter((ex) => {
      if (pickerMuscleFilter !== 'ALL' && ex.muscleGroup !== pickerMuscleFilter) {
        return false;
      }
      if (pickerSearch.trim() && !ex.name.toLowerCase().includes(pickerSearch.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [exercises, pickerMuscleFilter, pickerSearch]);

  // بدء عملية اختيار التمارين قبل تفعيل الجلسة والمؤقت
  const handleInitiateWorkoutSetup = (dayPlan?: {
    workoutType: string;
    title: string;
    muscleGroups: MuscleGroup[];
    assignedExerciseIds: string[];
  }) => {
    const config = {
      workoutType: dayPlan?.workoutType === 'cardio' ? ('cardio' as const) : ('strength' as const),
      title: dayPlan ? dayPlan.title : (lang === 'ar' ? 'تمرين حر جديد' : 'Custom Workout'),
      muscleGroups: dayPlan?.muscleGroups && dayPlan.muscleGroups.length > 0 ? dayPlan.muscleGroups : (['Back'] as MuscleGroup[]),
    };
    
    setPendingWorkoutConfig(config);
    // افتراضياً نبدأ باختيار التمارين المقترحة في الجدول أو فارغة لكي تنتقي ما تريده
    setSelectedExerciseIdsForNewWorkout(dayPlan?.assignedExerciseIds || []);
    setIsSelectingExercises(true);
  };

  // تأكيد التمارين المختارة وبدء الجلسة والمؤقت الفعلي
  const handleConfirmAndStartWorkout = async () => {
    if (!pendingWorkoutConfig) return;

    await startNewWorkout({
      workoutType: pendingWorkoutConfig.workoutType,
      title: pendingWorkoutConfig.title,
      muscleGroups: pendingWorkoutConfig.muscleGroups,
      exerciseIds: selectedExerciseIdsForNewWorkout, // التمارين التي حددتها أنت فقط لهذا اليوم بالذات
      actualDate: todayStr,
    });

    setIsSelectingExercises(false);
    setPendingWorkoutConfig(null);
  };

  // شاشة نافذة اختيار وتخصيص تمارين اليوم قبل بدء الـ Timer
  if (isSelectingExercises) {
    return (
      <div className="space-y-6 pb-24 max-w-2xl mx-auto">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="font-display font-extrabold text-xl sm:text-2xl tracking-tight">
              {lang === 'ar' ? 'تحديد تمارين هذا اليوم' : 'Select Exercises for Today'}
            </h1>
            <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              {lang === 'ar' 
                ? 'اختر الحركات والعضلات التي ستلعبها اليوم بدقة قبل بدء المؤقت وتتبع المجموعات.' 
                : 'Choose the exact exercises you want to perform today before starting the live timer.'}
            </p>
          </div>
          <button
            onClick={() => setIsSelectingExercises(false)}
            className="p-2 rounded-xl hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* فلاتر واختيار التمارين المتاحة */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-gray-400" />
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder={lang === 'ar' ? 'بحث عن تمرين في المكتبة...' : 'Search exercise in library...'}
                className={`w-full ps-9 pe-3 py-2 rounded-xl text-xs sm:text-sm border focus:outline-none ${
                  isDark
                    ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-100'
                    : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,85%)] text-slate-900'
                }`}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowQuickCreateEx(!showQuickCreateEx)}
              className="px-3.5 py-2 rounded-xl bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)] border border-[hsl(75,92%,56%)]/30 text-xs font-semibold shrink-0 cursor-pointer"
            >
              {showQuickCreateEx ? (lang === 'ar' ? 'إخفاء' : 'Hide') : (lang === 'ar' ? '+ تمرين جديد' : '+ New')}
            </button>
          </div>

          {showQuickCreateEx && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newExName.trim()) return;
                const created = await addExercise({
                  name: newExName.trim(),
                  muscleGroup: newExMuscle,
                });
                setSelectedExerciseIdsForNewWorkout((prev) => [...prev, created.id]);
                setNewExName('');
                setShowQuickCreateEx(false);
              }}
              className={`p-3.5 rounded-xl border space-y-3 ${
                isDark ? 'bg-[hsl(240,5%,11%)] border-[hsl(75,92%,56%)]/40' : 'bg-[hsl(76,78%,42%)]/5 border-[hsl(76,78%,42%)]/30'
              }`}
            >
              <div className={`text-xs font-bold ${isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'}`}>
                {lang === 'ar' ? 'إنشاء تمرين مخصص جديد' : 'Create Custom Exercise'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  value={newExName}
                  onChange={(e) => setNewExName(e.target.value)}
                  placeholder={lang === 'ar' ? 'اسم التمرين...' : 'Exercise name...'}
                  className={`sm:col-span-2 px-3 py-2 rounded-lg text-xs border ${
                    isDark ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)] text-white' : 'bg-white border-[hsl(40,10%,85%)] text-slate-900'
                  }`}
                />
                <select
                  value={newExMuscle}
                  onChange={(e) => setNewExMuscle(e.target.value as MuscleGroup)}
                  className={`px-2 py-2 rounded-lg text-xs border ${
                    isDark ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)] text-white' : 'bg-white border-[hsl(40,10%,85%)] text-slate-900'
                  }`}
                >
                  {MUSCLE_GROUPS.map((mg) => (
                    <option key={mg} value={mg}>{translateMuscleGroup(mg, lang)}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className={`px-4 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                    isDark ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)]' : 'bg-[hsl(76,78%,42%)] text-white'
                  }`}
                >
                  {lang === 'ar' ? 'إضافة وتحديد' : 'Create & Select'}
                </button>
              </div>
            </form>
          )}

          {/* فلاتر العضلات */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setPickerMuscleFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
                pickerMuscleFilter === 'ALL'
                  ? isDark ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)]' : 'bg-[hsl(76,78%,42%)] text-white'
                  : isDark ? 'bg-[hsl(240,5%,11%)] text-gray-300' : 'bg-[hsl(40,15%,94%)] text-slate-700'
              }`}
            >
              {lang === 'ar' ? 'الكل' : 'All'}
            </button>
            {MUSCLE_GROUPS.map((mg) => (
              <button
                key={mg}
                onClick={() => setPickerMuscleFilter(mg)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
                  pickerMuscleFilter === mg
                    ? isDark ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)]' : 'bg-[hsl(76,78%,42%)] text-white'
                    : isDark ? 'bg-[hsl(240,5%,11%)] text-gray-300' : 'bg-[hsl(40,15%,94%)] text-slate-700'
                }`}
              >
                {translateMuscleGroup(mg, lang)}
              </button>
            ))}
          </div>

          {/* قائمة التمارين للاختيار منها */}
          <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
            {filteredLibraryExercises.map((ex) => {
              const isSelected = selectedExerciseIdsForNewWorkout.includes(ex.id);
              return (
                <div
                  key={ex.id}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedExerciseIdsForNewWorkout((prev) => prev.filter((id) => id !== ex.id));
                    } else {
                      setSelectedExerciseIdsForNewWorkout((prev) => [...prev, ex.id]);
                    }
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? isDark
                        ? 'bg-[hsl(75,92%,56%)]/15 border-[hsl(75,92%,56%)]'
                        : 'bg-[hsl(76,78%,42%)]/10 border-[hsl(76,78%,42%)]'
                      : isDark
                      ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] hover:border-gray-600'
                      : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,88%)] hover:border-slate-400'
                  }`}
                >
                  <div>
                    <div className="font-display font-semibold text-sm">{ex.name}</div>
                    <div className={`text-xs ${isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'}`}>
                      {translateMuscleGroup(ex.muscleGroup, lang)}
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center border ${
                    isSelected 
                      ? isDark ? 'bg-[hsl(75,92%,56%)] text-slate-950 border-[hsl(75,92%,56%)]' : 'bg-[hsl(76,78%,42%)] text-white border-[hsl(76,78%,42%)]'
                      : 'border-gray-500'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* زر التأكيد وبدء المؤقت والجلسة الفعلية */}
          <div className="pt-3 border-t flex items-center justify-between">
            <span className="text-xs font-mono-num text-gray-400">
              {selectedExerciseIdsForNewWorkout.length} {lang === 'ar' ? 'تمارين مختارة لهذا اليوم' : 'exercises selected'}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setIsSelectingExercises(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium border"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmAndStartWorkout}
                className={`px-6 py-2.5 rounded-xl font-display font-bold text-xs flex items-center gap-2 cursor-pointer ${
                  isDark ? 'bg-[hsl(75,92%,56%)] text-slate-950' : 'bg-[hsl(76,78%,42%)] text-white'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{lang === 'ar' ? 'تأكيد وبدء المؤقت والتمارين' : 'Confirm & Start Timer'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // الواجهة الافتتاحية لاختيار الخطة عند عدم وجود جلسة نشطة قيد التشغيل
  if (!activeWorkout) {
    return (
      <div className="space-y-6 pb-24">
        <div className="space-y-1">
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight">
            {lang === 'ar' ? 'بدء وتسجيل تمرين جديد' : 'Start a New Workout'}
          </h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
            {lang === 'ar'
              ? 'اختر اليوم أو خطة الجدول لتبدأ بتحديد تمارينك الخاصة لهذه الجلسة.'
              : 'Choose a day or schedule plan to select your custom exercises for this session.'}
          </p>
        </div>

        <div className={`p-4 sm:p-5 rounded-2xl border ${
          isDark ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]' : 'bg-[hsl(0,0%,100%)] border-[hsl(40,10%,88%)] shadow-xs'
        }`}>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-2">
            <CalendarIcon className="w-4 h-4" />
            <span>{lang === 'ar' ? 'التاريخ المحلي اليوم' : 'Automatic Local Date'}</span>
          </div>
          <div className="font-display font-bold text-base sm:text-lg">
            {formatFullDate(todayStr, lang)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {weeklySchedule.map((dayPlan) => {
            const isTodayPlan = dayPlan.day === todayMeta.dayOfWeek;
            return (
              <div
                key={dayPlan.day}
                className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all ${
                  isTodayPlan
                    ? isDark
                      ? 'bg-[hsl(75,92%,56%)]/10 border-[hsl(75,92%,56%)]/50 ring-1 ring-[hsl(75,92%,56%)]/30'
                      : 'bg-[hsl(76,78%,42%)]/10 border-[hsl(76,78%,42%)]/50'
                    : isDark
                    ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
                    : 'bg-[hsl(0,0%,100%)] border-[hsl(40,10%,88%)] shadow-2xs'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-display font-bold uppercase tracking-wider ${
                      isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
                    }`}>
                      {translateDayName(dayPlan.day, lang)}
                    </span>
                    {isTodayPlan && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isDark ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)]' : 'bg-[hsl(76,78%,42%)] text-white'
                      }`}>
                        {lang === 'ar' ? 'خطة اليوم المقترحة' : 'Suggested Today'}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-display font-bold">
                    {dayPlan.title}
                  </h3>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-inherit">
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                    {dayPlan.workoutType === 'rest'
                      ? (lang === 'ar' ? 'يوم راحة' : 'Rest day')
                      : (lang === 'ar' ? 'انقر لاختيار تمارين اليوم' : 'Click to pick exercises')}
                  </span>
                  <button
                    onClick={() => handleInitiateWorkoutSetup(dayPlan)}
                    className={`px-4 py-2 rounded-xl font-display font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      isDark
                        ? 'bg-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,50%)] text-[hsl(240,10%,9%)]'
                        : 'bg-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,37%)] text-white'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{lang === 'ar' ? 'اختيار تمارين وبدء' : 'Pick & Start'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // الشاشة النشطة بعد بدء الجلسة الفعلية وتشغيل المؤقت وتتبع المجموعات (تبقى كما هي تماماً دون تغيير)
  const totalCompletedSets = activeWorkout.exercises.reduce(
    (sum, ex) => sum + ex.sets.length,
    0
  );

  const totalSessionCalories = activeWorkout.exercises.reduce(
    (sum, ex) => sum + (ex.caloriesBurned || 0),
    0
  );

  return (
    <div className="space-y-6 pb-28">
      {/* هيدر الجلسة النشطة والمؤقت */}
      <div
        className={`rounded-2xl p-4 sm:p-5 border shadow-lg ${
          isDark
            ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(75,92%,56%)]/40'
            : 'bg-[hsl(0,0%,100%)] border-[hsl(76,78%,42%)]/50 shadow-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-inherit">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                  isDark
                    ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)] border-[hsl(75,92%,56%)]/30'
                    : 'bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)] border-[hsl(76,78%,42%)]/30'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full animate-ping ${
                    isDark ? 'bg-[hsl(75,92%,56%)]' : 'bg-[hsl(76,78%,42%)]'
                  }`}
                />
                {lang === 'ar' ? 'جلسة نشطة قيد التشغيل (الـ Timer يعمل)' : 'LIVE SESSION • TIMER RUNNING'}
              </span>
              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                {lang === 'ar' ? 'البدء:' : 'Started:'}{' '}
                {formatTimeFromTimestamp(activeWorkout.startTimestamp, lang)}
              </span>
            </div>

            <input
              type="text"
              value={activeWorkout.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              aria-label="Workout Title"
              className={`w-full max-w-xl font-display font-bold text-xl sm:text-2xl bg-transparent border-b border-transparent focus:border-[hsl(75,92%,56%)] focus:outline-none pb-0.5 ${
                isDark ? 'text-white' : 'text-[hsl(240,10%,9%)]'
              }`}
            />
          </div>

          <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
            <button
              onClick={() => setIsCancelConfirmOpen(true)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[hsl(240,5%,11%)] border-red-500/30 text-red-400 hover:bg-red-500/10'
                  : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
              }`}
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={handleFinishSession}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                isDark
                  ? 'bg-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,50%)] text-[hsl(240,10%,9%)] shadow-[hsl(75,92%,56%)]/20'
                  : 'bg-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,37%)] text-white shadow-[hsl(76,78%,42%)]/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إنهاء وحفظ التمرين' : 'Finish Workout'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* قائمة التمارين والمجموعات النشطة */}
      <div className="space-y-6">
        {(() => {
          const groups = new Map<MuscleGroup, ExerciseEntry[]>();
          for (const entry of activeWorkout.exercises) {
            if (!groups.has(entry.muscleGroup)) {
              groups.set(entry.muscleGroup, []);
            }
            groups.get(entry.muscleGroup)!.push(entry);
          }
          const groupEntries = [...groups.entries()];

          if (groupEntries.length === 0) {
            return (
              <div
                className={`p-10 rounded-2xl border border-dashed text-center space-y-3 ${
                  isDark ? 'border-[hsl(240,4%,19%)] bg-[hsl(240,5%,7.5%)] text-gray-400' : 'border-[hsl(40,10%,85%)] bg-white text-slate-500'
                }`}
              >
                <p className="text-sm font-medium">
                  {lang === 'ar'
                    ? 'لم تقم بإضافة أي تمارين لهذه الجلسة بعد. اضغط على الزر أدناه لإضافة تمارينك.'
                    : 'No exercises added to this session yet. Click below to add exercises.'}
                </p>
              </div>
            );
          }

          return groupEntries.map(([muscleGroup, groupExercises], groupIdx) => (
            <div key={muscleGroup}>
              {groupIdx > 0 && <hr className={`mb-6 ${isDark ? 'border-[hsl(240,4%,19%)]' : 'border-[hsl(40,10%,88%)]'}`} />}
              <div className="flex items-center gap-3 mb-4">
                <h2 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  {translateMuscleGroup(muscleGroup, lang)}
                </h2>
                <div className={`flex-1 h-px ${isDark ? 'bg-[hsl(240,4%,19%)]/50' : 'bg-[hsl(40,10%,88%)]'}`} />
              </div>

              <div className="space-y-4">
                {groupExercises.map((entry) => {
                  const isCardio = isCardioExercise(entry);
                  const lastPerf = getLastPerformanceForExercise(entry.exerciseId, completedWorkouts);

                  return (
                    <div
                      key={entry.id}
                      className={`rounded-2xl border p-4 sm:p-5 space-y-4 transition-all ${
                        isDark ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]' : 'bg-[hsl(0,0%,100%)] border-[hsl(40,10%,88%)] shadow-xs'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-inherit">
                        <div className="space-y-1">
                          <h3 className="font-display font-bold text-base sm:text-lg">
                            {entry.exerciseNameSnapshot}
                          </h3>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2">
                          {!isCardio && (
                            <div className={`inline-flex rounded-xl p-1 border ${
                              isDark ? 'bg-[hsl(240,6%,4%)] border-[hsl(240,4%,19%)]' : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,88%)]'
                            }`}>
                              {(['kg', 'lbs', 'none'] as const).map((u) => {
                                const isSelected = entry.weightType === u;
                                return (
                                  <button
                                    key={u}
                                    type="button"
                                    onClick={() => handleExerciseUnitChange(entry.id, u)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-mono-num font-bold transition-all cursor-pointer ${
                                      isSelected
                                        ? isDark ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)] shadow-xs' : 'bg-[hsl(76,78%,42%)] text-white shadow-xs'
                                        : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    {u === 'none' ? (lang === 'ar' ? 'وزن الجسم' : 'BW') : u.toUpperCase()}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveExerciseEntry(entry.id)}
                            className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* مجموعات العدات والأوزان */}
                      <div className="space-y-2">
                        {entry.sets.map((setItem) => (
                          <div
                            key={setItem.id}
                            className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl border ${
                              setItem.completed
                                ? isDark ? 'bg-[hsl(75,92%,56%)]/10 border-[hsl(75,92%,56%)]/30' : 'bg-[hsl(76,78%,42%)]/10 border-[hsl(76,78%,42%)]/30'
                                : isDark ? 'bg-[hsl(240,5%,11%)]/80 border-[hsl(240,4%,19%)]' : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,88%)]'
                            }`}
                          >
                            <div className="col-span-2 sm:col-span-1 flex justify-center">
                              <span className={`w-7 h-7 rounded-lg font-mono-num text-xs font-bold flex items-center justify-center ${
                                isDark ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)]' : 'bg-[hsl(76,78%,42%)]/15 text-[hsl(76,78%,42%)]'
                              }`}>
                                {setItem.setNumber}
                              </span>
                            </div>
                            <div className="col-span-4 sm:col-span-5">
                              {entry.weightType === 'none' ? (
                                <div className="h-11 px-3 rounded-xl border flex items-center justify-center text-xs font-semibold">
                                  {lang === 'ar' ? 'وزن الجسم' : 'Bodyweight'}
                                </div>
                              ) : (
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  value={setItem.weight ?? ''}
                                  onChange={(e) => handleUpdateSet(entry.id, setItem.id, 'weight', e.target.value === '' ? 0 : Number(e.target.value))}
                                  className={`w-full h-11 px-3 rounded-xl font-mono-num text-base font-bold border focus:outline-none ${
                                    isDark ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)] text-white' : 'bg-white border-[hsl(40,10%,85%)] text-slate-900'
                                  }`}
                                />
                              )}
                            </div>
                            <div className="col-span-4 sm:col-span-4">
                              <input
                                type="number"
                                inputMode="numeric"
                                value={setItem.reps}
                                onChange={(e) => handleUpdateSet(entry.id, setItem.id, 'reps', e.target.value === '' ? 0 : Number(e.target.value))}
                                className={`w-full h-11 px-3 rounded-xl font-mono-num text-base font-bold border focus:outline-none ${
                                  isDark ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)] text-white' : 'bg-white border-[hsl(40,10%,85%)] text-slate-900'
                                }`}
                              />
                            </div>
                            <div className="col-span-2 flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateSet(entry.id, setItem.id, 'completed', !setItem.completed)}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center border cursor-pointer ${
                                  setItem.completed
                                    ? isDark ? 'bg-[hsl(75,92%,56%)] text-slate-950 border-[hsl(75,92%,56%)]' : 'bg-[hsl(76,78%,42%)] text-white border-[hsl(76,78%,42%)]'
                                    : 'border-gray-500 text-gray-400'
                                }`}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => handleAddSet(entry.id)}
                            className={`py-2 px-4 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer ${
                              isDark ? 'bg-[hsl(240,5%,11%)] border-[hsl(75,92%,56%)]/40 text-[hsl(75,92%,56%)]' : 'bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)]'
                            }`}
                          >
                            <Plus className="w-4 h-4" />
                            <span>{lang === 'ar' ? 'إضافة مجموعة' : 'Add Set'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ));
        })()}

        <button
          type="button"
          onClick={() => setIsAddExerciseOpen(true)}
          className={`w-full py-3.5 px-5 rounded-2xl border-2 border-dashed font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer ${
            isDark ? 'border-[hsl(75,92%,56%)]/40 bg-[hsl(75,92%,56%)]/5 text-[hsl(75,92%,56%)]' : 'border-[hsl(76,78%,42%)]/40 bg-[hsl(76,78%,42%)]/5 text-[hsl(76,78%,42%)]'
          }`}
        >
          <Plus className="w-5 h-5" />
          <span>{lang === 'ar' ? 'إضافة تمرين آخر لهذه الجلسة' : 'Add Another Exercise to Session'}</span>
        </button>
      </div>

      {/* نافذة إضافة تمرين إضافي أثناء التمرين الحي */}
      {isAddExerciseOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-xl rounded-2xl border p-5 space-y-4 max-h-[85vh] flex flex-col ${
            isDark ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)]' : 'bg-white border-[hsl(40,10%,88%)]'
          }`}>
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-display font-bold text-base">
                {lang === 'ar' ? 'إضافة تمرين إضافي للجلسة' : 'Add Exercise to Session'}
              </h3>
              <button onClick={() => setIsAddExerciseOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {exercises.map((ex) => (
                <div
                  key={ex.id}
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    isDark ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)]' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm">{ex.name}</div>
                    <div className="text-xs text-gray-400">{translateMuscleGroup(ex.muscleGroup, lang)}</div>
                  </div>
                  <button
                    onClick={() => {
                      handleAddExerciseToSession(ex.id);
                      setIsAddExerciseOpen(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-semibold text-xs cursor-pointer ${
                      isDark ? 'bg-[hsl(75,92%,56%)] text-slate-950' : 'bg-[hsl(76,78%,42%)] text-white'
                    }`}
                  >
                    {lang === 'ar' ? 'إضافة' : 'Add'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
