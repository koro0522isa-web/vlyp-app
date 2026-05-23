import path from 'path';

/**
 * Returns the absolute path to the bundled ffmpeg binary.
 *
 * ffmpeg-static ships the binary as a postinstall download. In Electron
 * production builds, the binary lives inside the asar archive, which cannot
 * execute. We must extract it to `app.asar.unpacked/` via electron-builder's
 * `asarUnpack` setting, and then translate the runtime path accordingly.
 */
function resolveFfmpegPath(): string {
  // ffmpeg-static is a CJS module that default-exports the path string.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffmpegStatic: string | null = require('ffmpeg-static');
  if (!ffmpegStatic) {
    // Fallback: hope ffmpeg is on PATH (legacy behavior, will fail at spawn time)
    return 'ffmpeg';
  }
  // In production, replace app.asar with app.asar.unpacked so we hit the extracted binary.
  return ffmpegStatic.replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep);
}

export const FFMPEG_PATH = resolveFfmpegPath();
