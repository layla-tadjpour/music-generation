"use strict";
/**
 * Utility functions for the [Coconet]{@link} model.
 *
 * @license
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
exports.__esModule = true;
/**
 * Imports
 */
var tf = require("@tensorflow/tfjs-core");
var logging = require("../../core/logging");
var index_1 = require("../../protobuf/index");
exports.IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
// The length of the pitch array in Pianoroll.
exports.NUM_PITCHES = 34;
// The pitch array in Pianoroll is shifted so that index 0 is MIN_PITCH.
exports.MIN_PITCH = 44;
// Number of voices used in the model. 0 represents Soprano, 1 Alto,
// 2 Tenor and 3 is Bass.
exports.NUM_VOICES = 2;
//since trained on num_pitches=34. root=0 += 16 + silence = 34.
exports.MAX_PITCH = 77;
exports.NUM_OUTPUT_VOICES = 1;
/**
 * Converts a pianoroll representation to a `NoteSequence`. Note that since
 * the pianoroll representation can't distinguish between multiple eighth notes
 * and held notes, the resulting `NoteSequence` won't either.
 *
 * @param pianoroll Tensor of shape `[steps][NUM_PITCHES][NUM_VOICES]`,
 * where each entry represents an instrument being played at a particular step
 * and for a particular pitch. For example, `pianoroll[0][64] =[0, 0, 1, 0]`
 * means that the third instrument plays pitch 64 at time 0.
 * @param numberOfSteps The number of quantized steps in the sequence.
 * @returns A `NoteSequence`.
 */
function pianorollToSequence(pianoroll, numberOfSteps) {
    // First reshape the flat tensor so that it's shaped [steps][NUM_PITCHES][4].
    var reshaped = tf.tidy(function () { return pianoroll.reshape([numberOfSteps, exports.NUM_PITCHES, exports.NUM_VOICES])
        .arraySync(); });
    var sequence = index_1.NoteSequence.create();
    var notes = [];
    for (var s = 0; s < numberOfSteps; s++) {
        for (var p = 0; p < exports.NUM_PITCHES; p++) {
            //just take the channel 0. replace v < NUM_VOICES if you want to output all channels.
            for (var v = 0; v < exports.NUM_OUTPUT_VOICES; v++) {
                var value = reshaped[s][p][v];
                // If this note is on, then it's being played by a voice and
                // it should be added to the note sequence.
                if (value === 1.0) {
                    var note = index_1.NoteSequence.Note.create({
                        pitch: p + exports.MIN_PITCH,
                        instrument: v,
                        quantizedStartStep: s,
                        quantizedEndStep: s + 1
                    });
                    notes.push(note);
                }
            }
        }
    }
    sequence.notes = notes;
    sequence.totalQuantizedSteps = notes[notes.length - 1].quantizedEndStep;
    sequence.quantizationInfo = { stepsPerQuarter: 4 };
    return sequence;
}
exports.pianorollToSequence = pianorollToSequence;
/**
 * Converts a `NoteSequence` to a pianoroll representation. This sequence
 * needs to contain notes with a valid set of instruments, representing the
 * voices in a Bach harmony: 0 is Soprano, 1 is Alto, 2 Tenor and 3 Bass. Any
 * notes with instruments outside of this range are ignored. Note that this
 * pianoroll representation can't distinguish between multiple eighth notes and
 * held notes, so that information will be lost.
 *
 * @param ns A quantized `NoteSequence` with at least one note.
 * @param numberOfSteps The number of quantized steps in the sequence.
 * @returns A Tensor of shape `[numberOfSteps][NUM_PITCHES][NUM_VOICES]`
 * where each entry represents an instrument being played at a particular
 * step and for a particular pitch. For example,
 * `pianoroll[0][64] = [0, 0, 1, 0]` means that the third instrument plays
 * pitch 64 at time 0.
 */
function sequenceToPianoroll(ns, numberOfSteps) {
    var pianoroll = tf.tidy(function () { return tf.zeros([numberOfSteps, exports.NUM_PITCHES, exports.NUM_VOICES]).arraySync(); });
    var notes = ns.notes;
    notes.forEach(function (note) {
        //changed const to let declaration.
        var pitchIndex = note.pitch - exports.MIN_PITCH;
        var stepIndex = note.quantizedStartStep;
        //temproray fix. 
        if (pitchIndex >= exports.NUM_PITCHES) {
            logging.log("Notes pitch is " + pitchIndex + " greater than max " + (exports.NUM_PITCHES - 1) + ". \n        Clipping this note pitch to " + exports.MAX_PITCH + ".", 'Coconet', 5 /* WARN */);
            pitchIndex = exports.NUM_PITCHES - 1;
            note.pitch = 77;
        }
        if (pitchIndex < 0) {
            logging.log("Notes pitch is " + pitchIndex + " because note pitch less than \n        " + exports.MIN_PITCH + ", setting it to zero and clipping this note pitch to " + exports.MIN_PITCH + ".", 'Coconet', 5 /* WARN */);
            pitchIndex = 0;
            note.pitch = 44;
        }
        var duration = note.quantizedEndStep - note.quantizedStartStep;
        var voice = note.instrument;
        if (voice < 0 || voice >= exports.NUM_VOICES) {
            logging.log("Found invalid voice " + voice + ". Skipping.", 'Coconet', 5 /* WARN */);
        }
        else {
            if (stepIndex + duration > numberOfSteps) {
                throw new Error("NoteSequence " + ns.id + " has notes that are longer than the sequence's\n          totalQuantizedSteps.");
            }
            for (var i = stepIndex; i < stepIndex + duration; i++) {
                pianoroll[i][pitchIndex][voice] = 1;
            }
        }
    });
    return tf.tensor([pianoroll]);
}
exports.sequenceToPianoroll = sequenceToPianoroll;
