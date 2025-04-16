import type { IChannel, IConduit } from "conductor/dist/conduit";
import { SoundModuleString } from "../../strings";
import { makeRpc } from "conductor/dist/conduit/rpc";
import type { ISoundHostRpc } from "../../types/ISoundHostRpc";

class SoundWebHostPlugin {
    audioplayer: AudioContext = new AudioContext();

    isPlaying: boolean = false;

    async record(_fs: number, duration?: number) {
        //
    }

    play(channel: Float32Array, fs: number) {
        const buf = this.audioplayer.createBuffer(1, channel.length, fs);
        buf.copyToChannel(channel, 0);
        const src = this.audioplayer.createBufferSource();
        src.buffer = buf;
        src.connect(this.audioplayer.destination);
        src.onended = () => {
            src.disconnect(this.audioplayer.destination);
        };
        src.start();
    }

    displaySound(wavBuffer: ArrayBuffer) {
        //
    }

    stop() {
        this.audioplayer.close();
    }

    static readonly channelAttach = [SoundModuleString.SOUND_CHANNEL];
    constructor(conduit: IConduit, [soundChannel]: IChannel<any>[]) {
        makeRpc<ISoundHostRpc, {}>(soundChannel, {
            $play: this.play.bind(this),
            $displaySound: this.displaySound.bind(this),
            $stop: this.stop.bind(this),
            record: this.record.bind(this),
        });
    }
}

export { SoundWebHostPlugin as plugin };
