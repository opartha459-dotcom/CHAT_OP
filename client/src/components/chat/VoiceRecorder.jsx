import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Send, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const VoiceRecorder = ({ onSendVoice, onCancel }) => {
  const { token } = useAuth();
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timerRef = useRef(null);
  // Captured before stop() so the onstop callback has it even after unmount
  const capturedMimeTypeRef = useRef('audio/webm');

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
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
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

        capturedMimeTypeRef.current = mimeType;

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
    analyserRef.current = null;
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
    const recorder = mediaRecorderRef.current;
    if (!recorder || uploading) return;

    setUploading(true);
    setError('');

    // Capture mimeType NOW before anything can be torn down
    const mimeType = capturedMimeTypeRef.current || recorder.mimeType || 'audio/webm';

    try {
      // Stop recorder and collect ALL chunks via a promise — prevents the
      // race where the component unmounts before onstop fires.
      const chunks = await new Promise((resolve, reject) => {
        if (recorder.state === 'inactive') {
          resolve([...audioChunksRef.current]);
          return;
        }

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.onstop = () => resolve([...audioChunksRef.current]);
        recorder.onerror = (e) => reject(e.error || new Error('Recorder error'));
        recorder.stop();
      });

      // Release microphone + audio context AFTER chunks are collected
      cleanup();

      if (!chunks.length) throw new Error('No audio data recorded');

      const audioBlob = new Blob(chunks, { type: mimeType });
      const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'm4a' : 'webm';
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
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Failed to upload voice recording:', err);
      setError(err.message || 'Failed to send. Try again.');
      setUploading(false);
    }
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col space-y-1.5 w-full">
      <div className="flex items-center space-x-3 w-full bg-slate-100 dark:bg-slate-800/90 px-4 py-2 rounded-2xl animate-in slide-in-from-bottom-2 duration-200 select-none">
        {/* Blinking red recording dot + timer */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <span className="font-mono text-xs font-bold text-slate-800 dark:text-white min-w-[36px]">
            {formatTimer(recordingSeconds)}
          </span>
        </div>

        {/* Live animated waveform bars */}
        <div className="flex-1 flex items-center justify-center space-x-0.5 h-6">
          {[20, 45, 75, 95, 60, 30, 80, 50, 90, 40, 70, 35, 85, 55, 65].map((baseHeight, idx) => {
            const dynamicHeight = uploading
              ? 20
              : Math.max(15, Math.min(100, (baseHeight * (audioLevel || 30)) / 60));
            return (
              <div
                key={idx}
                className="w-1 bg-indigo-500/80 rounded-full transition-all duration-75"
                style={{ height: `${dynamicHeight}%` }}
              />
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleCancel}
            disabled={uploading}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition disabled:opacity-40"
            title="Discard recording"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleFinishAndSend}
            disabled={uploading}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl shadow-md transition active:scale-95 flex items-center justify-center min-w-[36px]"
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

      {/* Upload error */}
      {error && (
        <div className="flex items-center space-x-1.5 px-2 text-xs text-rose-500">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
