import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { audioManager } from '../audio/manager';

// ponytail: audio preferences live here; the manager does the playing.

interface AudioState {
  musicOn: boolean;
  setMusicOn: (v: boolean) => void;
  musicVolume: number;
  setMusicVolume: (v: number) => void;
  sfxOn: boolean;
  setSfxOn: (v: boolean) => void;
  sfxVolume: number;
  setSfxVolume: (v: number) => void;
}

const AudioContext = createContext<AudioState | null>(null);

const K = {
  musicOn: '@houserules:audio/musicOn/v1',
  musicVolume: '@houserules:audio/musicVolume/v1',
  sfxOn: '@houserules:audio/sfxOn/v1',
  sfxVolume: '@houserules:audio/sfxVolume/v1',
};

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [musicOn, setMusicOnState] = useState(true);
  const [musicVolume, setMusicVolumeState] = useState(0.5);
  const [sfxOn, setSfxOnState] = useState(true);
  const [sfxVolume, setSfxVolumeState] = useState(0.8);

  useEffect(() => {
    (async () => {
      const [mo, mv, so, sv] = await Promise.all([
        AsyncStorage.getItem(K.musicOn),
        AsyncStorage.getItem(K.musicVolume),
        AsyncStorage.getItem(K.sfxOn),
        AsyncStorage.getItem(K.sfxVolume),
      ]);
      if (mo !== null) {
        const on = mo === '1';
        setMusicOnState(on);
        audioManager.setMusicEnabled(on);
      }
      if (mv !== null) {
        const v = parseFloat(mv);
        if (!Number.isNaN(v)) {
          setMusicVolumeState(v);
          audioManager.setMusicVolume(v);
        }
      }
      if (so !== null) {
        const on = so === '1';
        setSfxOnState(on);
        audioManager.setSfxEnabled(on);
      }
      if (sv !== null) {
        const v = parseFloat(sv);
        if (!Number.isNaN(v)) {
          setSfxVolumeState(v);
          audioManager.setSfxVolume(v);
        }
      }
      audioManager.init();
    })();
  }, []);

  const setMusicOn = useCallback((v: boolean) => {
    setMusicOnState(v);
    audioManager.setMusicEnabled(v);
    AsyncStorage.setItem(K.musicOn, v ? '1' : '0');
  }, []);

  const setMusicVolume = useCallback((v: number) => {
    setMusicVolumeState(v);
    audioManager.setMusicVolume(v);
    AsyncStorage.setItem(K.musicVolume, String(v));
  }, []);

  const setSfxOn = useCallback((v: boolean) => {
    setSfxOnState(v);
    audioManager.setSfxEnabled(v);
    AsyncStorage.setItem(K.sfxOn, v ? '1' : '0');
  }, []);

  const setSfxVolume = useCallback((v: number) => {
    setSfxVolumeState(v);
    audioManager.setSfxVolume(v);
    AsyncStorage.setItem(K.sfxVolume, String(v));
  }, []);

  const value = useMemo(
    () => ({
      musicOn,
      setMusicOn,
      musicVolume,
      setMusicVolume,
      sfxOn,
      setSfxOn,
      sfxVolume,
      setSfxVolume,
    }),
    [musicOn, setMusicOn, musicVolume, setMusicVolume, sfxOn, setSfxOn, sfxVolume, setSfxVolume],
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio() {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio must be used within AudioProvider');
  return ctx;
}
