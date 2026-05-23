import { execFile } from 'child_process';
import { FFMPEG_PATH } from './ffmpeg-path';

/**
 * Hardware encoder auto-detection.
 *
 * Priority order matches real-world game capture quality/perf:
 *   1. NVIDIA NVENC (best in class, lowest CPU)
 *   2. AMD AMF      (great on Radeon GPUs)
 *   3. Intel QSV    (iGPU on most laptops + 12th gen+ desktop CPUs)
 *   4. libx264      (CPU fallback, present everywhere)
 */
export type VideoEncoder = 'h264_nvenc' | 'h264_amf' | 'h264_qsv' | 'libx264';

const PRIORITY: VideoEncoder[] = ['h264_nvenc', 'h264_amf', 'h264_qsv', 'libx264'];

let cachedEncoder: VideoEncoder | null = null;

/** Run a brief 1-frame probe to verify the encoder *actually works* (not just compiled in). */
function probeEncoder(enc: VideoEncoder): Promise<boolean> {
  return new Promise((resolve) => {
    const args = [
      '-hide_banner',
      '-loglevel', 'error',
      '-f', 'lavfi',
      '-i', 'nullsrc=s=64x64:r=1',
      '-frames:v', '1',
      '-c:v', enc,
      '-f', 'null',
      '-',
    ];
    execFile(FFMPEG_PATH, args, { timeout: 8000 }, (err) => {
      resolve(!err);
    });
  });
}

/** Returns the best working encoder. Result is cached after the first call. */
export async function detectBestEncoder(force = false): Promise<VideoEncoder> {
  if (cachedEncoder && !force) return cachedEncoder;
  for (const enc of PRIORITY) {
    const ok = await probeEncoder(enc);
    if (ok) {
      cachedEncoder = enc;
      console.log(`[hw-encoder] selected: ${enc}`);
      return enc;
    }
  }
  cachedEncoder = 'libx264';
  return 'libx264';
}

/**
 * Build the ffmpeg encoder arguments for the given encoder + quality (CRF/CQ-style 18-28).
 * Lower number = better quality, larger file. Sane default = 23.
 */
export function buildEncoderArgs(enc: VideoEncoder, quality: number = 23): string[] {
  const q = Math.min(Math.max(quality | 0, 16), 32);
  switch (enc) {
    case 'h264_nvenc':
      // p4 = balanced (NVIDIA preset scale: p1=fastest, p7=slowest/highest quality)
      return ['-c:v', 'h264_nvenc', '-preset', 'p4', '-tune', 'hq', '-rc', 'vbr', '-cq', String(q), '-b:v', '0'];
    case 'h264_amf':
      return ['-c:v', 'h264_amf', '-quality', 'balanced', '-rc', 'cqp', '-qp_i', String(q), '-qp_p', String(q)];
    case 'h264_qsv':
      return ['-c:v', 'h264_qsv', '-preset', 'medium', '-global_quality', String(q), '-look_ahead', '1'];
    case 'libx264':
    default:
      // veryfast/CRF23 is a huge step up from ultrafast/CRF28 (the old default)
      return ['-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency', '-crf', String(q)];
  }
}

/** Reset cached selection (used when user changes preferredEncoder in settings) */
export function resetEncoderCache(): void {
  cachedEncoder = null;
}
