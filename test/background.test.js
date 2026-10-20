import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backgroundGain, mixArguments } from "../lib/background.js";

test("background gain accepts silence-safe limits and rejects unsafe filter values", () => {
  assert.equal(backgroundGain(), 12);
  assert.equal(backgroundGain(0), 0);
  assert.equal(backgroundGain(18), 18);
  for (const value of [-1, 19, NaN, Infinity, "12dB;volume=10"]) {
    assert.throws(() => backgroundGain(value), /between 0 and 18/);
  }
});

test("default mix makes quiet background audible without amplifying the voice", () => {
  const dir = mkdtempSync(join(tmpdir(), "dub-audio-test-"));
  const run = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);
  try {
    const dub = join(dir, "dub.mp4"), bg = join(dir, "bg.wav"), mixed = join(dir, "mixed.mp4");
    run(["-f", "lavfi", "-i", "color=s=32x32:d=2", "-f", "lavfi", "-i", "sine=frequency=1000:duration=2", "-c:v", "libx264", "-c:a", "aac", "-shortest", dub]);
    run(["-f", "lavfi", "-i", "sine=frequency=300:duration=2", "-af", "volume=0.1", bg]);
    execFileSync("ffmpeg", mixArguments(dub, bg, mixed));
    const pcm = run(["-i", mixed, "-ss", "0.25", "-t", "1", "-vn", "-ac", "1", "-ar", "48000", "-f", "f32le", "pipe:1"]);
    function amplitude(frequency) {
      let re = 0, im = 0;
      for (let i = 0; i < pcm.length / 4; i++) {
        const value = pcm.readFloatLE(i * 4), angle = 2 * Math.PI * frequency * i / 48000;
        re += value * Math.cos(angle); im += value * Math.sin(angle);
      }
      return 2 * Math.hypot(re, im) / (pcm.length / 4);
    }
    const background = amplitude(300), voice = amplitude(1000);
    assert(background > 0.04 && background < 0.06, `Expected boosted music around 0.05; got ${background}`);
    assert(voice > 0.10 && voice < 0.14, `Voice level changed: ${voice}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
