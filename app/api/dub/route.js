import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { promisify } from "node:util";
import { createDubbingJob, detectLanguage, dubbingLanguages, voiceSettings } from "../../../lib/sarvam.js";

const run = promisify(execFile);
const maxBytes = 250 * 1024 * 1024;

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request) {
  let directory;
  try {
    const form = await request.formData();
    const video = form.get("video");
    const target = form.get("target");
    const voice = form.get("voice");
    if (!video || typeof video.arrayBuffer !== "function") throw new Error("Choose a video file.");
    if (!dubbingLanguages.has(target)) throw new Error("Choose a supported target language.");
    voiceSettings(voice);
    if (!video.size) throw new Error("The selected video is empty.");
    if (video.size > maxBytes) throw new Error("This demo accepts videos up to 250 MB.");

    directory = await mkdtemp(join(tmpdir(), "sarvam-dub-"));
    const extension = extname(video.name).slice(0, 10) || ".mp4";
    const inputPath = join(directory, `source${extension}`);
    const audioPath = join(directory, "sample.wav");
    await writeFile(inputPath, Buffer.from(await video.arrayBuffer()));
    await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", inputPath, "-t", "25", "-vn", "-ac", "1", "-ar", "16000", audioPath]);

    const detectedLanguage = await detectLanguage(audioPath);
    const jobId = await createDubbingJob({
      inputPath,
      filename: video.name.slice(0, 180),
      contentType: video.type || "application/octet-stream",
      source: detectedLanguage,
      target,
      voice,
    });
    return Response.json({ jobId, detectedLanguage });
  } catch (error) {
    return Response.json({ error: error.message || "Could not start the dub." }, { status: 400 });
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}
