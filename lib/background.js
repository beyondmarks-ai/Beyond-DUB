import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

export const maxMediaBytes = 250 * 1024 * 1024;

export function demucsCommand(inputPath, outputDirectory) {
  const configured = process.env.DEMUCS_PYTHON?.trim();
  const localPython = resolve(".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  const command = configured || localPython;
  if (!configured && !existsSync(localPython)) {
    throw new Error("Background preservation is not installed. Create .venv and install requirements.txt.");
  }
  return {
    command,
    args: ["-m", "demucs", "-n", "htdemucs", "--two-stems", "vocals", "--device", "cpu", "--shifts", "1", "--overlap", "0.25", "--out", outputDirectory, inputPath],
  };
}

export function backgroundStem(outputDirectory) {
  return join(outputDirectory, "htdemucs", "source", "no_vocals.wav");
}

export function backgroundGain(value = 12) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 18) {
    throw new Error("Background boost must be between 0 and 18 dB.");
  }
  return value;
}

export function mixArguments(dubbedPath, musicPath, outputPath, boost = 12) {
  const gain = backgroundGain(boost);
  return [
    "-hide_banner", "-loglevel", "error", "-y",
    "-i", dubbedPath, "-i", musicPath,
    "-filter_complex", `[0:a]volume=1[dub];[1:a]volume=${gain}dB[bg];[dub][bg]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.95:level=false:latency=true[a]`,
    "-map", "0:v:0", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", outputPath,
  ];
}
