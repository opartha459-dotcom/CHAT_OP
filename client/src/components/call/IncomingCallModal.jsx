import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from '../../context/CallContext';
import { Avatar } from '../common/Avatar';

export const IncomingCallModal = () => {
  const { callState, currentCall, acceptCall, rejectCall } = useCall();

  if (callState !== 'incoming' || !currentCall) return null;

  const isVideo = currentCall.callType === 'video';
  const isGroup = currentCall.isGroup;
  const caller = currentCall.caller;
  const callerName = caller?.nickname || caller?.username || 'Someone';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col items-center text-center overflow-hidden">
        {/* Glow halo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

        {/* Ringing ripple avatar */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute w-28 h-28 rounded-full border-2 border-indigo-500/30 animate-ping" />
          <div className="absolute w-24 h-24 rounded-full border border-indigo-400/40 animate-pulse" />
          <Avatar
            src={caller?.avatar}
            name={callerName}
            size="xl"
            className="w-20 h-20 shadow-xl relative z-10 border-2 border-indigo-500"
          />
        </div>

        {/* Title & info */}
        <h3 className="text-lg font-bold text-white tracking-tight">
          {callerName}
        </h3>
        <p className="text-xs text-indigo-400 font-medium mt-1 flex items-center justify-center space-x-1.5">
          {isVideo ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
          <span>Incoming {isGroup ? 'Group' : ''} {isVideo ? 'Video' : 'Voice'} Call...</span>
        </p>

        {/* Action buttons */}
        <div className="flex items-center justify-center space-x-6 mt-8 w-full">
          {/* Decline */}
          <button
            onClick={() => rejectCall()}
            className="flex flex-col items-center space-y-1.5 group cursor-pointer"
            title="Decline Call"
          >
            <div className="w-14 h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-600/30 transition-transform active:scale-95 group-hover:scale-105">
              <PhoneOff className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-semibold text-rose-400">Decline</span>
          </button>

          {/* Accept */}
          <button
            onClick={() => acceptCall()}
            className="flex flex-col items-center space-y-1.5 group cursor-pointer"
            title="Accept Call"
          >
            <div className="w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-600/30 transition-transform active:scale-95 group-hover:scale-105 animate-bounce">
              {isVideo ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
            </div>
            <span className="text-[11px] font-semibold text-emerald-400">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};
