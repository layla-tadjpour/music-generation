"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var globalAny = global;
globalAny.performance = Date;
globalAny.thisNavigator = {
    userAgent: ""
};
// tslint:disable-next-line:no-require-imports
globalAny.fetch = require("node-fetch");
var model_1 = require("../models/model");
var core_1 = require("../../core");
var mm = require("../../index");
var index_1 = require("../../index");
var canvasVisualizer;
var player = new mm.Player(false, {
    run: function (note) {
        canvasVisualizer.redraw(note, true);
    },
    stop: function () { }
});
// UI elements
var playBtn = document.getElementById("playBtn");
var infillBtn = document.getElementById("infillBtn");
var tempoInput = document.getElementById("tempoInput");
var tempoValue = document.getElementById("tempoValue");
var fileInput = document.getElementById("fileInput");
var testInput = document.getElementById("testInput");
var canvas = document.getElementById("canvas");
// Set up some event listeners
playBtn.addEventListener("click", function () { return startOrStop(); }, false);
fileInput.addEventListener("change", loadAndpassFile);
testInput.addEventListener("change", testFile);
tempoInput.addEventListener("input", function () {
    player.setTempo(parseInt(tempoInput.value, 10));
    tempoValue.textContent = tempoInput.value;
});
// tslint:disable-next-line:no-any
function loadFile(e) {
    index_1.blobToNoteSequence(e.target.files[0])
        .then(function (seq) { return initPlayerAndVisualizer(seq); });
}
// tslint:disable-next-line:no-any
function testFile(e) {
    index_1.blobToNoteSequence(e.target.files[0])
        .then(function (seq) { return console.log(seq); });
}
var config = {
    noteHeight: 6,
    pixelsPerTimeStep: 30,
    noteSpacing: 1,
    noteRGB: "5, 206, 153",
    activeNoteRGB: "109, 116, 136"
};
function initPlayerAndVisualizer(seq) {
    // Disable the UI
    playBtn.disabled = false;
    playBtn.textContent = "Loading";
    canvasVisualizer = new mm.PianoRollCanvasVisualizer(seq, canvas, config);
    var tempo = seq.tempos[0].qpm;
    player.setTempo(tempo);
    tempoValue.textContent = tempoInput.value = "" + tempo;
    // Enable the UI
    playBtn.disabled = false;
    playBtn.textContent = "Play";
}
function startOrStop() {
    var context = new AudioContext();
    if (player.isPlaying()) {
        player.stop();
        playBtn.textContent = "Play";
    }
    else {
        player.start(canvasVisualizer.noteSequence);
        playBtn.textContent = "Stop";
    }
}
/************************************************************************** */
// coconet model: melodies
/************************************************************************** */
var MEL_CKPT = "http://127.0.0.1:8080/models";
var model;
var coconetPlayer = new mm.Player();
function loadAndpassFile(e) {
    index_1.blobToNoteSequence(e.target.files[0])
        .then(function (seq) { return initPlayerAndVisualizer(seq); });
    index_1.blobToNoteSequence(e.target.files[0])
        .then(function (seq) { return infillAndVisualizer(seq, 4); });
}
var getNS = function (seq) { return __awaiter(void 0, void 0, void 0, function () {
    var model;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                model = new model_1.Coconet(MEL_CKPT);
                return [4 /*yield*/, model.initialize()];
            case 1:
                _a.sent();
                coconetPlayer.resumeContext();
                return [2 /*return*/, model.infill(seq, { numIterations: 1 })];
        }
    });
}); };
function infillAndVisualizer(seq, stepsPerQuarter) {
    var qseq = core_1.sequences.quantizeNoteSequence(seq, stepsPerQuarter);
    getNS(qseq).then(function (ns) {
        // vizulaizer doesn't work well with quantized (a bug in the magneta code)
        var u_ns = core_1.sequences.unquantizeSequence(ns, qseq.tempos[0].qpm);
        var viz = new mm.PianoRollCanvasVisualizer(u_ns, document.getElementById("mycanvas2"), config);
        var vizPlayer = new mm.Player(false, {
            run: function (note) { return viz.redraw(note); }, stop: function () { console.log("done"); }
        });
        // Disable the UI
        infillBtn.disabled = false;
        infillBtn.textContent = "Loading";
        var tempo = qseq.tempos[0].qpm;
        vizPlayer.setTempo(tempo);
        tempoValue.textContent = tempoInput.value = "" + tempo;
        // Enable the UI
        infillBtn.disabled = false;
        infillBtn.textContent = "Play";
        infillBtn.addEventListener("click", function () {
            if (vizPlayer.isPlaying()) {
                vizPlayer.stop();
                infillBtn.textContent = "Play";
            }
            else {
                vizPlayer.start(u_ns);
                infillBtn.textContent = "Stop";
            }
        }, false);
    });
}
