/**
 * The sounds library provides functions for constructing and playing sounds.
 *
 * A wave is a function that takes in a number `t` and returns
 * a number representing the amplitude at time `t`.
 * The amplitude should fall within the range of [-1, 1].
 *
 * A Sound is a pair(wave, duration) where duration is the length of the sound in seconds.
 * The constructor make_sound and accessors get_wave and get_duration are provided.
 *
 * Sound Discipline:
 * For all sounds, the wave function applied to and time `t` beyond its duration returns 0, that is:
 * `(get_wave(sound))(get_duration(sound) + x) === 0` for any x >= 0.
 *
 * Two functions which combine Sounds, `consecutively` and `simultaneously` are given.
 * Additionally, we provide sound transformation functions `adsr` and `phase_mod`
 * which take in a Sound and return a Sound.
 *
 * Finally, the provided `play` function takes in a Sound and plays it using your
 * computer's sound system.
 *
 * @module sound
 * @author Koh Shang Hui
 * @author Samyukta Sounderraman
 */

import type { IChannel, IConduit } from 'conductor/dist/conduit';
import type { Remote } from 'conductor/dist/conduit/rpc/types/Remote';
import type { IPlugin } from 'conductor/dist/conduit/types/IPlugin';
import { makeRpc } from 'conductor/dist/conduit/rpc';
import {
  pair,
  head,
  tail,
  list,
  length,
  is_null,
  is_pair,
  accumulate,
  type List
} from 'js-slang/dist/stdlib/list';

import { audioBufferToWav } from "./wav";
import type {
  Wave,
  Sound,
  SoundProducer,
  SoundTransformer
} from './types';
import { SoundModuleString } from '../strings';
import type { ISoundHostRpc } from '../types/ISoundHostRpc';

// Global Constants and Variables
const FS: number = 44100; // Output sample rate
const fourier_expansion_level: number = 5; // fourier expansion level

class SoundModulePlugin implements IPlugin {
  readonly name = SoundModuleString.SOUND_MODULE_NAME;
  readonly host: Remote<ISoundHostRpc>;

  readonly exports = [
    "adsr",
    "bell",
    "cello",
    "consecutively",
    "get_duration",
    "get_wave",
    "init_record",
    "is_sound",
    "letter_name_to_frequency",
    "letter_name_to_midi_note",
    "make_sound",
    "midi_note_to_frequency",
    "noise_sound",
    "phase_mod",
    "piano",
    "play_in_tab",
    "play",
    "play_wave",
    "record",
    "record_for",
    "sawtooth_sound",
    "silence_sound",
    "simultaneously",
    "sine_sound",
    "square_sound",
    "stacking_adsr",
    "stop",
    "triangle_sound",
    "trombone",
    "violin"
  ];

  // linear decay from 1 to 0 over decay_period
  static linear_decay(decay_period: number): (t: number) => number {
    return (t) => {
      if (t > decay_period || t < 0) {
        return 0;
      }
      return 1 - t / decay_period;
    };
  }

  /**
   * Records a sound until the returned stop function is called.
   * Takes a <CODE>buffer</CODE> duration (in seconds) as argument, and
   * returns a nullary stop function <CODE>stop</CODE>. A call
   * <CODE>stop()</CODE> returns a Sound promise: a nullary function
   * that returns a Sound. Example: <PRE><CODE>init_record();
   * const stop = record(0.5);
   * // record after 0.5 seconds. Then in next query:
   * const promise = stop();
   * // In next query, you can play the promised sound, by
   * // applying the promise:
   * play(promise());</CODE></PRE>
   * @param buffer - pause before recording, in seconds
   * @returns nullary <CODE>stop</CODE> function;
   * <CODE>stop()</CODE> stops the recording and
   * returns a Sound promise: a nullary function that returns the recorded Sound
   */
  record(buffer: number): Sound {
    // TODO
    throw new Error("unimplemented");
    const recording = this.host.record(FS);
    return recording;
  }

