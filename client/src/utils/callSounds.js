/**
 * Pure Web Audio API Sound Synthesizer for Calling
 * Zero external audio files required, works across all browsers.
 */

let audioCtx = null;
let ringInterval = null;

const getAudioContext = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

/**
 * Play a single tone
 */
const playTone = (freq, durationMs, type = 'sine', gainVal = 0.15) => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // Smooth envelope
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainVal, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch (e) {
    // Non-fatal if audio context is blocked by browser policy
  }
};

/**
 * Play an incoming call ringtone (looping pleasant melodic chime)
 */
export const startIncomingRingtone = () => {
  stopRingtone();
  const playChime = () => {
    playTone(523.25, 250, 'sine', 0.2); // C5
    setTimeout(() => playTone(659.25, 250, 'sine', 0.2), 150); // E5
    setTimeout(() => playTone(783.99, 450, 'sine', 0.25), 300); // G5
  };

  playChime();
  ringInterval = setInterval(playChime, 2200);
};

/**
 * Play an outgoing call ringback tone (repeating two-tone pulse)
 */
export const startOutgoingRingback = () => {
  stopRingtone();
  const playPulse = () => {
    playTone(440, 700, 'sine', 0.1);
    setTimeout(() => playTone(480, 700, 'sine', 0.1), 50);
  };

  playPulse();
  ringInterval = setInterval(playPulse, 3000);
};

/**
 * Stop any ongoing ringtone
 */
export const stopRingtone = () => {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
};

/**
 * Play call connected chime
 */
export const playCallConnectedSound = () => {
  stopRingtone();
  playTone(587.33, 150, 'triangle', 0.15); // D5
  setTimeout(() => playTone(880, 250, 'sine', 0.2), 120); // A5
};

/**
 * Play call ended tone
 */
export const playCallEndedSound = () => {
  stopRingtone();
  playTone(400, 200, 'sine', 0.15);
  setTimeout(() => playTone(300, 350, 'sine', 0.15), 180);
};

/**
 * Play busy tone (rapid repeating double-beep indicating user is busy)
 */
export const playBusyTone = () => {
  stopRingtone();
  let count = 0;
  const beep = () => {
    if (count >= 4) return;
    count++;
    playTone(480, 200, 'sine', 0.18);
    playTone(620, 200, 'sine', 0.18);
    setTimeout(beep, 400);
  };
  beep();
};
