import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { FFMPEG_PATH } from './ffmpeg-path';

/**
 * Generate a thumbnail jpg next to the given .mp4 clip.
 * Picks a frame ~10% into the clip (skip black intro) and scales to 320x180.
 * Returns the absolute path to the thumb, or null on failure.
 */
export async function generateThumbnail(clipPath: string): Promise<string | null> {
  if (!fs.existsSync(clipPath)) return null;
  const thumbPath = clipPath.replace(/\.mp4$/i, '.jpg');
  // Skip if already generated
  if (fs.existsSync(thumbPath)) return thumbPath;

  return new Promise((resolve) => {
    const args = [
      '-hide_banner', '-loglevel', 'error',
      // -ss after -i is "accurate seek" — slower but correct for short clips
      '-i', clipPath,
      '-ss', '2.5',           // 2.5 seconds in (skip black intro)
      '-frames:v', '1',
      '-vf', 'scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2',
      '-q:v', '4',            // jpeg quality, 1-31, lower=better; 4 is sharp + small
      '-y',
      thumbPath,
    ];
    const proc = spawn(FFMPEG_PATH, args, { windowsHide: true });
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(thumbPath)) {
        resolve(thumbPath);
      } else {
        resolve(null);
      }
    });
    proc.on('error', () => resolve(null));
  });
}
