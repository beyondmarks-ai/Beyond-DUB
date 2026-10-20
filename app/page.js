"use client";

import { useEffect, useRef, useState } from "react";

const languages = [
  ["en-IN", "English"], ["hi-IN", "Hindi"], ["bn-IN", "Bengali"],
  ["gu-IN", "Gujarati"], ["kn-IN", "Kannada"], ["ml-IN", "Malayalam"],
  ["mr-IN", "Marathi"], ["or-IN", "Odia"], ["pa-IN", "Punjabi"],
  ["ta-IN", "Tamil"], ["te-IN", "Telugu"], ["as-IN", "Assamese"],
];
const languageName = Object.fromEntries(languages);
const voices = [
  ["clone", "Clone original speaker"],
  ["amit", "Amit"], ["dev", "Dev"], ["ishita", "Ishita"], ["kavya", "Kavya"],
  ["manan", "Manan"], ["pooja", "Pooja"], ["priya", "Priya"], ["rahul", "Rahul"],
  ["ratan", "Ratan"], ["ritu", "Ritu"], ["rohan", "Rohan"], ["shreya", "Shreya"],
  ["shubh", "Shubh"], ["simran", "Simran"], ["sumit", "Sumit"],
];
const voiceName = Object.fromEntries(voices);
const registers = [
  ["auto", "Auto tone"], ["modern-colloquial", "Modern & casual"],
  ["common-indic", "Clear & widely understood"], ["formal", "Formal"],
  ["academic", "Academic"], ["classic-colloquial", "Classic colloquial"],
];
const registerName = Object.fromEntries(registers);
const speakerOptions = [["-1", "Auto-detect"], ...Array.from({ length: 10 }, (_, index) => [String(index + 1), String(index + 1)])];

