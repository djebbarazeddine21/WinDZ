/**
 * Web Audio API Notification Sound
 * Discrete, elegant two-tone chime for incoming orders.
 * Works without external sound files, zero network latency, 100% reliable.
 */

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioContextClass();
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

/**
 * Play a subtle, pleasant chime:
 * 1st note: G5 (783.99 Hz) with soft ramp
 * 2nd note: C6 (1046.50 Hz) ringing out gently
 */
export function playOrderNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1: Warm chime bell (G5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, now); // G5
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.025);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: Bright ascending sparkle (C6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.50, now + 0.11); // C6
    gain2.gain.setValueAtTime(0, now + 0.11);
    gain2.gain.linearRampToValueAtTime(0.22, now + 0.135);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.11);
    osc2.stop(now + 0.65);
  } catch (e) {
    console.debug('[Audio] Notification sound playback skipped:', e);
  }
}
