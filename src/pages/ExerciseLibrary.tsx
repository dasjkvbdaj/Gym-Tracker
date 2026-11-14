import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Dumbbell,
  Edit3,
  History,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  X,
  Copy, // <-- أضيفت أيقونة النسخ
  Check, // <-- أيقونة التأكيد عند النسخ
} from 'lucide-react';
import { useGym } from '../context/GymContext';
import {
  Exercise,
  MuscleGroup,
  WeightUnit,
} from '../types/workout';
import {
  formatFullDate,
} from '../utils/dateUtils';
import {
  MUSCLE_GROUPS,
  translateDayName,
  translateMuscleGroup,
} from '../utils/i18n';
import { formatSetPerformance } from '../utils/unitConversion';

export const ExerciseLibrary: React.FC = () => {
  const {
    exercises,
    completedWorkouts,
    weeklySchedule,
    settings,
    addExercise,
    updateExercise,
    deleteExercise,
    openProgressForExercise,
    saveHistoricalWorkout,
  } = useGym();

  const lang = settings.language;
  const isDark = settings.theme === 'dark';

  const [selectedCategory, setSelectedCategory] = useState<MuscleGroup | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false); // <-- حالة للتحكم برسالة النسخ

  // Add / Edit Exercise Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [formName, setFormName] = useState('');
  const [formMuscleGroup, setFormMuscleGroup] = useState<MuscleGroup>('Back');

  // Exercise History & Day Assignment Modal
  const [historyModalExercise, setHistoryModalExercise] = useState<Exercise | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      if (selectedCategory !== 'ALL' && ex.muscleGroup !== selectedCategory) {
        return false;
      }
      if (
        searchQuery.trim() &&
        !ex.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) &&
        !ex.muscleGroup.toLowerCase().includes(searchQuery.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [exercises, selectedCategory, searchQuery]);

  // Count how many times each exercise was performed in completed workouts
  const exerciseSessionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of completedWorkouts) {
      for (const entry of w.exercises || []) {
        counts.set(entry.exerciseId, (counts.get(entry.exerciseId) || 0) + 1);
      }
    }
    return counts;
  }, [completedWorkouts]);

  // دالة نسخ أسماء التمارين الحالية (المفلترة أو كل المكتبة بناءً على المعروض)
  const handleCopyExerciseNames = () => {
    const namesText = filteredExercises.map((ex) => ex.name).join('\n');
    navigator.clipboard.writeText(namesText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const openAddModal = () => {
    setEditingExercise(null);
    setFormName('');
    setFormMuscleGroup(selectedCategory === 'ALL' ? 'Back' : selectedCategory);
    setIsFormOpen(true);
  };

  const openEditModal = (ex: Exercise) => {
    setEditingExercise(ex);
    setFormName(ex.name);
    setFormMuscleGroup(ex.muscleGroup);
    setIsFormOpen(true);
  };

  const handleSaveExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formName.trim();
    if (!trimmedName) return;

    if (editingExercise) {
      await updateExercise({
        ...editingExercise,
        name: trimmedName,
        muscleGroup: formMuscleGroup,
      });

      if (editingExercise.name !== trimmedName) {
        const workoutsToUpdate = completedWorkouts.filter((workout) =>
          workout.exercises.some((ex) => ex.exerciseId === editingExercise.id)
        );

        for (const workout of workoutsToUpdate) {
          const updatedWorkout = {
            ...workout,
            exercises: workout.exercises.map((ex) =>
              ex.exerciseId === editingExercise.id
                ? { ...ex, exerciseNameSnapshot: trimmedName }
                : ex
            ),
          };
          await saveHistoricalWorkout(updatedWorkout);
        }
      }
    } else {
      await addExercise({
        name: trimmedName,
        muscleGroup: formMuscleGroup,
      });
    }
    setIsFormOpen(false);
  };

  const selectedExerciseHistory = useMemo(() => {
    if (!historyModalExercise) return [];
    const logs: {
      workoutId: string;
      actualDate: string;
      workoutTitle: string;
      weightType: WeightUnit;
      sets: { setNumber: number; weight: number | null; reps: number }[];
      notes: string;
    }[] = [];

    for (const w of completedWorkouts) {
      for (const entry of w.exercises || []) {
        if (entry.exerciseId === historyModalExercise.id) {
          logs.push({
            workoutId: w.id,
            actualDate: w.actualDate,
            workoutTitle: w.title,
            weightType: entry.weightType,
            sets: entry.sets || [],
            notes: entry.notes || '',
          });
        }
      }
    }
    return logs;
  }, [historyModalExercise, completedWorkouts]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
            {lang === 'ar' ? 'مكتبة التمارين الشاملة' : 'Exercise Library'}
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
            {lang === 'ar'
              ? 'إدارة تمارينك حسب الفئات العضلية بسهولة.'
              : 'Organize and manage exercises by muscle group.'}
          </p>
        </div>
        
        {/* أزرار الإجراءات في رأس الصفحة موزعة بـ space-between */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleCopyExerciseNames}
            className={`px-4 py-2.5 rounded-xl font-display font-bold text-sm flex items-center gap-2 border transition-all cursor-pointer ${
              isDark
                ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-200 hover:bg-[hsl(240,5%,15%)]'
                : 'bg-white border-[hsl(40,10%,88%)] text-slate-700 hover:bg-gray-50'
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            <span>
              {copied
                ? lang === 'ar' ? 'تم النسخ!' : 'Copied!'
                : lang === 'ar' ? 'نسخ الأسماء' : 'Copy Names'}
            </span>
          </button>

          <button
            onClick={openAddModal}
            className={`px-4 py-2.5 rounded-xl font-display font-bold text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
              isDark
                ? 'bg-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,62%)] text-[hsl(240,6%,4%)] shadow-[hsl(75,92%,56%)]/20'
                : 'bg-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,38%)] text-white shadow-[hsl(76,78%,42%)]/20'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'ar' ? 'إضافة تمرين جديد' : 'Add New Exercise'}</span>
          </button>
        </div>
      </div>

      {/* SEARCH & MUSCLE GROUP FILTER BAR */}
      <div
        className={`p-4 rounded-2xl border space-y-3.5 ${
          isDark
            ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
            : 'bg-white border-[hsl(40,10%,88%)] shadow-2xs'
        }`}
      >
        <div className="relative">
          <Search
            className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3.5 ${
              isDark ? 'text-gray-500' : 'text-slate-400'
            }`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              lang === 'ar'
                ? 'ابحث عن تمرين بالاسم (مثال: Treadmill, Elliptical, Bench Press)...'
                : 'Search exercises by name (e.g., Treadmill, Cable Row, Squat)...'
            }
            className={`w-full ps-10 pe-4 py-2.5 rounded-xl text-sm border focus:outline-none ${
              isDark
                ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-100 placeholder-gray-500 focus:border-[hsl(75,92%,56%)]'
                : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,88%)] text-slate-900 placeholder-slate-400 focus:border-[hsl(76,78%,42%)]'
            }`}
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              selectedCategory === 'ALL'
                ? isDark
                  ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,6%,4%)] shadow-xs'
                  : 'bg-[hsl(76,78%,42%)] text-white shadow-xs'
                : isDark
                ? 'bg-[hsl(240,5%,11%)] text-gray-300 hover:bg-[hsl(240,5%,14%)]'
                : 'bg-[hsl(40,15%,94%)] text-slate-700 hover:bg-[hsl(40,15%,91%)]'
            }`}
          >
            {lang === 'ar' ? `الكل (${exercises.length})` : `All (${exercises.length})`}
          </button>
          {MUSCLE_GROUPS.map((mg) => {
            const count = exercises.filter((e) => e.muscleGroup === mg).length;
            const active = selectedCategory === mg;
            return (
              <button
                key={mg}
                onClick={() => setSelectedCategory(mg)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  active
                    ? isDark
                      ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,6%,4%)] shadow-xs'
                      : 'bg-[hsl(76,78%,42%)] text-white shadow-xs'
                    : isDark
                    ? 'bg-[hsl(240,5%,11%)] text-gray-300 hover:bg-[hsl(240,5%,14%)]'
                    : 'bg-[hsl(40,15%,94%)] text-slate-700 hover:bg-[hsl(40,15%,91%)]'
                }`}
              >
                {translateMuscleGroup(mg, lang)} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* EXERCISES LIST GRID */}
      {filteredExercises.length === 0 ? (
        <div
          className={`p-10 rounded-2xl border border-dashed text-center space-y-3 ${
            isDark
              ? 'border-[hsl(240,4%,19%)] text-gray-400'
              : 'border-[hsl(40,10%,85%)] text-slate-500'
          }`}
        >
          <Dumbbell className="w-8 h-8 mx-auto opacity-40" />
          <p className="text-sm font-medium">
            {exercises.length === 0
              ? lang === 'ar'
                ? 'مكتبة التمارين فارغة. أضف تمارينك المخصصة للبدء.'
                : 'Your exercise library is empty. Add your exercises to get started.'
              : lang === 'ar'
              ? 'لا توجد تمارين مطابقة للبحث الحالي.'
              : 'No exercises match your current filter.'}
          </p>
          <button
            onClick={openAddModal}
            className={`px-4 py-2 rounded-xl font-semibold text-xs cursor-pointer ${
              isDark
                ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,6%,4%)]'
                : 'bg-[hsl(76,78%,42%)] text-white'
            }`}
          >
            {lang === 'ar' ? 'إضافة تمرين جديد' : 'Add New Exercise'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExercises.map((ex) => {
            const sessionsCount = exerciseSessionCounts.get(ex.id) || 0;
            const assignedDays = weeklySchedule
              .filter((d) => d.assignedExerciseIds.includes(ex.id))
              .map((d) => d.day);

            return (
              <div
                key={ex.id}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                  isDark
                    ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)] hover:border-[hsl(240,4%,19%)]'
                    : 'bg-white border-[hsl(40,10%,88%)] shadow-2xs hover:border-[hsl(40,10%,85%)]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                          isDark
                            ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)] border-[hsl(75,92%,56%)]/30'
                            : 'bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)] border-[hsl(76,78%,42%)]/25'
                        }`}
                      >
                        {translateMuscleGroup(ex.muscleGroup, lang)}
                      </span>
                      <h3 className="font-display font-bold text-base mt-1.5">
                        {ex.name}
                      </h3>
                    </div>
                  </div>

                  {assignedDays.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      <Calendar className="w-3 h-3 text-gray-400 me-0.5" />
                      {assignedDays.map((d) => (
                        <span
                          key={d}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            isDark
                              ? 'bg-[hsl(240,5%,11%)] text-gray-300 border border-[hsl(240,4%,19%)]'
                              : 'bg-[hsl(40,15%,94%)] text-slate-600 border border-[hsl(40,10%,88%)]'
                          }`}
                        >
                          {translateDayName(d, lang, true)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-inherit flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setHistoryModalExercise(ex)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300 hover:border-[hsl(75,92%,56%)]/40'
                          : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,88%)] text-slate-700 hover:bg-[hsl(40,15%,91%)]'
                      }`}
                      title="View Exercise History"
                    >
                      <History
                        className={`w-3.5 h-3.5 ${
                          isDark
                            ? 'text-[hsl(75,92%,56%)]'
                            : 'text-[hsl(76,78%,42%)]'
                        }`}
                      />
                      <span>
                        {lang === 'ar'
                          ? `السجل (${sessionsCount})`
                          : `History (${sessionsCount})`}
                      </span>
                    </button>

                    {sessionsCount > 0 && (
                      <button
                        onClick={() => openProgressForExercise(ex.id)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          isDark
                            ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,56%)]/15'
                            : 'bg-[hsl(76,78%,42%)]/10 border-[hsl(76,78%,42%)]/25 text-[hsl(76,78%,42%)]'
                        }`}
                        title="View Progress Charts"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(ex)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isDark
                          ? 'text-gray-400 hover:text-gray-100 hover:bg-[hsl(240,5%,11%)]'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-[hsl(40,15%,94%)]'
                      }`}
                      title="Edit Exercise"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(ex.id)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isDark
                          ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10'
                          : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                      }`}
                      title="Delete Exercise"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT EXERCISE MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveExercise}
            className={`w-full max-w-lg rounded-2xl border p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto ${
              isDark
                ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)]'
                : 'bg-white border-[hsl(40,10%,88%)]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-inherit pb-3">
              <h3 className="font-display font-bold text-lg">
                {editingExercise
                  ? lang === 'ar'
                    ? 'تعديل بيانات التمرين'
                    : 'Edit Exercise'
                  : lang === 'ar'
                  ? 'إضافة تمرين جديد للمكتبة'
                  : 'Add New Exercise'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">
                {lang === 'ar'
                  ? 'اسم التمرين (يدعم الإنجليزية والعربية)'
                  : 'Exercise Name *'}
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Treadmill, Elliptical, Lat Pulldown..."
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none ${
                  isDark
                    ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-100 focus:border-[hsl(75,92%,56%)]'
                    : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,88%)] text-slate-900 focus:border-[hsl(76,78%,42%)]'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">
                {lang === 'ar' ? 'الفئة العضلية *' : 'Muscle Group *'}
              </label>
              <select
                value={formMuscleGroup}
                onChange={(e) => setFormMuscleGroup(e.target.value as MuscleGroup)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none ${
                  isDark
                    ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-100 focus:border-[hsl(75,92%,56%)]'
                    : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,88%)] text-slate-900 focus:border-[hsl(76,78%,42%)]'
                }`}
              >
                {MUSCLE_GROUPS.map((mg) => (
                  <option key={mg} value={mg}>
                    {translateMuscleGroup(mg, lang)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-inherit">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-medium border cursor-pointer ${
                  isDark
                    ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300'
                    : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,85%)] text-slate-700'
                }`}
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className={`px-5 py-2 rounded-xl font-display font-bold text-xs cursor-pointer ${
                  isDark
                    ? 'bg-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,62%)] text-[hsl(240,6%,4%)]'
                    : 'bg-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,38%)] text-white'
                }`}
              >
                {editingExercise
                  ? lang === 'ar'
                    ? 'حفظ التغييرات'
                    : 'Save Changes'
                  : lang === 'ar'
                  ? 'إضافة التمرين'
                  : 'Create Exercise'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EXERCISE HISTORY MODAL */}
      {historyModalExercise && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-xl rounded-2xl border p-5 sm:p-6 space-y-4 max-h-[85vh] flex flex-col ${
              isDark
                ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)]'
                : 'bg-white border-[hsl(40,10%,88%)]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-inherit pb-3">
              <div>
                <span
                  className={`text-xs font-semibold ${
                    isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
                  }`}
                >
                  {translateMuscleGroup(historyModalExercise.muscleGroup, lang)}
                </span>
                <h3 className="font-display font-bold text-lg">
                  {historyModalExercise.name} —{' '}
                  {lang === 'ar' ? 'سجل الأداء' : 'Workout History'}
                </h3>
              </div>
              <button
                onClick={() => setHistoryModalExercise(null)}
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {selectedExerciseHistory.length === 0 ? (
                <div className="py-10 text-center text-xs text-gray-400">
                  {lang === 'ar'
                    ? 'لم يتم تسجيل أي جلسات لهذا التمرين بعد.'
                    : 'No completed workout sessions recorded for this exercise yet.'}
                </div>
              ) : (
                selectedExerciseHistory.map((log, i) => (
                  <div
                    key={`${log.workoutId}_${i}`}
                    className={`p-3.5 rounded-xl border space-y-2 ${
                      isDark
                        ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)]'
                        : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,88%)]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={`font-semibold ${
                          isDark
                            ? 'text-[hsl(75,92%,56%)]'
                            : 'text-[hsl(76,78%,42%)]'
                        }`}
                      >
                        {formatFullDate(log.actualDate, lang)}
                      </span>
                      <span className="font-mono-num uppercase text-gray-400">
                        {log.weightType === 'none' ? 'Bodyweight' : log.weightType}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {log.sets.map((s) => (
                        <div
                          key={s.setNumber}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-mono-num border ${
                            isDark
                              ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)]'
                              : 'bg-white border-[hsl(40,10%,88%)]'
                          }`}
                        >
                          <span className="text-gray-400 me-1.5">#{s.setNumber}:</span>
                          <span className="font-semibold">
                            {formatSetPerformance(
                              s.weight,
                              log.weightType,
                              s.reps,
                              lang
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-inherit flex items-center justify-between">
              {selectedExerciseHistory.length > 0 ? (
                <button
                  onClick={() => {
                    const id = historyModalExercise.id;
                    setHistoryModalExercise(null);
                    openProgressForExercise(id);
                  }}
                  className={`px-4 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 cursor-pointer ${
                    isDark
                      ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)] border border-[hsl(75,92%,56%)]/30'
                      : 'bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)] border border-[hsl(76,78%,42%)]/25'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'فتح مخطط التطور' : 'View Progress Chart'}</span>
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => setHistoryModalExercise(null)}
                className={`px-4 py-2 rounded-xl font-semibold text-xs cursor-pointer ${
                  isDark
                    ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,6%,4%)]'
                    : 'bg-[hsl(76,78%,42%)] text-white'
                }`}
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE EXERCISE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-5 space-y-4 ${
              isDark
                ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)]'
                : 'bg-white border-[hsl(40,10%,88%)]'
            }`}
          >
            <h3 className="font-display font-bold text-base text-red-400">
              {lang === 'ar' ? 'تأكيد حذف التمرين' : 'Delete Exercise from Library?'}
            </h3>
            <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
              {lang === 'ar'
                ? 'سيتم إزالة هذا التمرين من المكتبة، ولكن جميع السجلات التاريخية السابقة لهذا التمرين ستبقى محفوظة بالكامل.'
                : 'This exercise will be removed from your active library. Any historical workouts where you performed this exercise will remain safely preserved.'}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className={`px-4 py-2 rounded-xl text-xs font-medium border cursor-pointer ${
                  isDark
                    ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300'
                    : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,88%)] text-slate-700'
                }`}
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  await deleteExercise(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-semibold text-xs cursor-pointer"
              >
                {lang === 'ar' ? 'حذف التمرين' : 'Delete Exercise'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