export default function Home() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [target, setTarget] = useState("hi-IN");
  const [voice, setVoice] = useState("ishita");
  const [speakers, setSpeakers] = useState("-1");
  const [register, setRegister] = useState("auto");
  const [audioSide, setAudioSide] = useState("translated");
  const [job, setJob] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Choose a video to begin");
  const [download, setDownload] = useState("");
  const [error, setError] = useState("");
  const polling = useRef(null);
  const originalVideo = useRef(null);

  useEffect(() => () => clearTimeout(polling.current), []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => { if (download.startsWith("blob:")) URL.revokeObjectURL(download); }, [download]);

  function chooseFile(selected) {
    if (!selected) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError("");
    setDownload("");
    setStatus("Ready to detect and translate");
  }

  async function submit(event) {
    event.preventDefault();
    if (!file) return setError("Choose a video first.");
    clearTimeout(polling.current);
    setError("");
    setDownload("");
    setJob({ detectedLanguage: null });
    setProgress(4);
    setStatus("Detecting the spoken language…");

    try {
      const data = new FormData();
      data.set("video", file);
      data.set("target", target);
      data.set("voice", voice);
      data.set("speakers", voice === "clone" ? speakers : "1");
      data.set("register", register);
      const response = await fetch("/api/dub", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setJob(result);
      setProgress(8);
      setStatus(`Detected ${languageName[result.detectedLanguage] || result.detectedLanguage}. Using ${voiceName[voice]}…`);
      poll(result.jobId, result.detectedLanguage);
    } catch (reason) {
      fail(reason.message || "Could not start the dub.");
    }
  }

  async function poll(jobId, detectedLanguage) {
    try {
      const response = await fetch(`/api/status?job=${encodeURIComponent(jobId)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setProgress(Math.max(8, result.progress || 0));
      setStatus(result.current_step_label || "Creating the translated video…");
      if (["failed", "deleted"].includes(result.status)) throw new Error(result.error_message || "The dubbing job failed.");
      const video = result.exports?.find((item) => item.export_type === "video" && item.status === "completed" && !item.is_stale);
      if (video?.download_url) {
        setProgress(96);
        setStatus("Restoring the original music and ambience…");
        const mixedUrl = await restoreBackground(jobId);
        setProgress(100);
        setStatus("Your translated video is ready with its background preserved");
        setDownload(mixedUrl);
        return;
      }
      setJob({ jobId, detectedLanguage });
      polling.current = setTimeout(() => poll(jobId, detectedLanguage), 8000);
    } catch (reason) {
      fail(reason.message || "Could not check the job.");
    }
  }

  async function restoreBackground(jobId) {
    const data = new FormData();
    data.set("video", file);
    data.set("job", jobId);
    const response = await fetch("/api/mix", { method: "POST", body: data });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || "Could not restore the background audio.");
    }
    return URL.createObjectURL(await response.blob());
  }

  function fail(message) {
    clearTimeout(polling.current);
    setJob(null);
    setProgress(0);
    setError(message);
    setStatus("Ready to try again");
  }

  function reset() {
    clearTimeout(polling.current);
    setJob(null);
    setProgress(0);
    setDownload("");
    setError("");
    setStatus("Ready to detect and translate");
    setAudioSide("translated");
  }

  function syncOriginal(event) {
    const original = originalVideo.current;
    const translated = event.currentTarget;
    if (!original) return;
    if (Math.abs(original.currentTime - translated.currentTime) > 0.2) original.currentTime = translated.currentTime;
    if (event.type === "play") original.play().catch(() => {});
    if (event.type === "pause") original.pause();
  }

  const busy = Boolean(job) && !download;

  return (
    <main>
      <nav className="nav" aria-label="Primary navigation">
        <a className="logo" href="#top" aria-label="Sarvam Dub home"><span aria-hidden="true"><i></i><i></i><i></i></span> Sarvam Dub</a>
        <p>Automatic video translation</p>
      </nav>

      <section className="hero" id="top">
        <div className="eyebrow">VOICE TRANSLATION</div>
        <h1>One video.<br /><span>Another language.</span></h1>
        <p>Upload a video in any supported language. We detect the speech and create a clean dub aligned to the original timing.</p>
        <div className="trust-row" aria-label="Features">
          <span><CheckIcon /> Auto language detection</span>
          <span><CheckIcon /> Multi-speaker voice cloning</span>
          <span><CheckIcon /> Music & ambience preserved</span>
          <span><CheckIcon /> Synced A/B review</span>
        </div>
      </section>

      <section className="studio" aria-label="Video translation studio">
        <div className="studio-head">
          <div><span>NEW TRANSLATION</span><h2>Translate your video</h2></div>
          <ol aria-label="Translation steps">
            <li className={!job ? "active" : "done"}>1 <span>Upload</span></li>
            <li className={busy ? "active" : download ? "done" : ""}>2 <span>Detect & dub</span></li>
            <li className={download ? "active" : ""}>3 <span>Compare</span></li>
          </ol>
        </div>

        {!job && !download ? (
          <form onSubmit={submit}>
            <label className={`dropzone ${file ? "has-file" : ""}`} htmlFor="video">
              {preview ? <video src={preview} muted playsInline aria-label="Selected video preview" /> : <UploadIcon />}
              <strong>{file ? file.name : "Drop your video here"}</strong>
              <span>{file ? formatBytes(file.size) : "or click to choose a file · MP4, MOV, MKV or WebM"}</span>
              <input id="video" type="file" accept="video/*,.mkv" onChange={(event) => chooseFile(event.target.files[0])} />
            </label>
            <div className="fields">
              <div className="field">
                <label htmlFor="target">Translate into</label>
                <select id="target" value={target} onChange={(event) => setTarget(event.target.value)}>
                  {languages.map(([code, name]) => <option value={code} key={code}>{name}</option>)}
                </select>
                <p>The spoken language is detected automatically.</p>
              </div>
              <div className="field">
                <label htmlFor="voice">Voice</label>
                <select id="voice" value={voice} onChange={(event) => setVoice(event.target.value)}>
                  {voices.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
                </select>
                <p>{voice === "clone" ? "Sarvam recreates the source speaker's voice." : `Sarvam preset voice: ${voiceName[voice]}.`}</p>
              </div>
              <div className="field">
                <label htmlFor="speakers">Speakers</label>
                <select id="speakers" value={voice === "clone" ? speakers : "1"} disabled={voice !== "clone"} onChange={(event) => setSpeakers(event.target.value)}>
                  {speakerOptions.map(([value, name]) => <option value={value} key={value}>{name}</option>)}
                </select>
                <p>{voice === "clone" ? "Each detected speaker keeps a distinct cloned voice." : "Preset voices are designed for one narrator."}</p>
              </div>
              <div className="field">
                <label htmlFor="register">Translation style</label>
                <select id="register" value={register} onChange={(event) => setRegister(event.target.value)}>
                  {registers.map(([value, name]) => <option value={value} key={value}>{name}</option>)}
                </select>
                <p>Controls how formal or conversational the translation sounds.</p>
              </div>
            </div>
            {error && <div className="error" role="alert">{error}</div>}
            <button className="primary" type="submit" disabled={!file}><SparkIcon /> Detect language & translate</button>
            <p className="fine-print">Supports 12 languages · AI background preservation · Sarvam charges apply</p>
          </form>
        ) : (
          <div className="job" aria-live="polite">
            <div className={`status-icon ${download ? "complete" : ""}`} aria-hidden="true">{download ? <CheckIcon /> : <WaveIcon />}</div>
            <span className="job-label">{download ? "COMPLETE" : "TRANSLATING"}</span>
            <h2>{status}</h2>
            {job?.detectedLanguage && <p>Source: <strong>{languageName[job.detectedLanguage] || job.detectedLanguage}</strong> → <strong>{languageName[target]}</strong> · Voice: <strong>{voiceName[voice]}</strong> · Style: <strong>{registerName[register]}</strong></p>}
            <div className="progress" aria-label={`${progress}% complete`}><span style={{ width: `${progress}%` }}></span></div>
            <b>{progress}%</b>
            {download && <>
              <div className="review-controls" aria-label="Comparison audio">
                <span><i></i> Playback synced</span>
                <div>
                  <button type="button" className={audioSide === "original" ? "selected" : ""} onClick={() => setAudioSide("original")}>Hear original</button>
                  <button type="button" className={audioSide === "translated" ? "selected" : ""} onClick={() => setAudioSide("translated")}>Hear translation</button>
                </div>
              </div>
              <div className="comparison">
                <figure>
                  <figcaption>Original</figcaption>
                  <video ref={originalVideo} src={preview} muted={audioSide !== "original"} playsInline preload="metadata" aria-label="Synchronized original video">Your browser does not support video playback.</video>
                </figure>
                <figure>
                  <figcaption>Translated to {languageName[target]}</figcaption>
                  <video src={download} muted={audioSide !== "translated"} controls playsInline preload="metadata" onPlay={syncOriginal} onPause={syncOriginal} onSeeking={syncOriginal} onTimeUpdate={syncOriginal}>Your browser does not support video playback.</video>
                </figure>
              </div>
              <div className="actions"><button className="secondary" type="button" onClick={reset}>Translate another</button></div>
            </>}
          </div>
        )}
      </section>
      <footer>Powered by Sarvam AI · Your API key stays on the server</footer>
    </main>
  );
}

function formatBytes(bytes) { return bytes < 1024 ** 2 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`; }
function CheckIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>; }
function UploadIcon() { return <svg className="large-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></svg>; }
function SparkIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3Zm6 12 .7 2.3L21 18l-2.3.7L18 21l-.7-2.3L15 18l2.3-.7L18 15Z" /></svg>; }
function WaveIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v-4m4 7V7m4 13V4m4 13V7m4 7v-4" /></svg>; }
