/**
 * Light 8-bit Sound Synthesis Utility
 * Uses Web Audio API to generate retro blips and explosions without external assets.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  public muted: boolean = false;
  public gameSpeed: number = 1;
  private lastPlayTime: Record<string, number> = {};
  private recentPlays: number[] = [];

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Generate White Noise Buffer
      const bufferSize = this.ctx.sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private playNoise(duration: number, volume: number, lowPassFreq: number = 800) {
    this.init();
    if (!this.ctx || !this.noiseBuffer || this.muted) return;

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    source.buffer = this.noiseBuffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(lowPassFreq, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + duration);

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    source.start();
    source.stop(this.ctx.currentTime + duration);
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number, slide?: number) {
    this.init();
    if (!this.ctx || this.muted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slide) {
      osc.frequency.exponentialRampToValueAtTime(slide, this.ctx.currentTime + duration);
    }

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  public play(type: 'launch' | 'launch_drone' | 'launch_missile' | 'launch_strike' | 'launch_fighter' | 'fighter_shoot' | 'intercept' | 'impact' | 'heavy_impact' | 'triple_boom' | 'scan' | 'click' | 'victory' | 'defeat' | 'build' | 'finance' | 'radar') {
    const now = Date.now();
    
    // Scale throttle by gameSpeed to prevent cutting off too many sounds at high speed
    const throttleTime = 20 / this.gameSpeed; 
    if (this.lastPlayTime[type] && (now - this.lastPlayTime[type] < throttleTime)) return;
    this.lastPlayTime[type] = now;

    // Track recent plays to dynamically duck volume
    this.recentPlays = this.recentPlays.filter(t => now - t < 800);
    if (type !== 'click' && type !== 'scan' && type !== 'radar') {
      this.recentPlays.push(now);
    }
    
    // Normalize load relative to game speed so we don't mute everything at 10x
    const normalizedLoad = this.recentPlays.length / Math.max(1, this.gameSpeed * 0.5);
    let mod = (type === 'click' || type === 'scan' || type === 'radar' || type === 'finance') ? 1.0 : Math.max(0.1, 1 - (normalizedLoad * 0.08));

    // Time compression factor based on game speed (1x -> 1, 2x -> 1.5, 10x -> 3.98)
    const sMod = Math.pow(this.gameSpeed, 0.6); 
    
    // Additionally lower global volume directly based on speed if it's very fast
    if (this.gameSpeed > 2) {
       mod *= Math.max(0.3, 1 / Math.sqrt(this.gameSpeed));
    }

    // Helpers to automatically apply the speed/volume modifiers
    const n = (d: number, v: number, f: number) => this.playNoise(d / sMod, v * mod, f);
    const t = (freq: number, ty: OscillatorType, d: number, v: number, sl?: number) => this.playTone(freq, ty, d / sMod, v * mod, sl);

    switch (type) {
      case 'launch':
      case 'launch_drone':
        n(0.12 * (0.9 + Math.random() * 0.2), 0.04, 3500 * (0.9 + Math.random() * 0.2));
        break;
      case 'launch_missile':
        n(0.5, 0.05, 1500 * (0.9 + Math.random() * 0.2));
        break;
      case 'launch_strike':
        const rS = 0.9 + Math.random() * 0.2;
        n(0.15 * rS, 0.1, 400 * rS);
        t(100 * rS, 'sine', 0.1 * rS, 0.05, 40 * rS);
        break;
      case 'launch_fighter':
        n(0.8, 0.07, 1800 * (0.9 + Math.random() * 0.2));
        break;
      case 'fighter_shoot':
        for(let i=0; i<3; i++) {
          setTimeout(() => {
             n(0.05, 0.05, 2500 * (0.8 + Math.random() * 0.4));
             t(120, 'square', 0.05, 0.02);
          }, (i * 40) / sMod);
        }
        break;
      case 'intercept':
        const rInt = 0.8 + Math.random() * 0.4;
        n(0.15 * rInt, 0.1, 2000 * rInt);
        t(120 * rInt, 'sawtooth', 0.1 * rInt, 0.05, 30 * rInt);
        break;
      case 'impact':
        const rImp = 0.7 + Math.random() * 0.6;
        n(0.2 * rImp, 0.15, 1200 * rImp);
        t(80 * rImp, 'sawtooth', 0.15 * rImp, 0.1, 20 * rImp);
        break;
      case 'heavy_impact':
        const rH = 0.8 + Math.random() * 0.4;
        n(0.4 * rH, 0.2, 800 * rH);
        t(60 * rH, 'sawtooth', 0.3 * rH, 0.15, 10 * rH);
        break;
      case 'triple_boom':
        const rT = 0.8 + Math.random() * 0.4;
        n(0.3 * rT, 0.15, 1000 * rT);
        setTimeout(() => n(0.4 * rT, 0.18, 600 * rT), (100 * rT) / sMod);
        setTimeout(() => {
          n(0.6 * rT, 0.22, 400 * rT);
          t(40 * rT, 'sawtooth', 0.5 * rT, 0.2, 10 * rT);
        }, (220 * rT) / sMod);
        break;
      case 'scan':
        t(600, 'sine', 0.1, 0.05, 1200);
        break;
      case 'radar':
        t(900, 'sine', 0.05, 0.05);
        setTimeout(() => t(1100, 'sine', 0.05, 0.05), 80 / sMod);
        break;
      case 'build':
        n(0.1, 0.1, 1000);
        t(60, 'square', 0.1, 0.08);
        break;
      case 'finance':
        t(1200, 'sine', 0.05, 0.06);
        setTimeout(() => t(1500, 'sine', 0.1, 0.08), 50 / sMod);
        break;
      case 'click':
        t(400, 'square', 0.02, 0.05);
        break;
      case 'victory':
        t(440, 'square', 0.2, 0.1);
        setTimeout(() => t(554, 'square', 0.2, 0.1), 200 / sMod);
        setTimeout(() => t(659, 'square', 0.4, 0.1), 400 / sMod);
        break;
      case 'defeat':
        t(220, 'square', 0.3, 0.1, 110);
        break;
    }
  }
}

export const sounds = new SoundManager();
