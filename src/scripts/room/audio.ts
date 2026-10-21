/**
 * Opt-in room sound, synthesized on the fly: a soft lo-fi loop that comes
 * out of the record player (spatialized, so it gets louder as you walk up
 * to it), vinyl crackle, and a low room tone. Nothing loads, nothing
 * autoplays; the AudioContext is created on the first user toggle.
 */

export type RoomAudio = {
  setEnabled(on: boolean): void;
  isEnabled(): boolean;
  updateListener(x: number, y: number, z: number, forwardX: number, forwardZ: number): void;
  dispose(): void;
};

type Vec3 = { x: number; y: number; z: number };

const BPM = 72;
const STEP = 60 / BPM / 2; // eighth notes

// Fmaj7 · Em7 · Dm7 · Cmaj7, two bars each.
const CHORDS: number[][] = [
  [53, 57, 60, 64],
  [52, 55, 59, 62],
  [50, 53, 57, 60],
  [48, 52, 55, 59]
];

function midiToHz(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

function noiseBuffer(context: AudioContext, seconds: number, kind: "white" | "brown" | "crackle"): AudioBuffer {
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    if (kind === "white") {
      data[i] = white;
    } else if (kind === "brown") {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else {
      data[i] = Math.random() < 0.0007 ? white * (0.4 + Math.random() * 0.6) : white * 0.012;
    }
  }
  return buffer;
}

export function createRoomAudio(source: Vec3): RoomAudio {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let music: GainNode | null = null;
  let panner: PannerNode | null = null;
  let filter: BiquadFilterNode | null = null;
  let hatBuffer: AudioBuffer | null = null;
  let timer: number | null = null;
  let enabled = false;
  let step = 0;
  let nextTime = 0;

  const ensure = (): AudioContext | null => {
    if (context) {
      return context;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) {
      return null;
    }
    context = new Ctor();
    master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);

    // Record player: music bus → warm lowpass → panner at the turntable.
    panner = context.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 1.1;
    panner.rolloffFactor = 1.15;
    panner.positionX.value = source.x;
    panner.positionY.value = source.y;
    panner.positionZ.value = source.z;
    filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2200;
    filter.Q.value = 0.4;
    music = context.createGain();
    music.gain.value = 0.55;
    music.connect(filter).connect(panner).connect(master);

    const crackle = context.createBufferSource();
    crackle.buffer = noiseBuffer(context, 3.1, "crackle");
    crackle.loop = true;
    const crackleFilter = context.createBiquadFilter();
    crackleFilter.type = "highpass";
    crackleFilter.frequency.value = 1200;
    const crackleGain = context.createGain();
    crackleGain.gain.value = 0.28;
    crackle.connect(crackleFilter).connect(crackleGain).connect(panner);
    crackle.start();

    const tone = context.createBufferSource();
    tone.buffer = noiseBuffer(context, 4, "brown");
    tone.loop = true;
    const toneFilter = context.createBiquadFilter();
    toneFilter.type = "lowpass";
    toneFilter.frequency.value = 260;
    const toneGain = context.createGain();
    toneGain.gain.value = 0.05;
    tone.connect(toneFilter).connect(toneGain).connect(master);
    tone.start();

    hatBuffer = noiseBuffer(context, 0.2, "white");
    return context;
  };

  const voice = (frequency: number, start: number, length: number, peak: number, type: OscillatorType, detune = 0): void => {
    if (!context || !music) {
      return;
    }
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    osc.detune.value = detune + Math.sin(start * 3.1) * 6; // tape wow
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.5, length * 0.3));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain).connect(music);
    osc.start(start);
    osc.stop(start + length + 0.05);
  };

  const kick = (start: number): void => {
    if (!context || !music) {
      return;
    }
    const osc = context.createOscillator();
    osc.frequency.setValueAtTime(110, start);
    osc.frequency.exponentialRampToValueAtTime(42, start + 0.18);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.5, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
    osc.connect(gain).connect(music);
    osc.start(start);
    osc.stop(start + 0.32);
  };

  const hat = (start: number, level: number, snare = false): void => {
    if (!context || !music || !hatBuffer) {
      return;
    }
    const noise = context.createBufferSource();
    noise.buffer = hatBuffer;
    const band = context.createBiquadFilter();
    band.type = snare ? "bandpass" : "highpass";
    band.frequency.value = snare ? 1800 : 7000;
    const gain = context.createGain();
    gain.gain.setValueAtTime(level, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + (snare ? 0.18 : 0.05));
    noise.connect(band).connect(gain).connect(music);
    noise.start(start);
    noise.stop(start + 0.2);
  };

  const schedule = (): void => {
    if (!context) {
      return;
    }
    while (nextTime < context.currentTime + 0.25) {
      const bar = Math.floor(step / 8);
      const inBar = step % 8;
      const chord = CHORDS[Math.floor(bar / 2) % CHORDS.length];
      // Swing the off-beats a touch.
      const t = nextTime + (inBar % 2 === 1 ? STEP * 0.16 : 0);

      if (inBar === 0 && bar % 2 === 0) {
        for (const [i, note] of chord.entries()) {
          voice(midiToHz(note), t, STEP * 15, 0.045, "triangle", i * 3 - 4);
          voice(midiToHz(note + 12), t + 0.02, STEP * 14, 0.012, "sine", 5);
        }
        voice(midiToHz(chord[0] - 12), t, STEP * 3.6, 0.16, "sine");
      }
      if (inBar === 4) {
        voice(midiToHz(chord[0] - 12), t, STEP * 2.6, 0.12, "sine");
      }
      if (inBar === 0 || inBar === 5) {
        kick(t);
      }
      if (inBar === 2 || inBar === 6) {
        hat(t, 0.06, true);
      }
      hat(t, inBar % 2 === 0 ? 0.03 : 0.018);
      if (Math.random() < 0.32 && inBar % 2 === 1) {
        const note = chord[Math.floor(Math.random() * chord.length)] + 12;
        voice(midiToHz(note), t, STEP * 2.4, 0.05, "sine");
      }

      nextTime += STEP;
      step += 1;
    }
  };

  return {
    setEnabled(on: boolean): void {
      const ctx = ensure();
      if (!ctx || !master) {
        enabled = false;
        return;
      }
      enabled = on;
      const now = ctx.currentTime;
      if (on) {
        void ctx.resume();
        master.gain.cancelScheduledValues(now);
        master.gain.setTargetAtTime(0.9, now, 0.4);
        if (timer === null) {
          nextTime = ctx.currentTime + 0.1;
          timer = window.setInterval(schedule, 60);
        }
      } else {
        master.gain.cancelScheduledValues(now);
        master.gain.setTargetAtTime(0, now, 0.15);
        if (timer !== null) {
          window.clearInterval(timer);
          timer = null;
        }
        window.setTimeout(() => {
          if (!enabled) {
            void ctx.suspend();
          }
        }, 900);
      }
    },
    isEnabled(): boolean {
      return enabled;
    },
    updateListener(x, y, z, forwardX, forwardZ): void {
      if (!context || !enabled) {
        return;
      }
      const listener = context.listener;
      if (listener.positionX) {
        listener.positionX.value = x;
        listener.positionY.value = y;
        listener.positionZ.value = z;
        listener.forwardX.value = forwardX;
        listener.forwardY.value = 0;
        listener.forwardZ.value = forwardZ;
        listener.upX.value = 0;
        listener.upY.value = 1;
        listener.upZ.value = 0;
      } else {
        listener.setPosition(x, y, z);
        listener.setOrientation(forwardX, 0, forwardZ, 0, 1, 0);
      }
    },
    dispose(): void {
      if (timer !== null) {
        window.clearInterval(timer);
      }
      void context?.close();
      context = null;
    }
  };
}
