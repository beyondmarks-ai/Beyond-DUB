import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { backgroundStem, demucsCommand, maxMediaBytes, mixArguments } from "../../../lib/background.js";
import { getDubbingStatus } from "../../../lib/sarvam.js";

const run = promisify(execFile);

export const runtime = "nodejs";
export const maxDuration = 600;

export async function POST(request) {
  let directory;
  try {
    const form = await request.formData();
    const video = form.get("video");
    const jobId = form.get("job")?.trim();
    if (!video || typeof video.arrayBuffer !== "function") throw new Error("The original video is required for background preservation.");
    if (!jobId || !/^[\w-]+$/.test(jobId)) throw new Error("Missing or invalid job ID.");
    if (!video.size || video.size > maxMediaBytes) throw new Error("The original video must be between 1 byte and 250 MB.");

    const status = await getDubbingStatus(jobId);
    const exported = status.exports?.find((item) => item.export_type === "video" && item.status === "completed" && !item.is_stale);
    if (!exported?.download_url) throw new Error("The translated video is not ready for mixing.");
    const dubbedResponse = await fetch(exported.download_url, { cache: "no-store" });
    if (!dubbedResponse.ok) throw new Error(`Could not fetch the translated video (${dubbedResponse.status}).`);
    const declaredSize = Number(dubbedResponse.headers.get("content-length"));
    if (declaredSize && declaredSize > maxMediaBytes) throw new Error("The translated video is larger than 250 MB.");

    directory = await mkdtemp(join(tmpdir(), "beyond-dub-mix-"));
    const sourcePath = join(directory, "source.mp4");
    const dubbedPath = join(directory, "dubbed.mp4");
    const stemsPath = join(directory, "stems");
    const outputPath = join(directory, "translated-with-background.mp4");
    const [sourceBuffer, dubbedBuffer] = await Promise.all([video.arrayBuffer(), dubbedResponse.arrayBuffer()]);
    if (dubbedBuffer.byteLength > maxMediaBytes) throw new Error("The translated video is larger than 250 MB.");
    await Promise.all([
      writeFile(sourcePath, Buffer.from(sourceBuffer)),
      writeFile(dubbedPath, Buffer.from(dubbedBuffer)),
    ]);

    const separation = demucsCommand(sourcePath, stemsPath);
    await run(separation.command, separation.args, { maxBuffer: 8 * 1024 * 1024 });
    await run("ffmpeg", mixArguments(dubbedPath, backgroundStem(stemsPath), outputPath), { maxBuffer: 8 * 1024 * 1024 });
    const output = await readFile(outputPath);
    return new Response(output, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'inline; filename="translated-with-background.mp4"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.json({ error: error.message || "Could not restore the background audio." }, { status: 400 });
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}
