import React, { useState, useEffect } from 'react';
import { Wrench, Clock, RefreshCw } from 'lucide-react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { useAuth } from '../../context/AuthContext';
import { PulseLogo } from './PulseLogo';

export const MaintenanceScreen = () => {
  const { activeMaintenance, refreshMaintenance } = useMaintenance();
  const { user } = useAuth();

  const [timeLeft, setTimeLeft] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!activeMaintenance?.endTime) {
      setTimeLeft('');
      return undefined;
    }

    const calculateTime = () => {
      const now = new Date().getTime();
      const end = new Date(activeMaintenance.endTime).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Finishing up...');
        refreshMaintenance();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [activeMaintenance, refreshMaintenance]);

  // Only render if there is an active full-system maintenance
  if (!activeMaintenance || activeMaintenance.scope !== 'full_system') {
    return null;
  }

  // Administrators NEVER get blocked by the maintenance screen anywhere in the application
  if (user?.role === 'admin') {
    return null;
  }

  const handleManualCheck = async () => {
    setChecking(true);
    await refreshMaintenance();
    setTimeout(() => setChecking(false), 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#090D16] text-white flex flex-col items-center justify-center p-6 select-none animate-fadeIn">
      {/* Background radial glow */}
      <div className="absolute w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none -top-10" />
      <div className="absolute w-96 h-96 rounded-full bg-violet-600/10 blur-3xl pointer-events-none -bottom-10" />

      <div className="relative z-10 max-w-md w-full text-center space-y-6">
        {/* Animated Icon */}
        <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/30 flex items-center justify-center shadow-2xl shadow-indigo-500/20">
          <Wrench className="w-10 h-10 text-indigo-400 animate-pulse" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span>Scheduled Maintenance Mode</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {activeMaintenance.title || 'Under Scheduled Maintenance'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
            {activeMaintenance.description ||
              'We are currently performing scheduled system updates to improve performance and reliability. We will be back shortly.'}
          </p>
        </div>

        {/* Live Countdown Display */}
        {timeLeft && (
          <div className="p-4 rounded-2xl bg-[#0F1524] border border-slate-800/80 shadow-xl space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center justify-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Estimated Time Remaining</span>
            </div>
            <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-wider text-indigo-400">
              {timeLeft}
            </div>
            {activeMaintenance.endTime && (
              <div className="text-[11px] text-slate-400 font-medium">
                Scheduled completion: {new Date(activeMaintenance.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        )}

        <div className="pt-2 flex flex-col items-center space-y-3">
          <button
            onClick={handleManualCheck}
            disabled={checking}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>Check Status Again</span>
          </button>
        </div>
      </div>
    </div>
  );
};

