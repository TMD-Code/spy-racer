export default class AudioManager {
  constructor(game) {
    this.game = game;
    this.audioContext = game.registry.get('audioContext');
    this.sounds = game.registry.get('sounds') || {};
    this.audioSystemEnabled = game.registry.get('audioEnabled') !== false;
    this.enabled = this.audioSystemEnabled;
    this.musicEnabled = this.audioSystemEnabled;
    this.musicPlaying = false;
    this.musicNodes = [];
    this.masterGain = null;
    this.musicGain = null;
    this.contextResumed = false;

    // Setup master gain
    if (this.audioContext) {
      try {
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.audioContext.destination);

        this.musicGain = this.audioContext.createGain();
        this.musicGain.gain.value = 0.3;
        this.musicGain.connect(this.masterGain);
      } catch (e) {
        console.warn('Failed to setup audio gain nodes:', e.message);
        this.audioSystemEnabled = false;
        this.enabled = false;
        this.musicEnabled = false;
      }
    } else if (this.audioSystemEnabled) {
      console.warn('AudioContext not available - audio disabled');
      this.audioSystemEnabled = false;
      this.enabled = false;
      this.musicEnabled = false;
    }
  }

  // Resume audio context (required by browsers after user interaction)
  async resumeContext() {
    if (!this.audioContext || this.contextResumed) return true;

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      this.contextResumed = true;
      return true;
    } catch (e) {
      console.warn('Failed to resume audio context:', e.message);
      return false;
    }
  }

  play(soundName) {
    if (!this.enabled || !this.audioSystemEnabled || !this.audioContext) return;
    if (!this.sounds[soundName]) return;

    try {
      // Resume audio context if suspended (browser autoplay policy)
      this.resumeContext();

      const source = this.audioContext.createBufferSource();
      source.buffer = this.sounds[soundName];

      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0.5;
      gainNode.connect(this.masterGain);

      source.connect(gainNode);
      source.start();
    } catch (e) {
      // Silently fail - don't spam console for audio issues
    }
  }

  // Start retro-style background music
  startMusic() {
    if (!this.musicEnabled || !this.audioSystemEnabled || !this.audioContext || this.musicPlaying) return;

    try {
      // Resume audio context
      this.resumeContext();

      this.musicPlaying = true;
      this.nextLoopTime = this.audioContext.currentTime;
      this.loopDuration = 1.6; // 8 notes * 0.2s

      // Schedule initial loops and start the scheduler
      this.scheduleMusicAhead();
      this.startMusicScheduler();
    } catch (e) {
      console.warn('Failed to start music:', e.message);
      this.musicPlaying = false;
    }
  }

  // Use a lookahead scheduler for precise timing
  startMusicScheduler() {
    if (!this.musicPlaying) return;

    // Schedule loops ahead using requestAnimationFrame for frame-rate independence
    const scheduleAhead = () => {
      if (!this.musicPlaying || !this.audioContext) return;

      this.scheduleMusicAhead();
      this.schedulerRAF = requestAnimationFrame(scheduleAhead);
    };

    this.schedulerRAF = requestAnimationFrame(scheduleAhead);
  }

  scheduleMusicAhead() {
    if (!this.audioContext) return;

    const currentTime = this.audioContext.currentTime;
    const scheduleAheadTime = 0.5; // Schedule 500ms ahead

    // Schedule loops until we're ahead enough
    while (this.nextLoopTime < currentTime + scheduleAheadTime) {
      this.scheduleOneLoop(this.nextLoopTime);
      this.nextLoopTime += this.loopDuration;
    }
  }

  scheduleOneLoop(startTime) {
    // Bass line (driving rhythm)
    const bassNotes = [110, 110, 146.83, 146.83, 130.81, 130.81, 146.83, 164.81];
    const noteDuration = 0.2;

    bassNotes.forEach((freq, i) => {
      this.scheduleNote(freq, startTime + i * noteDuration, noteDuration * 0.8, 'square', 0.15);
    });

    // Melody (simple arpeggios)
    const melodyNotes = [330, 392, 440, 392, 349, 392, 330, 294];
    melodyNotes.forEach((freq, i) => {
      if (i % 2 === 0) {
        this.scheduleNote(freq, startTime + i * noteDuration, noteDuration * 0.5, 'square', 0.08);
      }
    });

    // Hi-hat rhythm
    for (let i = 0; i < 8; i++) {
      this.scheduleNoise(startTime + i * noteDuration, 0.05, 0.03);
    }
  }

  scheduleNote(frequency, startTime, duration, type = 'square', volume = 0.1) {
    if (!this.audioContext || !this.musicGain) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(volume * 0.7, startTime + duration * 0.5);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.musicGain);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.1);

    this.musicNodes.push({ oscillator, gainNode });
  }

  scheduleNoise(startTime, duration, volume = 0.05) {
    if (!this.audioContext || !this.musicGain) return;

    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    filter.type = 'highpass';
    filter.frequency.value = 8000;

    gainNode.gain.setValueAtTime(volume, startTime);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.musicGain);

    source.start(startTime);
  }

  stopMusic() {
    this.musicPlaying = false;

    // Cancel the scheduler
    if (this.schedulerRAF) {
      cancelAnimationFrame(this.schedulerRAF);
      this.schedulerRAF = null;
    }

    // Clean up music nodes
    this.musicNodes.forEach(({ oscillator, gainNode }) => {
      try {
        oscillator.stop();
        oscillator.disconnect();
        gainNode.disconnect();
      } catch (e) {
        // Ignore errors from already stopped nodes
      }
    });
    this.musicNodes = [];
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;

    if (this.musicEnabled && !this.musicPlaying) {
      this.startMusic();
    } else if (!this.musicEnabled) {
      this.stopMusic();
    }

    return this.musicEnabled;
  }

  toggle() {
    this.enabled = !this.enabled;

    if (!this.enabled) {
      this.stopMusic();
    }

    return this.enabled;
  }

  setMusicVolume(volume) {
    if (this.musicGain) {
      this.musicGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  setSFXVolume(volume) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }
}
