import React, { useState, useEffect } from 'react';
import { Wrench, Clock, X, ChevronRight, AlertTriangle } from 'lucide-react';
import { useMaintenance } from '../../context/MaintenanceContext';

export const MaintenanceBanner = () => {
  const { upcomingMaintenance, activeMaintenance } = useMaintenance();
  const [dismissed, setDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  const targetMaintenance = activeMaintenance?.scope === 'partial'
    ? activeMaintenance
    : upcomingMaintenance;

  useEffect(() => {
    if (!targetMaintenance) {
      setTimeLeft('');
      return undefined;
    }

    const calculateTime = () => {
      const now = new Date().getTime();
      const targetTime = activeMaintenance
        ? (activeMaintenance.endTime ? new Date(activeMaintenance.endTime).getTime() : null)
        : new Date(targetMaintenance.startTime).getTime();

      if (!targetTime) {
        setTimeLeft('');
        return;
      }

      const diff = targetTime - now;
      if (diff <= 0) {
        setTimeLeft(activeMaintenance ? 'ending shortly' : 'starting now');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [targetMaintenance, activeMaintenance]);

  if (!targetMaintenance || dismissed) {
    return null;
  }

  const isPartialActive = activeMaintenance?.scope === 'partial';

  return (
    <div
      className={`w-full py-2 px-3 sm:px-4 text-xs flex items-center justify-between transition-all z-40 border-b ${
        isPartialActive
          ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
          : 'bg-indigo-600/15 border-indigo-500/30 text-indigo-200'
      }`}
    >
      <div className="flex items-center space-x-2.5 overflow-hidden min-w-0">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
            isPartialActive ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'
          }`}
        >
          {isPartialActive ? (
            <Wrench className="w-3.5 h-3.5" />
          ) : (
            <Clock className="w-3.5 h-3.5" />
          )}
        </div>

        <div className="truncate">
          <span className="font-bold text-white mr-1.5">
            {isPartialActive ? 'Feature Maintenance Active:' : 'Upcoming Maintenance:'}
          </span>
          <span className="font-medium mr-1.5">{targetMaintenance.title}</span>
          {targetMaintenance.scope === 'partial' && targetMaintenance.affectedFeatures?.length > 0 && (
            <span className="opacity-80 text-[11px]">
              (Affects: {targetMaintenance.affectedFeatures.join(', ')})
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-3 flex-shrink-0 ml-2">
        {timeLeft && (
          <span
            className={`font-mono text-[11px] px-2 py-0.5 rounded-full font-bold ${
              isPartialActive
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
            }`}
          >
            {isPartialActive ? `Ends in ${timeLeft}` : `Starts in ${timeLeft}`}
          </span>
        )}

        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-white/10 rounded-md transition text-slate-400 hover:text-white cursor-pointer"
          title="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