  /**
   * Records a sound of given <CODE>duration</CODE> in seconds, after
   * a <CODE>buffer</CODE> also in seconds, and
   * returns a Sound promise: a nullary function
   * that returns a Sound. Example: <PRE><CODE>init_record();
   * const promise = record_for(2, 0.5);
   * // In next query, you can play the promised Sound, by
   * // applying the promise:
   * play(promise());</CODE></PRE>
   * @param duration duration in seconds
   * @param buffer pause before recording, in seconds
   * @return <CODE>promise</CODE>: nullary function which returns recorded Sound
   */
  record_for(duration: number, buffer: number): Sound {
    // TODO
    throw new Error("unimplemented");
    const recording = this.host.record(FS, duration);
    return recording;
  }

  /**
   * Makes a Sound with given wave function and duration.
   * The wave function is a function: number -> number
   * that takes in a non-negative input time and returns an amplitude
   * between -1 and 1.
   *
   * @param wave wave function of the Sound
   * @param duration duration of the Sound
   * @return with wave as wave function and duration as duration
   * @example const s = make_sound(t => Math_sin(2 * Math_PI * 440 * t), 5);
   */
  make_sound(wave: Wave, duration: number): Sound {
    if (duration < 0) {
      throw new Error('Sound duration must be greater than or equal to 0');
    }

    return pair((t: number) => (t >= duration ? 0 : wave(t)), duration);
  }

  /**
   * Accesses the wave function of a given Sound.
   *
   * @param sound given Sound
   * @return the wave function of the Sound
   * @example get_wave(make_sound(t => Math_sin(2 * Math_PI * 440 * t), 5)); // Returns t => Math_sin(2 * Math_PI * 440 * t)
   */
  get_wave(sound: Sound): Wave {
    return head(sound);
  }

  /**
   * Accesses the duration of a given Sound.
   *
   * @param sound given Sound
   * @return the duration of the Sound
   * @example get_duration(make_sound(t => Math_sin(2 * Math_PI * 440 * t), 5)); // Returns 5
   */
  get_duration(sound: Sound): number {
    return tail(sound);
  }

  /**
   * Checks if the argument is a Sound
   *
   * @param x input to be checked
   * @return true if x is a Sound, false otherwise
   * @example is_sound(make_sound(t => 0, 2)); // Returns true
   */
  is_sound(x: any): x is Sound {
    return (
      is_pair(x)
      && typeof this.get_wave(x) === 'function'
      && typeof this.get_duration(x) === 'number'
    );
  }

