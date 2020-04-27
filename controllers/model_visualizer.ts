const globalAny: any = global;
globalAny.performance = Date;
globalAny.thisNavigator = {
  userAgent: "",
};

// tslint:disable-next-line:no-require-imports
globalAny.fetch = require("node-fetch");

// @ts-ignore
import {INoteSequence} from "../..";
import {Coconet} from "../models/model";

import {sequences} from "../../core";
import * as mm from "../../index";
import {blobToNoteSequence, urlToNoteSequence} from "../../index";

let canvasVisualizer: mm.PianoRollCanvasVisualizer;

const player = new mm.Player(false, {
  run: (note: mm.NoteSequence.Note) => {
    canvasVisualizer.redraw(note, true);
  },
  stop: () => {},
});

// UI elements
const playBtn = document.getElementById("playBtn") as HTMLButtonElement;
const infillBtn = document.getElementById("infillBtn") as HTMLButtonElement;
const tempoInput = document.getElementById("tempoInput") as HTMLInputElement;
const tempoValue = document.getElementById("tempoValue") as HTMLDivElement;
const fileInput = document.getElementById("fileInput") as HTMLInputElement;
const testInput = document.getElementById("testInput") as HTMLInputElement;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;

// Set up some event listeners
playBtn.addEventListener("click", () => startOrStop(), false);
fileInput.addEventListener("change", loadAndpassFile);
testInput.addEventListener("change", testFile);
tempoInput.addEventListener("input", () => {
  player.setTempo(parseInt(tempoInput.value, 10));
  tempoValue.textContent = tempoInput.value;
});

// tslint:disable-next-line:no-any
function loadFile(e: any) {
  blobToNoteSequence(e.target.files[0])
      .then((seq) => initPlayerAndVisualizer(seq));
}

// tslint:disable-next-line:no-any
function testFile(e: any) {
  blobToNoteSequence(e.target.files[0])
      .then((seq) => console.log(seq));
}

const config = {
  noteHeight: 6,
  pixelsPerTimeStep: 30,  // like a note width
  noteSpacing: 1,
  noteRGB: "5, 206, 153",
  activeNoteRGB: "109, 116, 136"
};

function initPlayerAndVisualizer(seq: mm.INoteSequence) {
  // Disable the UI
  playBtn.disabled = false;
  playBtn.textContent = "Loading";

  canvasVisualizer = new mm.PianoRollCanvasVisualizer(seq, canvas, config);

  const tempo = seq.tempos[0].qpm;
  player.setTempo(tempo);
  tempoValue.textContent = tempoInput.value = "" + tempo;

  // Enable the UI
  playBtn.disabled = false;
  playBtn.textContent = "Play";
}

function startOrStop() {
  const context = new AudioContext();
  if (player.isPlaying()) {
    player.stop();
    playBtn.textContent = "Play";
  } else {
    player.start(canvasVisualizer.noteSequence);
    playBtn.textContent = "Stop";
  }
}

/************************************************************************** */
// coconet model: melodies
/************************************************************************** */
const MEL_CKPT = "http://127.0.0.1:8080/models";
let model: Coconet;
const coconetPlayer = new mm.Player();

function loadAndpassFile(e: any) {
  blobToNoteSequence(e.target.files[0])
  .then((seq) => initPlayerAndVisualizer(seq));
  blobToNoteSequence(e.target.files[0])
  .then((seq) => infillAndVisualizer(seq, 4));
}

const getNS = async (seq: mm.INoteSequence) => {
    const model = new Coconet(MEL_CKPT);
    await model.initialize();
    coconetPlayer.resumeContext();
    return model.infill(seq, {numIterations: 1});
  };

function infillAndVisualizer(seq: mm.INoteSequence, stepsPerQuarter: number) {
  const qseq = sequences.quantizeNoteSequence(seq, stepsPerQuarter);
  getNS(qseq).then((ns) => {
    // vizulaizer doesn't work well with quantized (a bug in the magneta code)
      const u_ns = sequences.unquantizeSequence(ns, qseq.tempos[0].qpm);
      const viz = new mm.PianoRollCanvasVisualizer(u_ns, document.getElementById("mycanvas2") as HTMLCanvasElement, config);
      const vizPlayer = new mm.Player(false, {
            run: (note) => viz.redraw(note), stop: () => {console.log("done"); },
          });
      // Disable the UI
      infillBtn.disabled = false;
      infillBtn.textContent = "Loading";

      const tempo = qseq.tempos[0].qpm;
      vizPlayer.setTempo(tempo);
      tempoValue.textContent = tempoInput.value = "" + tempo;

      // Enable the UI
      infillBtn.disabled = false;
      infillBtn.textContent = "Play";

      infillBtn.addEventListener("click", () => {
        if (vizPlayer.isPlaying()) {
          vizPlayer.stop();
          infillBtn.textContent = "Play";
        } else {
          vizPlayer.start(u_ns);
          infillBtn.textContent = "Stop";
        }
      },
      false);
  });
}

