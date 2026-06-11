# MEDIA ENCODER

Desktop media encoder for Windows. Transcode video files and image sequences to **MP4 (H.264)**, **Apple ProRes**, or **HAP** using bundled FFmpeg.

## Features

- Video files and image sequence folders as sources
- Output formats: MP4 (H.264), ProRes (422 LT / 422 / HQ / 4444 / 4444 Alpha), HAP (HAP / Alpha / Q)
- Input/output framerate: Auto (video), presets 25/30/50/60, or custom
- Trim by frame number (sequence-native frame indices) or timecode
- Optional external audio with trim-to-video
- Resize: original, percent, max width/height, or exact dimensions
- Batch queue with per-job settings, duplicate, and status reset
- Configurable output path template (`{source_dir}`, `{source_name}`, `{ext}`, `{profile}`, etc.)

## Setup

```bash
npm install
npm run fetch-ffmpeg   # full FFmpeg build (required for HAP)
npm run dev
```

`generate-icon` runs automatically on `npm run build` (source: `MEencoder_icon.png`).

## Build installer

Close any running MEDIA ENCODER / Electron windows first.

```bash
npm run dist
```

Output in `dist-release/`:

- `MEDIA ENCODER Setup 1.0.0.exe` — installer
- `win-unpacked/MEDIA ENCODER.exe` — portable build

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development with hot reload |
| `npm run start` | Build and run locally |
| `npm run build` | Compile app |
| `npm run dist` | Build Windows installer |
| `npm run clean` | Remove `out/`, `dist-release/`, etc. |
| `npm run fetch-ffmpeg` | Download FFmpeg full build |

## License

MIT (application). FFmpeg is subject to its own license when distributed.
