import React, { useState } from 'react';
import {
  Scale,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useGym } from '../context/GymContext';

interface WeightRecord {
  id: string;
  weight: number;
  unit: 'kg' | 'lbs';
  date: string;
}

export const WeightPage: React.FC = () => {
  const { settings, showToast } = useGym();
  const lang = settings.language;
  const isDark = settings.theme === 'dark';

  // State for Weight Records Array
  const [weightHistory, setWeightHistory] = useState<WeightRecord[]>(() => {
    try {
      const saved = localStorage.getItem('gym_tracker_weight_history');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [currentInputWeight, setCurrentInputWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>(
    settings.preferredWeightUnit || 'kg'
  );
  const [recordDate, setRecordDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Handle Add New Weight Record
  const handleAddWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(currentInputWeight);
    if (!currentInputWeight || isNaN(val) || val <= 0) {
      showToast(
        lang === 'ar' ? 'الرجاء إدخال وزن صحيح.' : 'Please enter a valid weight.',
        'error'
      );
      return;
    }

    const newRecord: WeightRecord = {
      id: Date.now().toString(),
      weight: val,
      unit: weightUnit,
      date: recordDate,
    };

    // Insert sorted or prepended (Newest first)
    const updated = [newRecord, ...weightHistory].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setWeightHistory(updated);
    localStorage.setItem('gym_tracker_weight_history', JSON.stringify(updated));

    setCurrentInputWeight('');
    showToast(
      lang === 'ar'
        ? `تم حفظ الوزن بنجاح: ${val} ${weightUnit}`
        : `Weight saved successfully: ${val} ${weightUnit}`,
      'success'
    );
  };

  // Handle Delete Record
  const handleDeleteRecord = (id: string) => {
    const updated = weightHistory.filter((item) => item.id !== id);
    setWeightHistory(updated);
    localStorage.setItem('gym_tracker_weight_history', JSON.stringify(updated));
    showToast(
      lang === 'ar' ? 'تم حذف السجل بنجاح' : 'Record deleted successfully',
      'info'
    );
  };

  // Prepare Chart Data (Reversed to show chronological order left-to-right)
  const chartData = [...weightHistory]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((item) => ({
      date: item.date,
      weight: item.weight,
      unit: item.unit,
    }));

  // Calculate Difference from previous entry
  const latestWeight = weightHistory.length > 0 ? weightHistory[0].weight : null;
  const previousWeight =
    weightHistory.length > 1 ? weightHistory[1].weight : null;
  const weightDiff =
    latestWeight !== null && previousWeight !== null
      ? Number((latestWeight - previousWeight).toFixed(1))
      : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400 mb-1">
            <Scale className="w-4 h-4" />
            <span>{lang === 'ar' ? 'متابعة الجسم' : 'Body Metrics'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">
            {lang === 'ar' ? 'سجل وزن الجسم والتقدم' : 'Body Weight & Progress'}
          </h1>
          <p
            className={`text-sm mt-1 ${
              isDark ? 'text-gray-400' : 'text-slate-600'
            }`}
          >
            {lang === 'ar'
              ? 'سجل أوزانك بانتظام لتتبع تقدمك مع رسم بياني تفصيلي وتاريخي.'
              : 'Log your body weight regularly to track progress over time.'}
          </p>
        </div>
      </div>

      {/* INPUT FORM CARD */}
      <div
        className={`p-5 sm:p-6 rounded-2xl border ${
          isDark
            ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
            : 'bg-white border-[hsl(40,10%,88%)] shadow-xs'
        }`}
      >
        <h2 className="text-base font-display font-bold mb-4">
          {lang === 'ar' ? 'تسجيل وزن جديد' : 'Log New Weight'}
        </h2>

        <form
          onSubmit={handleAddWeight}
          className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
        >
          <div className="space-y-1.5 sm:col-span-1">
            <label className="block text-xs font-medium text-gray-400">
              {lang === 'ar' ? 'الوزن' : 'Weight'}
            </label>
            <input
              type="number"
              step="0.1"
              value={currentInputWeight}
              onChange={(e) => setCurrentInputWeight(e.target.value)}
              placeholder="e.g. 75.5"
              className={`w-full py-2.5 px-4 rounded-xl border font-mono-num text-sm outline-none ${
                isDark
                  ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white focus:border-purple-500'
                  : 'bg-gray-50 border-gray-300 text-slate-900 focus:border-purple-600'
              }`}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-1">
            <label className="block text-xs font-medium text-gray-400">
              {lang === 'ar' ? 'الوحدة' : 'Unit'}
            </label>
            <select
              value={weightUnit}
              onChange={(e) => setWeightUnit(e.target.value as 'kg' | 'lbs')}
              className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                isDark
                  ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white'
                  : 'bg-gray-50 border-gray-300 text-slate-900'
              }`}
            >
              <option value="kg">KG</option>
              <option value="lbs">LBS</option>
            </select>
          </div>

          <div className="space-y-1.5 sm:col-span-1">
            <label className="block text-xs font-medium text-gray-400">
              {lang === 'ar' ? 'التاريخ' : 'Date'}
            </label>
            <input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              className={`w-full py-2.5 px-3 rounded-xl border text-xs outline-none font-mono-num ${
                isDark
                  ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white'
                  : 'bg-gray-50 border-gray-300 text-slate-900'
              }`}
            />
          </div>

          <div className="sm:col-span-1">
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl font-display font-bold text-xs bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ar' ? 'حفظ وإضافة' : 'Save Record'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* STATS & PROGRESS OVERVIEW */}
      {weightHistory.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            className={`p-4 rounded-xl border ${
              isDark
                ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
                : 'bg-white border-[hsl(40,10%,88%)]'
            }`}
          >
            <span className="text-xs text-gray-400">
              {lang === 'ar' ? 'الوزن الحالي' : 'Current Weight'}
            </span>
            <div className="text-2xl font-bold font-mono-num mt-1 text-purple-400">
              {latestWeight} <span className="text-xs">{weightHistory[0].unit}</span>
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              isDark
                ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
                : 'bg-white border-[hsl(40,10%,88%)]'
            }`}
          >
            <span className="text-xs text-gray-400">
              {lang === 'ar' ? 'التغير عن القراءة السابقة' : 'Change from Last'}
            </span>
            <div
              className={`text-2xl font-bold font-mono-num mt-1 flex items-center gap-1 ${
                weightDiff > 0
                  ? 'text-amber-400'
                  : weightDiff < 0
                  ? 'text-emerald-400'
                  : 'text-gray-400'
              }`}
            >
              {weightDiff > 0 ? (
                <TrendingUp className="w-5 h-5" />
              ) : weightDiff < 0 ? (
                <TrendingDown className="w-5 h-5" />
              ) : null}
              <span>
                {weightDiff > 0 ? `+${weightDiff}` : weightDiff}{' '}
                <span className="text-xs">{weightHistory[0].unit}</span>
              </span>
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              isDark
                ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
                : 'bg-white border-[hsl(40,10%,88%)]'
            }`}
          >
            <span className="text-xs text-gray-400">
              {lang === 'ar' ? 'إجمالي السجلات' : 'Total Entries'}
            </span>
            <div className="text-2xl font-bold font-mono-num mt-1">
              {weightHistory.length}
            </div>
          </div>
        </div>
      )}

      {/* CHART SECTION */}
      {chartData.length > 1 && (
        <div
          className={`p-5 rounded-2xl border ${
            isDark
              ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
              : 'bg-white border-[hsl(40,10%,88%)] shadow-xs'
          }`}
        >
          <h2 className="text-base font-display font-bold mb-4">
            {lang === 'ar' ? 'رسم بياني لتطور الوزن' : 'Weight Progress Chart'}
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? 'hsl(240, 4%, 16%)' : 'hsl(40, 10%, 88%)'}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: isDark ? '#9CA3AF' : '#64748B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={['dataMin - 2', 'dataMax + 2']}
                  tick={{ fill: isDark ? '#9CA3AF' : '#64748B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? 'hsl(240, 5%, 7.5%)' : '#FFFFFF',
                    borderColor: isDark ? 'hsl(240, 4%, 19%)' : 'hsl(40, 10%, 88%)',
                    borderRadius: '12px',
                    color: isDark ? '#F3F4F6' : '#0F172A',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="weight"
                  fill="#A855F7"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* HISTORY LIST TABLE */}
      <div
        className={`p-5 rounded-2xl border space-y-4 ${
          isDark
            ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
            : 'bg-white border-[hsl(40,10%,88%)] shadow-xs'
        }`}
      >
        <h2 className="text-base font-display font-bold">
          {lang === 'ar' ? 'سجل الأوزان السابق' : 'Weight History Logs'}
        </h2>

        {weightHistory.length === 0 ? (
          <div
            className={`py-12 text-center text-xs ${
              isDark ? 'text-gray-500' : 'text-slate-400'
            }`}
          >
            {lang === 'ar'
              ? 'لم تقم بإضافة أي أوزان حتى الآن. ابدأ بإدخال وزنك الأول بالأعلى.'
              : 'No weight records found. Add your first weight above.'}
          </div>
        ) : (
          <div className="space-y-2">
            {weightHistory.map((item, index) => {
              const prevItem = weightHistory[index + 1];
              const diff = prevItem
                ? Number((item.weight - prevItem.weight).toFixed(1))
                : 0;

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                    isDark
                      ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)]'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold text-sm">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-mono-num font-bold text-base">
                        {item.weight} <span className="text-xs uppercase">{item.unit}</span>
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{item.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {index < weightHistory.length - 1 && (
                      <span
                        className={`text-xs font-mono-num px-2.5 py-1 rounded-lg ${
                          diff > 0
                            ? 'bg-amber-500/15 text-amber-400'
                            : diff < 0
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-gray-500/15 text-gray-400'
                        }`}
                      >
                        {diff > 0 ? `+${diff}` : diff} {item.unit}
                      </span>
                    )}

                    <button
                      onClick={() => handleDeleteRecord(item.id)}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Delete record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
