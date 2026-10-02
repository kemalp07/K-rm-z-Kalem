import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { sfxFiles } from '../../assets/sfx/manifest';

export type SfxId = 'envelope_tear' | 'paper' | 'pen' | 'stamp' | 'flame' | 'candle' | 'drawer';

const players = new Map<SfxId, AudioPlayer>();

function player(id: SfxId): AudioPlayer | undefined {
  const source = sfxFiles[id];
  if (source === undefined) return undefined; // no file yet: stay silent
  let p = players.get(id);
  if (!p) {
    try {
      p = createAudioPlayer(source);
    } catch {
      return undefined;
    }
    players.set(id, p);
  }
  return p;
}

export function playSfx(id: SfxId, volume = 1): void {
  const p = player(id);
  if (!p) return;
  p.volume = volume;
  p.seekTo(0).catch(() => {});
  p.play();
}

export function loopSfx(id: SfxId, volume: number): void {
  const p = player(id);
  if (!p) return;
  p.loop = true;
  p.volume = volume;
  if (!p.playing) p.play();
}

export function setLoopVolume(id: SfxId, volume: number): void {
  const p = players.get(id);
  if (p) p.volume = volume;
}
