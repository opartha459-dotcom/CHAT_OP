import React, { useState, useEffect, useRef } from 'react';
import { Mic, Trash2, Send, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const VoiceRecorder = ({ onSendVoice, onCancel }) => {
  const { token } = useAuth();
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Setup Audio Analyser for live waveform visualization
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateLevel = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();

        // Determine supported audio mime type
        let mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          mimeType = 'audio/ogg;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.start(100);

        timerRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        console.error('Failed to access microphone:', err);
        onCancel();
      }
    };

    startRecording();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const handleCancel = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanup();
    onCancel();
  };

  const handleFinishAndSend = async () => {
    if (!mediaRecorderRef.current) return;
    setUploading(true);

    mediaRecorderRef.current.onstop = async () => {
      cleanup();
      try {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm';
        const file = new File([audioBlob], `voice_note_${Date.now()}.${ext}`, { type: mimeType });

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/users/upload', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
          body: formData
        });

        const data = await res.json();
        if (data.success) {
          onSendVoice({
            url: data.fileUrl,
            name: data.fileName,
            size: data.fileSize,
            mimeType: data.fileMimeType
          });
        }
      } catch (err) {
        console.error('Failed to upload voice recording:', err);
      } finally {
        setUploading(false);
      }
    };

    mediaRecorderRef.current.stop();
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center space-x-3 w-full bg-slate-100 dark:bg-slate-800/90 px-4 py-2 rounded-2xl animate-in slide-in-from-bottom-2 duration-200 select-none">
      {/* Blinking red recording dot */}
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
        <span className="font-mono text-xs font-bold text-slate-800 dark:text-white">
          {formatTimer(recordingSeconds)}
        </span>
      </div>

      {/* Live animated waveform bars */}
      <div className="flex-1 flex items-center justify-center space-x-1 h-6">
        {[20, 45, 75, 95, 60, 30, 80, 50, 90, 40, 70, 35, 85].map((baseHeight, idx) => {
          const dynamicHeight = Math.max(15, Math.min(100, (baseHeight * audioLevel) / 60));
          return (
            <div
              key={idx}
              className="w-1 bg-indigo-500/80 rounded-full transition-all duration-75"
              style={{ height: `${dynamicHeight}%` }}
            />
          );
        })}
      </div>

      {/* Action buttons: Cancel (Trash) & Send (Paperplane) */}
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={uploading}
          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
          title="Discard recording"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleFinishAndSend}
          disabled={uploading}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition active:scale-95 flex items-center justify-center"
          title="Send voice note"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};
