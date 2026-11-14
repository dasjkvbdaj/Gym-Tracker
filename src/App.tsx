import React, { useEffect } from 'react';
import { Dumbbell } from 'lucide-react';
import { AppNavigation } from './components/navigation/AppNavigation';
import { GymProvider, useGym } from './context/GymContext';
import { CalendarPage } from './pages/CalendarPage';
import { Dashboard } from './pages/Dashboard';
import { ExerciseLibrary } from './pages/ExerciseLibrary';
import { MyWorkout } from './pages/MyWorkout';
import { ProgressPage } from './pages/ProgressPage';
import { SettingsPage } from './pages/SettingsPage';
import { StartWorkout } from './pages/StartWorkout';

const MainRouter: React.FC = () => {
  const { isInitialized, currentSection } = useGym();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentSection]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0D12] text-[#F3F4F6]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center animate-pulse">
            <Dumbbell className="w-6 h-6" />
          </div>
          <div className="font-display font-bold text-sm tracking-wider text-gray-400">
            INITIALIZING LOCAL DATABASE...
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppNavigation>
      {currentSection === 'dashboard' && <Dashboard />}
      {currentSection === 'schedule' && <MyWorkout />}
      {currentSection === 'exercises' && <ExerciseLibrary />}
      {currentSection === 'start-workout' && <StartWorkout />}
      {currentSection === 'calendar' && <CalendarPage />}
      {currentSection === 'progress' && <ProgressPage />}
      {currentSection === 'settings' && <SettingsPage />}
    </AppNavigation>
  );
};

export function App() {
  return (
    <GymProvider>
      <MainRouter />
    </GymProvider>
  );
}

export default App;