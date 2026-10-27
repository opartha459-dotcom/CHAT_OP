import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ShieldAlert, CheckCircle2, AlertTriangle, Loader2, Clock } from 'lucide-react';
import { PulseLogo } from '../components/common/PulseLogo';
import { useAuth } from '../context/AuthContext';

export const ConfirmDeletionPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { logout } = useAuth();

  const [status, setStatus] = useState('confirming'); // 'confirming' | 'confirmed' | 'error'
  const [message, setMessage] = useState('Processing deletion confirmation...');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No confirmation token provided.');
      return;
    }

    const confirm = async () => {
      try {
        const res = await fetch('/api/auth/confirm-deletion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          setStatus('confirmed');
          setMessage(data.message);
          setDeadline(data.recoveryDeadline);
          if (logout) logout();
        } else {
          setStatus('error');
          setMessage(data.message || 'Deletion confirmation link has expired or is invalid.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Network error confirming deletion.');
      }
    };

    confirm();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4 font-sans select-none">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
        <div className="flex justify-center">
          <PulseLogo size="md" animated={status === 'confirming'} />
        </div>

        {status === 'confirming' && (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
            <h2 className="text-lg font-bold">Confirming Deletion...</h2>
            <p className="text-xs text-slate-400">{message}</p>
          </div>
        )}

        {status === 'confirmed' && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400 mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-rose-300">Account Marked for Deletion</h2>
            <p className="text-xs text-slate-300 leading-relaxed">{message}</p>
            <div className="p-3 bg-slate-800/80 rounded-2xl text-[11px] text-slate-400 leading-relaxed text-left border border-slate-700">
              <strong className="text-white block mb-1">How Recovery Works:</strong>
              If you log in with your credentials before the deadline, you will be offered the choice to submit an account recovery request to restore all your retained messages and groups.
            </div>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-block px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition"
              >
                Return to Login
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-950/80 border border-amber-800 flex items-center justify-center text-amber-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-amber-300">Action Expired or Invalid</h2>
            <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition"
              >
                Return to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
