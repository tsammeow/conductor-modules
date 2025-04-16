export interface ISoundHostRpc {
  $play(sound: Float32Array, fs: number): void;
  $displaySound(wavBuffer: ArrayBuffer): void;
  $stop(): void;
  record(fs: number, duration?: number): any;
}
