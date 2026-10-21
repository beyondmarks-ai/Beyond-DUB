# Beyond-DUB

A clean Next.js website that detects the spoken language in an uploaded video, translates it into the user's selected language, and shows a synchronized A/B review. It preserves the original timeline, music, and ambience while supporting translation tone, preset voices, and multi-speaker voice cloning.

## Setup

Requirements: Node.js 20.9+, FFmpeg on `PATH`, Python 3.11, and a Sarvam API key.

```powershell
Copy-Item .env.example .env.local
# Add your key to .env.local
npm install
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm run dev
```

Open <http://localhost:3001>.

## How it works

1. The server extracts the first 25 seconds of speech with FFmpeg.
2. Saaras v4 detects the source language.
3. The official Sarvam Dubbing API translates and aligns speech to the source segments.
4. Sarvam applies the selected translation style and either a preset narrator or distinct cloned voices for each detected speaker.
5. Demucs separates vocals from the original audio, then FFmpeg mixes the recovered background with translated speech. Background is boosted by 12 dB by default so it remains audible beside the louder dub, with a peak limiter to prevent clipping.
6. The app polls until the selected Indic-language video is ready, then provides synchronized A/B playback.

In the completed view, adjust **Background volume** from 0 to +18 dB and choose **Apply background level** to rebuild the mix using the existing translation. This reruns local separation and mixing, without a new paid dubbing job. The previous result stays available if mixing fails. The slider affects the exported mix after applying, not live playback volume.

Demucs separates vocals from instruments; it cannot reliably distinguish a song's singer from the person speaking. Sung lyrics may be removed, and boosting the background can reveal separation artifacts. This feature preserves recovered instrumental music and ambience, not an exact copy of the full original song.

The key remains server-side. The demo accepts files up to 250 MB and supports Sarvam Dubbing's 12 languages. The first background restoration downloads the Demucs model (about 80 MB). Exact frame-level lip sync is outside the API contract; speech is aligned to the original timestamped segments.

## Checks

```powershell
npm test
npm run build
```

<!-- beyond-marks-credit:start -->
---
### Built by Beyond Marks AI Academy

Developed by **Rakesh Kumar** at [Beyond Marks AI Academy](https://beyondmarks.ai).
<!-- beyond-marks-credit:end -->
