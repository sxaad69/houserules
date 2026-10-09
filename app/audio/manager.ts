import { Audio } from 'expo-av';

// ponytail: one AudioManager owns all sound. Music crossfades between
// lobby/table tracks; SFX are fire-and-forget one-shots. Everything
// no-ops gracefully if a file is missing or audio is disabled.

export type MusicTrack = 'lobby' | 'table';
export type SfxName =
  | 'cardPlay'
  | 'cardDraw'
  | 'shuffle'
  | 'yourTurn'
  | 'win'
  | 'lose'
  | 'tap'
  | 'wild'
  | 'skip'
  | 'reverse'
  | 'drawPenalty'
  | 'gift'
  | 'emote'
  | 'tick'
  | 'join'
  | 'error';

const MUSIC_FILES: Record<MusicTrack, any> = {
  // Bundled via require — Metro picks these up from assets/audio/.
  lobby: require('../assets/audio/music-lobby.mp3'),
  table: require('../assets/audio/music-table.mp3'),
};

const SFX_FILES: Record<SfxName, any> = {
  cardPlay: require('../assets/audio/sfx-card-play.mp3'),
  cardDraw: require('../assets/audio/sfx-card-draw.mp3'),
  shuffle: require('../assets/audio/sfx-shuffle.mp3'),
  yourTurn: require('../assets/audio/sfx-your-turn.mp3'),
  win: require('../assets/audio/sfx-win.mp3'),
  lose: require('../assets/audio/sfx-lose.mp3'),
  tap: require('../assets/audio/sfx-tap.mp3'),
  wild: require('../assets/audio/sfx-wild.mp3'),
  skip: require('../assets/audio/sfx-skip.mp3'),
  reverse: require('../assets/audio/sfx-reverse.mp3'),
  drawPenalty: require('../assets/audio/sfx-draw-penalty.mp3'),
  gift: require('../assets/audio/sfx-gift.mp3'),
  emote: require('../assets/audio/sfx-emote.mp3'),
  tick: require('../assets/audio/sfx-tick.mp3'),
  join: require('../assets/audio/sfx-join.mp3'),
  error: require('../assets/audio/sfx-error.mp3'),
};

class AudioManager {
  private musicSound: Audio.Sound | null = null;
  private currentTrack: MusicTrack | null = null;
  private sfxCache = new Map<SfxName, Audio.Sound>();
  private musicEnabled = true;
  private sfxEnabled = true;
  private musicVolume = 0.5;
  private sfxVolume = 0.8;
  private initialized = false;

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch {
      // audio unavailable — everything below no-ops
    }
  }

  setMusicEnabled(on: boolean) {
    this.musicEnabled = on;
    if (!on) this.stopMusic();
    else if (this.currentTrack) this.playMusic(this.currentTrack);
  }

  setSfxEnabled(on: boolean) {
    this.sfxEnabled = on;
  }

  setMusicVolume(v: number) {
    this.musicVolume = v;
    this.musicSound?.setVolumeAsync(v).catch(() => {});
  }

  setSfxVolume(v: number) {
    this.sfxVolume = v;
  }

  async playMusic(track: MusicTrack) {
    await this.init();
    if (!this.musicEnabled) {
      this.currentTrack = track; // remember for when re-enabled
      return;
    }
    if (this.currentTrack === track && this.musicSound) {
      try {
        const st = await this.musicSound.getStatusAsync();
        if (st.isLoaded && st.isPlaying) return;
        await this.musicSound.playAsync();
        return;
      } catch {
        // fall through to reload
      }
    }
    try {
      // Fade out old track, then swap.
      const old = this.musicSound;
      this.musicSound = null;
      this.currentTrack = track;
      if (old) {
        old.stopAsync().catch(() => {});
        old.unloadAsync().catch(() => {});
      }
      const { sound } = await Audio.Sound.createAsync(MUSIC_FILES[track], {
        isLooping: true,
        volume: this.musicVolume,
      });
      this.musicSound = sound;
      await sound.playAsync();
    } catch {
      // missing file — stay silent
    }
  }

  async stopMusic() {
    try {
      await this.musicSound?.stopAsync();
    } catch {
      // noop
    }
  }

  async playSfx(name: SfxName) {
    await this.init();
    if (!this.sfxEnabled) return;
    try {
      let sound = this.sfxCache.get(name);
      if (!sound) {
        const { sound: s } = await Audio.Sound.createAsync(SFX_FILES[name], {
          volume: this.sfxVolume,
        });
        sound = s;
        this.sfxCache.set(name, s);
      } else {
        await sound.setVolumeAsync(this.sfxVolume).catch(() => {});
        await sound.setPositionAsync(0).catch(() => {});
      }
      await sound.playAsync();
    } catch {
      // missing file — stay silent
    }
  }

  async unload() {
    for (const s of this.sfxCache.values()) {
      s.unloadAsync().catch(() => {});
    }
    this.sfxCache.clear();
    this.musicSound?.unloadAsync().catch(() => {});
    this.musicSound = null;
    this.currentTrack = null;
  }
}

export const audioManager = new AudioManager();
