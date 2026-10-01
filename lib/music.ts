// Generative background score (WebAudio), changes with the era of Gogol's life. Stub.
export interface Music { setStation(i: number, moving: boolean): void; setEnabled(on: boolean): void; dispose(): void }
export function createMusic(_ctx: AudioContext, _out: AudioNode): Music {
  return { setStation() {}, setEnabled() {}, dispose() {} };
}
