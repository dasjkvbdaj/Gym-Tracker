import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Moon,
  Edit3,
  Trash2,
  X,
  ClipboardList,
  Copy,
  Check,
} from 'lucide-react';

import { useGym } from '../context/GymContext';
import { generateId, db } from '../database/db';
import { useLiveQuery } from 'dexie-react-hooks';

import {
  Exercise,
  ExerciseEntry,
  MuscleGroup,
  SetEntry,
  WeightUnit,
  WorkoutSession,
} from '../types/workout';

import {
  formatFullDate,
  formatTimeFromTimestamp,
  getDateMetadata,
  getMonthCalendarGrid,
  ORDERED_WEEK_DAYS,
  toLocalDateString,
} from '../utils/dateUtils';

                  </div>
                  <div className="space-y-1 mt-1 w-full">
                    {hasStrength && (
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold truncate ${
                        isDark ? 'bg-[hsl(75,92%,56%)]/20 text-[hsl(75,92%,56%)] border-[hsl(75,92%,56%)]/30' : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isDark ? 'bg-[hsl(75,92%,56%)]' : 'bg-indigo-600'}`} />
                        <span className="hidden sm:inline truncate">{lang === 'ar' ? 'حديد' : 'Strength'}</span>
                      </div>
                    )}
                    {hasCardio && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-semibold truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                        <span className="hidden sm:inline truncate">{lang === 'ar' ? 'كارديو' : 'Cardio'}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`lg:col-span-4 rounded-2xl border p-5 flex flex-col justify-between gap-5 ${panelClass}`}>
          <div className="space-y-4">
            <div className="pb-4 border-b border-inherit">
              <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(75,92%,56%)]">
                {lang === 'ar' ? 'التاريخ المحدد' : 'Selected Date'}
              </span>
              <h2 className="text-lg font-display font-bold mt-0.5">
                {formatFullDate(selectedCalendarDate, lang)}
              </h2>
              <span className={`inline-flex items-center mt-2 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                isDark ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)] border-[hsl(75,92%,56%)]/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}>
                      <button
                        type="button"
                        onClick={() => handleAddForgottenExercise(exercise.id)}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white cursor-pointer"
                      >
                        {lang === 'ar' ? 'إضافة' : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-inherit flex justify-end gap-2 shrink-0">
              <button type="button" onClick={handleCloseEdit} className="px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer">
                {lang === 'ar' ? 'حفظ' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] bg-black/75 flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-5 rounded-2xl border space-y-4 ${panelClass}`}>
            <h3 className="font-bold text-red-500">{lang === 'ar' ? 'حذف جلسة التمرين؟' : 'Delete Workout Session?'}</h3>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 rounded-xl border text-xs cursor-pointer">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleDeleteWorkout} className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold cursor-pointer">
                {lang === 'ar' ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
