import test from "node:test";
import assert from "node:assert/strict";
import { dubbingLanguages, dubbingVoices, normalizeLanguage, voiceSettings } from "../lib/sarvam.js";

test("maps the STT Odia code to the dubbing API code", () => {
  assert.equal(normalizeLanguage("od-IN"), "or-IN");
});

test("supports every target shown by the interface", () => {
  assert.equal(dubbingLanguages.size, 12);
  assert(dubbingLanguages.has("hi-IN"));
  assert(dubbingLanguages.has("en-IN"));
});

test("uses only the live Sarvam dubbing voice catalog", () => {
  assert.equal(dubbingVoices.size, 15);
  assert.deepEqual(voiceSettings("ishita"), {
    voice_cloning: false,
    voice_id: "ishita",
    pace_preset: "normal",
    num_speakers: 1,
  });
  assert.deepEqual(voiceSettings("clone"), { voice_cloning: true, num_speakers: 1 });
  assert.throws(() => voiceSettings("unknown"), /supported Sarvam voice/);
});
