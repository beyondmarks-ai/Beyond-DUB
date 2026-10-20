import test from "node:test";
import assert from "node:assert/strict";
import { dubbingLanguages, dubbingVoices, normalizeLanguage, translationRegister, voiceSettings } from "../lib/sarvam.js";
import { backgroundStem, mixArguments } from "../lib/background.js";

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
  assert.deepEqual(voiceSettings("clone", "-1"), { voice_cloning: true, num_speakers: -1 });
  assert.throws(() => voiceSettings("ishita", "2"), /one speaker/);
  assert.throws(() => voiceSettings("unknown"), /supported Sarvam voice/);
});

test("accepts only Sarvam dubbing translation styles", () => {
  assert.equal(translationRegister("auto"), "auto");
  assert.equal(translationRegister("academic"), "academic");
  assert.throws(() => translationRegister("cinematic"), /supported translation style/);
});

test("remixes the isolated background stem with translated speech", () => {
  const stem = backgroundStem("stems");
  assert.match(stem.replaceAll("\\", "/"), /stems\/htdemucs\/source\/no_vocals\.wav$/);
  const args = mixArguments("dubbed.mp4", stem, "mixed.mp4");
  assert(args.includes(stem));
  assert.match(args.join(" "), /amix=inputs=2:duration=first/);
  assert.match(args.join(" "), /-c:v copy/);
});
