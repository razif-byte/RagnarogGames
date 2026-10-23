// Advanced Audio Engine for Ragnarok: Chronicles of Midgarts
// Supports permanent MP3 background music playback with IndexedDB persistence,
// custom file upload, and procedural Web Audio SFX.

const DB_NAME = 'ragnarok_audio_db';
const STORE_NAME = 'music_store';
const KEY_PERMANENT_BGM = 'permanent_custom_bgm';
const KEY_BGM_TITLE = 'permanent_bgm_title';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private bgmAudio: HTMLAudioElement | null = null;
  private bgmVolume: number = 0.65;
  private isBgmPlaying: boolean = false;
  private currentTrackTitle: string = 'Ini Peringatan (Nasadef Theme)';
  private isCustomTrack: boolean = false;

  constructor() {
    this.initAudioElement();
    this.restorePermanentBgm();
  }

  private initAudioElement() {
    if (typeof window === 'undefined') return;
    if (!this.bgmAudio) {
      this.bgmAudio = new Audio();
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = this.bgmVolume;
      this.bgmAudio.crossOrigin = 'anonymous';
      this.bgmAudio.src = '/bgm.mp3';

      this.bgmAudio.addEventListener('error', (e) => {
        console.warn('BGM Audio element load notice (fallback to procedural):', e);
      });
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- IndexedDB Storage for Permanent Custom MP3 ---
  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }
      const req = window.indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  public async savePermanentBgm(file: Blob, title: string = 'Custom User MP3'): Promise<void> {
    try {
      const db = await this.openDb();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(file, KEY_PERMANENT_BGM);
      store.put(title, KEY_BGM_TITLE);

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      // Instantly load and play
      this.loadBlobAsBgm(file, title);
    } catch (err) {
      console.error('Failed to save permanent MP3 to IndexedDB:', err);
      throw err;
    }
  }

  public async restorePermanentBgm(): Promise<boolean> {
    try {
      const db = await this.openDb();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      const blobReq = store.get(KEY_PERMANENT_BGM);
      const titleReq = store.get(KEY_BGM_TITLE);

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      if (blobReq.result instanceof Blob) {
        const title = (titleReq.result as string) || 'Custom BGM';
        this.loadBlobAsBgm(blobReq.result, title);
        return true;
      }
    } catch {
      // Default to /bgm.mp3
    }
    return false;
  }

  public async resetToDefaultBgm(): Promise<void> {
    try {
      const db = await this.openDb();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(KEY_PERMANENT_BGM);
      store.delete(KEY_BGM_TITLE);
    } catch {
      // Ignore
    }

    this.isCustomTrack = false;
    this.currentTrackTitle = 'Ini Peringatan (Nasadef Theme)';
    if (this.bgmAudio) {
      const wasPlaying = this.isBgmPlaying;
      this.bgmAudio.pause();
      this.bgmAudio.src = '/bgm.mp3';
      if (wasPlaying && !this.muted) {
        this.bgmAudio.play().catch(() => {});
      }
    }
  }

  private loadBlobAsBgm(blob: Blob, title: string) {
    if (!this.bgmAudio) this.initAudioElement();
    if (!this.bgmAudio) return;

    const objectUrl = URL.createObjectURL(blob);
    const wasPlaying = this.isBgmPlaying;
    this.bgmAudio.pause();
    this.bgmAudio.src = objectUrl;
    this.currentTrackTitle = title;
    this.isCustomTrack = true;

    if (wasPlaying && !this.muted) {
      this.bgmAudio.play().catch(() => {});
    }
  }

  // --- Background Music Controls ---
  public startPronteraBgm() {
    this.startBgm();
  }

  public startBgm() {
    if (this.muted) return;
    this.initAudioElement();
    if (!this.bgmAudio) return;

    this.bgmAudio.volume = this.bgmVolume;
    this.bgmAudio
      .play()
      .then(() => {
        this.isBgmPlaying = true;
      })
      .catch((err) => {
        console.warn('Autoplay waiting for user gesture:', err);
      });
  }

  public stopBgm() {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.isBgmPlaying = false;
    }
  }

  public setBgmVolume(vol: number) {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.bgmVolume;
    }
  }

  public getBgmVolume(): number {
    return this.bgmVolume;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.bgmAudio) {
      if (muted) {
        this.bgmAudio.pause();
      } else if (this.isBgmPlaying) {
        this.bgmAudio.play().catch(() => {});
      }
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public getTrackInfo(): { title: string; isCustom: boolean; isPlaying: boolean } {
    return {
      title: this.currentTrackTitle,
      isCustom: this.isCustomTrack,
      isPlaying: this.isBgmPlaying,
    };
  }

  // --- Procedural Sound Effects (SFX) ---
  public playAttackSwing() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.12);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.13);
  }

  public playHit() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.11);
  }

  public playCritical() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.08);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1320, this.ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(2640, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.25);
    osc2.stop(this.ctx.currentTime + 0.25);
  }

  public playPoringBounce() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.08);
    osc.frequency.exponentialRampToValueAtTime(350, this.ctx.currentTime + 0.16);

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.19);
  }

  public playMagicCast() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1040, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.31);
  }

  public playLevelUp() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.12);

      gain.gain.setValueAtTime(0.0, this.ctx!.currentTime + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.2, this.ctx!.currentTime + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.12 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(this.ctx!.currentTime + idx * 0.12);
      osc.stop(this.ctx!.currentTime + idx * 0.12 + 0.4);
    });
  }

  public playHeal() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.08);

      gain.gain.setValueAtTime(0.12, this.ctx!.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.005, this.ctx!.currentTime + idx * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(this.ctx!.currentTime + idx * 0.08);
      osc.stop(this.ctx!.currentTime + idx * 0.08 + 0.32);
    });
  }

  public playClick() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }
}

export const sound = new SoundEngine();
