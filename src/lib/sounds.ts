
/**
 * Arroba Sound System
 * Synthesizes UI sound effects using Web Audio API to avoid external asset dependencies.
 */

class SoundSystem {
  private context: AudioContext | null = null;
  private enabled: boolean = true;

  private init() {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    if (!this.enabled) return;
    this.init();
    if (!this.context) return;

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.context.currentTime);

    gain.gain.setValueAtTime(volume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.context.destination);

    osc.start();
    osc.stop(this.context.currentTime + duration);
  }

  // Effect: Subtle UI Click
  playClick() {
    this.playTone(800, 'sine', 0.1, 0.05);
  }

  // Effect: Notification Chime
  playChime() {
    this.playTone(523.25, 'sine', 0.5, 0.1); // C5
    setTimeout(() => this.playTone(659.25, 'sine', 0.5, 0.1), 100); // E5
  }

  // Effect: Message Sent (Woosh/Pop)
  playSent() {
    if (!this.enabled) return;
    this.init();
    if (!this.context) return;
    
    const duration = 0.2;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.context.currentTime + duration);
    
    gain.gain.setValueAtTime(0.1, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.context.destination);
    
    osc.start();
    osc.stop(this.context.currentTime + duration);
  }

  // Effect: Subtle Alert
  playAlert() {
    this.playTone(1000, 'triangle', 0.2, 0.05);
  }

  private loopInterval: any = null;

  // Effect: Incoming Call Ringtone (Melodic Loop)
  playRingtone() {
    this.stopAll();
    this.init();
    
    const playMelody = () => {
      // Harmonic sequence (A4 -> C5 -> E5 -> A5)
      this.playTone(440.00, 'sine', 0.4, 0.08); // A4
      setTimeout(() => this.playTone(523.25, 'sine', 0.4, 0.08), 200); // C5
      setTimeout(() => this.playTone(659.25, 'sine', 0.4, 0.08), 400); // E5
      setTimeout(() => this.playTone(880.00, 'sine', 0.6, 0.08), 600); // A5
    };

    playMelody();
    this.loopInterval = setInterval(playMelody, 2000);
  }

  // Effect: Outgoing Call (Waiting Tone)
  playCalling() {
    this.stopAll();
    this.init();
    
    const playTone = () => {
      this.playTone(440, 'sine', 0.8, 0.05);
      setTimeout(() => this.playTone(480, 'sine', 0.8, 0.05), 50);
    };

    playTone();
    this.loopInterval = setInterval(playTone, 2000);
  }

  stopAll() {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
  }
}

export const soundManager = new SoundSystem();
