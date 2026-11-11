"use client";

// Zero-dependency Web Audio API synthesizer for Falcon Arena game sound effects
class FalconSoundFX {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playTone(
    freq: number,
    durationSec: number,
    type: OscillatorType = "sine",
    gainValue: number = 0.12,
    delaySec: number = 0
  ) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec);
  }

  playJoinPop() {
    this.playTone(523.25, 0.09, "triangle", 0.12, 0);
    this.playTone(659.25, 0.14, "triangle", 0.14, 0.07);
  }

  playLockIn() {
    this.playTone(440, 0.08, "sine", 0.15, 0);
    this.playTone(880, 0.15, "triangle", 0.15, 0.06);
  }

  playTeamTalkChime() {
    this.playTone(392.0, 0.15, "triangle", 0.14, 0);
    this.playTone(493.88, 0.15, "triangle", 0.14, 0.12);
    this.playTone(587.33, 0.25, "triangle", 0.16, 0.24);
  }

  playTick(urgent: boolean = false) {
    this.playTone(urgent ? 880 : 620, 0.06, "square", urgent ? 0.08 : 0.05, 0);
  }

  playRevealFanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.22, "triangle", 0.15, idx * 0.09);
    });
  }

  playRaffleSpinTick() {
    this.playTone(320 + Math.random() * 450, 0.045, "triangle", 0.09, 0);
  }
}

export const soundFX = new FalconSoundFX();