  /**
   * Samples a given Sound.
   * @param sound the Sound to be sampled
   * @param fs the sampling frequency
   * @returns {Float32Array} the sound samples
   */
  sample(sound: Sound, fs: number): Float32Array {
    const wave = this.get_wave(sound);
    const duration = this.get_duration(sound);
    const numSamples = Math.ceil(fs * duration);
    const channel = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; ++i) {
        let amp = wave(i / fs);
        if (amp > 1) {
            amp = 1;
        } else if (amp < -1) {
            amp = -1;
        }
        channel[i] = amp;
    }
    return channel;
  }

  /**
   * Converts an array of sound samples to wav format.
   * @param channel the sound channel to be converted
   * @param fs the sampling frequency
   * @returns {ArrayBuffer} the wav file
   */
  static channelToWav(channel: Float32Array, fs: number): ArrayBuffer {
      const buffer = audioBufferToWav(fs, [channel]);
      return buffer;
  }

  /**
   * Plays the given Wave using the computer’s sound device, for the duration
   * given in seconds.
   *
   * @param wave the wave function to play, starting at 0
   * @return the resulting Sound
   * @example play_wave(t => math_sin(t * 3000), 5);
   */
  play_wave(wave: Wave, duration: number): Sound {
    return this.play(this.make_sound(wave, duration));
  }

  /**
   * Plays the given Sound using the computer’s sound device.
   * The sound is added to a list of sounds to be played one-at-a-time
   * in a Source Academy tab.
   *
   * @param sound the Sound to play
   * @return the given Sound
   * @example play_in_tab(sine_sound(440, 5));
   */
  play_in_tab(sound: Sound): Sound {
    // Type-check sound
    if (!this.is_sound(sound)) {
      throw new Error(`${this.play_in_tab.name} is expecting sound, but encountered ${sound}`);
    } else if (this.get_duration(sound) < 0) {
      throw new Error(`${this.play_in_tab.name}: duration of sound is negative`);
    } else if (this.get_duration(sound) === 0) {
      return sound;
    } else {
      const channel = this.sample(sound, FS);
      const wavBuffer = SoundModulePlugin.channelToWav(channel, FS);
      this.host.$displaySound(wavBuffer);
      return sound;
    }
  }

  /**
   * Plays the given Sound using the computer’s sound device
   * on top of any Sounds that are currently playing.
   *
   * @param sound the Sound to play
   * @return the given Sound
   * @example play(sine_sound(440, 5));
   */
  play(sound: Sound): Sound {
    // Type-check sound
    if (!this.is_sound(sound)) {
      throw new Error(
        `${this.play.name} is expecting sound, but encountered ${sound}`
      );
    } else if (this.get_duration(sound) < 0) {
      throw new Error(`${this.play.name}: duration of sound is negative`);
    } else if (this.get_duration(sound) === 0) {
      return sound;
    } else {
      const channel = this.sample(sound, FS);
      this.host.$play(channel, FS);
      return sound;
    }
  }

  /**
   * Stops all currently playing sounds.
   */
  stop(): void {
    this.host.$stop();
  }

  /**
   * Makes a noise Sound with given duration
   *
   * @param duration the duration of the noise sound
   * @return resulting noise Sound
   * @example noise_sound(5);
   */
  noise_sound(duration: number): Sound {
    return this.make_sound((_t) => Math.random() * 2 - 1, duration);
  }

  /**
   * Makes a silence Sound with given duration
   *
   * @param duration the duration of the silence Sound
   * @return resulting silence Sound
   * @example silence_sound(5);
   */
  silence_sound(duration: number): Sound {
    return this.make_sound((_t) => 0, duration);
  }

  /**
   * Makes a sine wave Sound with given frequency and duration
   *
   * @param freq the frequency of the sine wave Sound
   * @param duration the duration of the sine wave Sound
   * @return resulting sine wave Sound
   * @example sine_sound(440, 5);
   */
  sine_sound(freq: number, duration: number): Sound {
    return this.make_sound((t) => Math.sin(2 * Math.PI * t * freq), duration);
  }

  /**
   * Makes a square wave Sound with given frequency and duration
   *
   * @param freq the frequency of the square wave Sound
   * @param duration the duration of the square wave Sound
   * @return resulting square wave Sound
   * @example square_sound(440, 5);
   */
  square_sound(f: number, duration: number): Sound {
    function fourier_expansion_square(t: number) {
      let answer = 0;
      for (let i = 1; i <= fourier_expansion_level; i += 1) {
        answer += Math.sin(2 * Math.PI * (2 * i - 1) * f * t) / (2 * i - 1);
      }
      return answer;
    }
    return this.make_sound(
      (t) => (4 / Math.PI) * fourier_expansion_square(t),
      duration
    );
  }

  /**
   * Makes a triangle wave Sound with given frequency and duration
   *
   * @param freq the frequency of the triangle wave Sound
   * @param duration the duration of the triangle wave Sound
   * @return resulting triangle wave Sound
   * @example triangle_sound(440, 5);
   */
  triangle_sound(freq: number, duration: number): Sound {
    function fourier_expansion_triangle(t: number) {
      let answer = 0;
      for (let i = 0; i < fourier_expansion_level; i += 1) {
        answer
          += ((-1) ** i * Math.sin((2 * i + 1) * t * freq * Math.PI * 2))
          / (2 * i + 1) ** 2;
      }
      return answer;
    }
    return this.make_sound(
      (t) => (8 / Math.PI / Math.PI) * fourier_expansion_triangle(t),
      duration
    );
  }

  /**
   * Makes a sawtooth wave Sound with given frequency and duration
   *
   * @param freq the frequency of the sawtooth wave Sound
   * @param duration the duration of the sawtooth wave Sound
   * @return resulting sawtooth wave Sound
   * @example sawtooth_sound(440, 5);
   */
  sawtooth_sound(freq: number, duration: number): Sound {
    function fourier_expansion_sawtooth(t: number) {
      let answer = 0;
      for (let i = 1; i <= fourier_expansion_level; i += 1) {
        answer += Math.sin(2 * Math.PI * i * freq * t) / i;
      }
      return answer;
    }
    return this.make_sound(
      (t) => 1 / 2 - (1 / Math.PI) * fourier_expansion_sawtooth(t),
      duration
    );
  }

  /**
   * Makes a new Sound by combining the sounds in a given list
   * where the second Sound is appended to the end of the first Sound,
   * the third Sound is appended to the end of the second Sound, and
   * so on. The effect is that the Sounds in the list are joined end-to-end
   *
   * @param list_of_sounds given list of Sounds
   * @return the combined Sound
   * @example consecutively(list(sine_sound(200, 2), sine_sound(400, 3)));
   */
  consecutively(list_of_sounds: List): Sound {
    const consec_two = (ss1: Sound, ss2: Sound) => {
      const wave1 = this.get_wave(ss1);
      const wave2 = this.get_wave(ss2);
      const dur1 = this.get_duration(ss1);
      const dur2 = this.get_duration(ss2);
      const new_wave = (t: number) => (t < dur1 ? wave1(t) : wave2(t - dur1));
      return this.make_sound(new_wave, dur1 + dur2);
    }
    return accumulate(consec_two, this.silence_sound(0), list_of_sounds);
  }

  /**
   * Makes a new Sound by combining the Sounds in a given list.
   * In the result sound, the component sounds overlap such that
   * they start at the beginning of the result sound. To achieve
   * this, the amplitudes of the component sounds are added together
   * and then divided by the length of the list.
   *
   * @param list_of_sounds given list of Sounds
   * @return the combined Sound
   * @example simultaneously(list(sine_sound(200, 2), sine_sound(400, 3)))
   */
  simultaneously(list_of_sounds: List): Sound {
    const simul_two = (ss1: Sound, ss2: Sound) => {
      const wave1 = this.get_wave(ss1);
      const wave2 = this.get_wave(ss2);
      const dur1 = this.get_duration(ss1);
      const dur2 = this.get_duration(ss2);
      // new_wave assumes sound discipline (ie, wave(t) = 0 after t > dur)
      const new_wave = (t: number) => wave1(t) + wave2(t);
      // new_dur is higher of the two dur
      const new_dur = dur1 < dur2 ? dur2 : dur1;
      return this.make_sound(new_wave, new_dur);
    }

    const mushed_sounds = accumulate(simul_two, this.silence_sound(0), list_of_sounds);
    const len = length(list_of_sounds);
    const normalised_wave = (t: number) => head(mushed_sounds)(t) / len;
    const highest_duration = tail(mushed_sounds);
    return this.make_sound(normalised_wave, highest_duration);
  }

  /**
   * Returns an envelope: a function from Sound to Sound.
   * When the adsr envelope is applied to a Sound, it returns
   * a new Sound with its amplitude modified according to parameters
   * The relative amplitude increases from 0 to 1 linearly over the
   * attack proportion, then decreases from 1 to sustain level over the
   * decay proportion, and remains at that level until the release
   * proportion when it decays back to 0.
   * @param attack_ratio proportion of Sound in attack phase
   * @param decay_ratio proportion of Sound decay phase
   * @param sustain_level sustain level between 0 and 1
   * @param release_ratio proportion of Sound in release phase
   * @return Envelope a function from Sound to Sound
   * @example adsr(0.2, 0.3, 0.3, 0.1)(sound);
   */
  adsr(
    attack_ratio: number,
    decay_ratio: number,
    sustain_level: number,
    release_ratio: number
  ): SoundTransformer {
    return (sound) => {
      const wave = this.get_wave(sound);
      const duration = this.get_duration(sound);
      const attack_time = duration * attack_ratio;
      const decay_time = duration * decay_ratio;
      const release_time = duration * release_ratio;
      return this.make_sound((x) => {
        if (x < attack_time) {
          return wave(x) * (x / attack_time);
        }
        if (x < attack_time + decay_time) {
          return (
            ((1 - sustain_level) * SoundModulePlugin.linear_decay(decay_time)(x - attack_time)
              + sustain_level)
            * wave(x)
          );
        }
        if (x < duration - release_time) {
          return wave(x) * sustain_level;
        }
        return (
          wave(x)
          * sustain_level
          * SoundModulePlugin.linear_decay(release_time)(x - (duration - release_time))
        );
      }, duration);
    };
  }

  /**
   * Returns a Sound that results from applying a list of envelopes
   * to a given wave form. The wave form is a Sound generator that
   * takes a frequency and a duration as arguments and produces a
   * Sound with the given frequency and duration. Each envelope is
   * applied to a harmonic: the first harmonic has the given frequency,
   * the second has twice the frequency, the third three times the
   * frequency etc. The harmonics are then layered simultaneously to
   * produce the resulting Sound.
   * @param waveform function from pair(frequency, duration) to Sound
   * @param base_frequency frequency of the first harmonic
   * @param duration duration of the produced Sound, in seconds
   * @param envelopes – list of envelopes, which are functions from Sound to Sound
   * @return Sound resulting Sound
   * @example stacking_adsr(sine_sound, 300, 5, list(adsr(0.1, 0.3, 0.2, 0.5), adsr(0.2, 0.5, 0.6, 0.1), adsr(0.3, 0.1, 0.7, 0.3)));
   */
  stacking_adsr(
    waveform: SoundProducer,
    base_frequency: number,
    duration: number,
    envelopes: List
  ): Sound {
    function zip(lst: List, n: number) {
      if (is_null(lst)) {
        return lst;
      }
      return pair(pair(n, head(lst)), zip(tail(lst), n + 1));
    }

    return this.simultaneously(
      accumulate(
        (x: any, y: any) => pair(tail(x)(waveform(base_frequency * head(x), duration)), y),
        null,
        zip(envelopes, 1)
      )
    );
  }

  /**
   * Returns a Sound transformer which uses its argument
   * to modulate the phase of a (carrier) sine wave
   * of given frequency and duration with a given Sound.
   * Modulating with a low frequency Sound results in a vibrato effect.
   * Modulating with a Sound with frequencies comparable to
   * the sine wave frequency results in more complex wave forms.
   *
   * @param freq the frequency of the sine wave to be modulated
   * @param duration the duration of the output Sound
   * @param amount the amount of modulation to apply to the carrier sine wave
   * @return function which takes in a Sound and returns a Sound
   * @example phase_mod(440, 5, 1)(sine_sound(220, 5));
   */
  phase_mod(
    freq: number,
    duration: number,
    amount: number
  ): SoundTransformer {
    return (modulator: Sound) => this.make_sound(
      (t) => Math.sin(2 * Math.PI * t * freq + amount * this.get_wave(modulator)(t)),
      duration
    );
  }

  /**
   * Converts a letter name to its corresponding MIDI note.
   * The letter name is represented in standard pitch notation.
   * Examples are "A5", "Db3", "C#7".
   * Refer to <a href="https://i.imgur.com/qGQgmYr.png">this mapping from
   * letter name to midi notes.
   *
   * @param letter_name given letter name
   * @return the corresponding midi note
   * @example letter_name_to_midi_note("C4"); // Returns 60
   */
  letter_name_to_midi_note(note: string): number {
    let res = 12; // C0 is midi note 12
    const n = note[0].toUpperCase();
    switch (n) {
      case 'D':
        res += 2;
        break;

      case 'E':
        res += 4;
        break;

      case 'F':
        res += 5;
        break;

      case 'G':
        res += 7;
        break;

      case 'A':
        res += 9;
        break;

      case 'B':
        res += 11;
        break;

      default:
        break;
    }

    if (note.length === 2) {
      res += parseInt(note[1]) * 12;
    } else if (note.length === 3) {
      switch (note[1]) {
        case '#':
          res += 1;
          break;

        case 'b':
          res -= 1;
          break;

        default:
          break;
      }
      res += parseInt(note[2]) * 12;
    }
    return res;
  }

  /**
   * Converts a MIDI note to its corresponding frequency.
   *
   * @param note given MIDI note
   * @return the frequency of the MIDI note
   * @example midi_note_to_frequency(69); // Returns 440
   */
  midi_note_to_frequency(note: number): number {
    // A4 = 440Hz = midi note 69
    return 440 * 2 ** ((note - 69) / 12);
  }

  /**
   * Converts a letter name to its corresponding frequency.
   *
   * @param letter_name given letter name
   * @return the corresponding frequency
   * @example letter_name_to_frequency("A4"); // Returns 440
   */
  letter_name_to_frequency(note: string): number {
    return this.midi_note_to_frequency(this.letter_name_to_midi_note(note));
  }

  /**
   * returns a Sound reminiscent of a bell, playing
   * a given note for a given duration
   * @param note MIDI note
   * @param duration duration in seconds
   * @return Sound resulting bell Sound with given pitch and duration
   * @example bell(40, 1);
   */
  bell(note: number, duration: number): Sound {
    return this.stacking_adsr(
      this.square_sound,
      this.midi_note_to_frequency(note),
      duration,
      list(
        this.adsr(0, 0.6, 0, 0.05),
        this.adsr(0, 0.6618, 0, 0.05),
        this.adsr(0, 0.7618, 0, 0.05),
        this.adsr(0, 0.9071, 0, 0.05)
      )
    );
  }

  /**
   * returns a Sound reminiscent of a cello, playing
   * a given note for a given duration
   * @param note MIDI note
   * @param duration duration in seconds
   * @return Sound resulting cello Sound with given pitch and duration
   * @example cello(36, 5);
   */
  cello(note: number, duration: number): Sound {
    return this.stacking_adsr(
      this.square_sound,
      this.midi_note_to_frequency(note),
      duration,
      list(this.adsr(0.05, 0, 1, 0.1), this.adsr(0.05, 0, 1, 0.15), this.adsr(0, 0, 0.2, 0.15))
    );
  }

  /**
   * returns a Sound reminiscent of a piano, playing
   * a given note for a given duration
   * @param note MIDI note
   * @param duration duration in seconds
   * @return Sound resulting piano Sound with given pitch and duration
   * @example piano(48, 5);
   */
  piano(note: number, duration: number): Sound {
    return this.stacking_adsr(
      this.triangle_sound,
      this.midi_note_to_frequency(note),
      duration,
      list(this.adsr(0, 0.515, 0, 0.05), this.adsr(0, 0.32, 0, 0.05), this.adsr(0, 0.2, 0, 0.05))
    );
  }

  /**
   * returns a Sound reminiscent of a trombone, playing
   * a given note for a given duration
   * @param note MIDI note
   * @param duration duration in seconds
   * @return Sound resulting trombone Sound with given pitch and duration
   * @example trombone(60, 2);
   */
  trombone(note: number, duration: number): Sound {
    return this.stacking_adsr(
      this.square_sound,
      this.midi_note_to_frequency(note),
      duration,
      list(this.adsr(0.2, 0, 1, 0.1), this.adsr(0.3236, 0.6, 0, 0.1))
    );
  }

  /**
   * returns a Sound reminiscent of a violin, playing
   * a given note for a given duration
   * @param note MIDI note
   * @param duration duration in seconds
   * @return Sound resulting violin Sound with given pitch and duration
   * @example violin(53, 4);
   */
  violin(note: number, duration: number): Sound {
    return this.stacking_adsr(
      this.sawtooth_sound,
      this.midi_note_to_frequency(note),
      duration,
      list(
        this.adsr(0.35, 0, 1, 0.15),
        this.adsr(0.35, 0, 1, 0.15),
        this.adsr(0.45, 0, 1, 0.15),
        this.adsr(0.45, 0, 1, 0.15)
      )
    );
  }

  static readonly channelAttach = [SoundModuleString.SOUND_CHANNEL];
  constructor(_conduit: IConduit, channels: IChannel<any>[]) {
    const [soundsChannel] = channels;
    this.host = makeRpc<SoundModulePlugin, ISoundHostRpc>(soundsChannel, this);
  }
}

export { SoundModulePlugin as plugin };
