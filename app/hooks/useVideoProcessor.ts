import { useState, useRef } from 'react';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export function useVideoProcessor() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const ffmpegRef = useRef<any>(null);

  const load = async () => {
    if (typeof window === 'undefined') return;
    
    if (!ffmpegRef.current) {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      ffmpegRef.current = new FFmpeg();
    }
    
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
    const ffmpeg = ffmpegRef.current;
    
    ffmpeg.on('log', ({ message }) => {
      console.log(message);
    });

    ffmpeg.on('progress', ({ progress }) => {
      setProgress(progress * 100);
    });

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    
    setIsLoaded(true);
  };

  /**
   * 動画とBGM、さらにナレーションをミックスする (Pro機能)
   */
  const mixVideoWithBgm = async (videoFile: File, bgmUrl: string, narrationUrl?: string) => {
    if (!isLoaded) await load();
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg) throw new Error('FFmpeg not initialized');

    // ファイルを仮想ファイルシステムに書き込む
    await ffmpeg.writeFile('input_video.mp4', await fetchFile(videoFile));
    
    const inputs = ['-i', 'input_video.mp4'];
    let filterComplex = '[0:a]volume=0.3[a1]';
    let mixInputs = '[a1]';
    let inputCount = 1;

    if (bgmUrl) {
      await ffmpeg.writeFile('input_bgm.mp3', await fetchFile(bgmUrl));
      inputs.push('-i', 'input_bgm.mp3');
      filterComplex += `;[${inputCount}:a]volume=0.6[a2]`;
      mixInputs += '[a2]';
      inputCount++;
    }

    if (narrationUrl) {
      await ffmpeg.writeFile('input_narration.mp3', await fetchFile(narrationUrl));
      inputs.push('-i', 'input_narration.mp3');
      filterComplex += `;[${inputCount}:a]volume=1.2[a3]`;
      mixInputs += '[a3]';
      inputCount++;
    }

    filterComplex += `;${mixInputs}amix=inputs=${inputCount}:duration=first[a]`;

    // FFmpegコマンドを実行
    await ffmpeg.exec([
      ...inputs,
      '-filter_complex', filterComplex,
      '-map', '0:v',
      '-map', '[a]',
      '-c:v', 'copy',
      '-shortest',
      'output.mp4'
    ]);

    const data = await ffmpeg.readFile('output.mp4');
    return new Blob([data as any], { type: 'video/mp4' });
  };

  /**
   * 動画を圧縮する (将来用)
   */
  const compressVideo = async (videoFile: File) => {
    if (!isLoaded) await load();
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg) throw new Error('FFmpeg not initialized');

    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
    
    // crf=28でいい感じに圧縮
    await ffmpeg.exec(['-i', 'input.mp4', '-vcodec', 'libx264', '-crf', '28', 'compressed.mp4']);

    const data = await ffmpeg.readFile('compressed.mp4');
    return new Blob([data as any], { type: 'video/mp4' });
  };

  return {
    isLoaded,
    progress,
    load,
    mixVideoWithBgm,
    compressVideo
  };
}
