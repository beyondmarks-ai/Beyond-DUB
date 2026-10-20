import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";

const apiBase = "https://api.sarvam.ai";
export const dubbingLanguages = new Set([
  "en-IN", "hi-IN", "bn-IN", "gu-IN", "kn-IN", "ml-IN",
  "mr-IN", "or-IN", "pa-IN", "ta-IN", "te-IN", "as-IN",
]);
export const dubbingVoices = new Set([
  "amit", "dev", "ishita", "kavya", "manan", "pooja", "priya", "rahul",
  "ratan", "ritu", "rohan", "shreya", "shubh", "simran", "sumit",
]);
export const dubbingRegisters = new Set([
  "auto", "formal", "common-indic", "classic-colloquial", "modern-colloquial", "academic",
]);

export function normalizeLanguage(code) {
  return code === "od-IN" ? "or-IN" : code;
}

export function voiceSettings(voice, speakers = 1) {
  const numSpeakers = Number(speakers);
  if (!Number.isInteger(numSpeakers) || ![-1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(numSpeakers)) {
    throw new Error("Choose auto-detect or between 1 and 10 speakers.");
  }
  if (voice === "clone") return { voice_cloning: true, num_speakers: numSpeakers };
  if (!dubbingVoices.has(voice)) throw new Error("Choose a supported Sarvam voice.");
  if (numSpeakers !== 1) throw new Error("Preset voices support one speaker only.");
  return { voice_cloning: false, voice_id: voice, pace_preset: "normal", num_speakers: 1 };
}

export function translationRegister(register) {
  if (!dubbingRegisters.has(register)) throw new Error("Choose a supported translation style.");
  return register;
}

function apiKey() {
  const key = process.env.SARVAM_API_KEY?.trim();
  if (!key) throw new Error("SARVAM_API_KEY is not configured on the server.");
  return key;
}

async function sarvam(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: { "api-subscription-key": apiKey(), ...options.headers },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.message || body.message || `Sarvam returned ${response.status}.`);
  return body;
}

export async function detectLanguage(audioPath) {
  const form = new FormData();
  form.set("file", new Blob([await readFile(audioPath)], { type: "audio/wav" }), "speech-sample.wav");
  form.set("model", "saaras:v4");
  form.set("language_code", "unknown");
  form.set("mode", "transcribe");
  const result = await sarvam("/speech-to-text", { method: "POST", body: form });
  const language = normalizeLanguage(result.language_code);
  if (!language || !dubbingLanguages.has(language)) {
    throw new Error(`Detected language ${language || "unknown"} is not supported by Sarvam video dubbing.`);
  }
  return language;
}

export async function createDubbingJob({ inputPath, filename, contentType, source, target, voice, speakers, register }) {
  if (!dubbingLanguages.has(target)) throw new Error("Choose a supported target language.");
  if (source === target) throw new Error("The video is already in the selected target language.");

  const created = await sarvam("/dubbing/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      src_lang: source,
      target_langs: [target],
      export_options: ["video"],
      ...voiceSettings(voice, speakers),
      register: translationRegister(register),
      disable_watermark: true,
      editor_flow: false,
      job_name: filename,
    }),
  });
  const { job_id: jobId, upload_url: uploadUrl } = created.data || {};
  if (!jobId || !uploadUrl) throw new Error("Sarvam did not return an upload URL.");

  const { size } = await stat(inputPath);
  const upload = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType, "Content-Length": String(size), "x-ms-blob-type": "BlockBlob" },
    body: createReadStream(inputPath),
    duplex: "half",
  });
  if (!upload.ok) throw new Error(`Video upload failed (${upload.status}).`);
  await sarvam(`/dubbing/jobs/${encodeURIComponent(jobId)}/start`, { method: "POST" });
  return jobId;
}

export async function getDubbingStatus(jobId) {
  const live = await sarvam(`/dubbing/jobs/${encodeURIComponent(jobId)}/live-status`);
  let exports = [];
  if (["completed", "partial_failure"].includes(live.data?.status)) {
    const result = await sarvam(`/dubbing/jobs/${encodeURIComponent(jobId)}/export-status?limit=100`);
    exports = result.data?.exports || [];
  }
  return { ...live.data, exports };
}
