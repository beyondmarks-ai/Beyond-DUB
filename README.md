# Beyond-DUB

A clean Next.js website that detects the spoken language in an uploaded video, translates it into the user's selected language, and shows a synchronized A/B review. It preserves the original timeline, music, and ambience while supporting translation tone, preset voices, and multi-speaker voice cloning.

## Setup

Requirements: Node.js 20.9+, FFmpeg on `PATH`, and a Sarvam API key.

```powershell
Copy-Item .env.example .env.local
# Add your key to .env.local
npm install
npm run dev
```

Open <http://localhost:3001>.

## How it works

1. The server extracts the first 25 seconds of speech with FFmpeg.
2. Saaras v4 detects the source language.
3. The official Sarvam Dubbing API translates and aligns speech to the source segments.
4. Sarvam applies the selected translation style and either a preset narrator or distinct cloned voices for each detected speaker.
5. The translated speech is re-mixed onto the original timeline so music and ambience remain in the finished video.
6. The app polls until the selected Indic-language video is ready, then provides synchronized A/B playback.

The key remains server-side. The demo accepts files up to 250 MB and supports Sarvam Dubbing's 12 languages. Exact frame-level lip sync is outside the API contract; speech is aligned to the original timestamped segments.

## Checks

```powershell
npm test
npm run build
```
