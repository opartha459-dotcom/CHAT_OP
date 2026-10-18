import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to detect when a MediaStream is actively speaking using Web Audio API.
 * Provides Google Meet style active speaker detection with smooth debounce.
 */
export const useAudioActivity = (stream, isMuted = false) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const stopTimeoutRef = useRef(null);

  useEffect(() => {
    if (!stream || isMuted) {
      setIsSpeaking(false);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (!audioTracks || audioTracks.length === 0 || !audioTracks.some((t) => t.enabled)) {
      setIsSpeaking(false);
      return;
    }

    let audioContext = null;
    let sourceNode = null;
    let analyser = null;
    let animationFrameId = null;
    let isCancelled = false;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      audioContext = new AudioContextClass();
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }

      sourceNode = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      sourceNode.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (isCancelled) return;

        analyser.getByteFrequencyData(dataArray);

        // Calculate average audio frequency level
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Threshold for human speech activity
        const threshold = 12;

        if (average > threshold && !isMuted) {
          if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
            stopTimeoutRef.current = null;
          }
          setIsSpeaking(true);
        } else {
          // Keep speaking state active for 350ms to prevent frantic flickering
          if (!stopTimeoutRef.current) {
            stopTimeoutRef.current = setTimeout(() => {
              if (!isCancelled) {
                setIsSpeaking(false);
              }
              stopTimeoutRef.current = null;
            }, 350);
          }
        }

        animationFrameId = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      // Graceful fallback if Web Audio is restricted
      console.warn('[useAudioActivity] Web Audio warning', err);
    }

    return () => {
      isCancelled = true;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }
      if (sourceNode) {
        try {
          sourceNode.disconnect();
        } catch (e) {}
      }
      if (analyser) {
        try {
          analyser.disconnect();
        } catch (e) {}
      }
      if (audioContext && audioContext.state !== 'closed') {
        try {
          audioContext.close().catch(() => {});
        } catch (e) {}
      }
    };
  }, [stream, isMuted]);

  return isSpeaking;
};
