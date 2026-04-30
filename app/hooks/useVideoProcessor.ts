import { useState, useRef } from 'react';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export type VideoFilter = 'none' | 'grayscale' | 'sepia' | 'cyberpunk' | 'vintage' | 'warm';

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
    
    ffmpeg.on('log', ({ message }: { message: string }) => {
      console.log(message);
    });

    ffmpeg.on('progress', ({ progress }: { progress: number }) => {
      setProgress(progress * 100);
    });

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    
    setIsLoaded(true);
  };

  /**
   * PRO機能: 動画の加工（フィルタ、トリミング、BGM合成、ナレーション合成）を一度に行う
   */
  const processVideoPro = async (
    videoFile: File, 
    options: {
      bgmUrl?: string,
      narrationUrl?: string,
      filter?: VideoFilter,
      startTime?: number,
      duration?: number,
      volumeVideo?: number,
      volumeBgm?: number,
      volumeNarration?: number
    }
  ) => {
    if (!isLoaded) await load();
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg) throw new Error('FFmpeg not initialized');

    const {
      bgmUrl,
      narrationUrl,
      filter = 'none',
      startTime = 0,
      duration,
      volumeVideo = 1.0,
      volumeBgm = 0.5,
      volumeNarration = 1.5
    } = options;

    // ファイルを書き込み
    await ffmpeg.writeFile('input_video.mp4', await fetchFile(videoFile));
    
    let inputArgs: string[] = [];
    
    // トリミング設定
    if (startTime > 0) inputArgs.push('-ss', startTime.toString());
    inputArgs.push('-i', 'input_video.mp4');
    if (duration) inputArgs.push('-t', duration.toString());

    const inputs = [...inputArgs];
    let filterComplex = `[0:a]volume=${volumeVideo}[a1]`;
    let mixInputs = '[a1]';
    let inputCount = 1;

    // BGM
    if (bgmUrl) {
      await ffmpeg.writeFile('input_bgm.mp3', await fetchFile(bgmUrl));
      inputs.push('-i', 'input_bgm.mp3');
      filterComplex += `;[${inputCount}:a]volume=${volumeBgm}[a2]`;
      mixInputs += '[a2]';
      inputCount++;
    }

    // ナレーション
    if (narrationUrl) {
      await ffmpeg.writeFile('input_narration.mp3', await fetchFile(narrationUrl));
      inputs.push('-i', 'input_narration.mp3');
      filterComplex += `;[${inputCount}:a]volume=${volumeNarration}[a3]`;
      mixInputs += '[a3]';
      inputCount++;
    }

    // オーディオミキシング
    if (inputCount > 1) {
      filterComplex += `;${mixInputs}amix=inputs=${inputCount}:duration=first[aout]`;
    } else {
      filterComplex += `;[a1]anull[aout]`;
    }

    // ビデオフィルタ設定
    let videoFilter = '';
    switch (filter) {
      case 'grayscale': videoFilter = 'hue=s=0'; break;
      case 'sepia': videoFilter = 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131'; break;
      case 'cyberpunk': videoFilter = 'eq=contrast=1.2:brightness=0.05:saturation=2,curves=blue="0/0 0.5/0.8 1/1":red="0/0 0.5/0.2 1/1"'; break;
      case 'vintage': videoFilter = 'curves=vintage,noise=alls=5:allf=t+u'; break;
      case 'warm': videoFilter = 'curves=all="0/0 0.5/0.45 1/1",colorbalance=rs=0.2:gs=0.1:bs=-0.2'; break;
      default: videoFilter = 'copy';
    }

    const execArgs = [
      ...inputs,
      '-filter_complex', filterComplex,
      '-map', '0:v',
    ];

    if (videoFilter !== 'copy') {
      execArgs.push('-vf', videoFilter);
    }

    execArgs.push(
      '-map', '[aout]',
      '-c:v', 'libx264',
      '-preset', 'ultrafast', // 速度優先
      '-crf', '28',           // 圧縮率と画質のバランス
      '-shortest',
      'output.mp4'
    );

    await ffmpeg.exec(execArgs);

    const data = await ffmpeg.readFile('output.mp4');
    return new Blob([data as any], { type: 'video/mp4' });
  };

  // 互換性のための古いメソッド
  const mixVideoWithBgm = async (videoFile: File, bgmUrl: string, narrationUrl?: string) => {
    return processVideoPro(videoFile, { bgmUrl, narrationUrl });
  };

  const compressVideo = async (videoFile: File) => {
    if (!isLoaded) await load();
    const ffmpeg = ffmpegRef.current;
    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
    await ffmpeg.exec(['-i', 'input.mp4', '-vcodec', 'libx264', '-crf', '28', 'compressed.mp4']);
    const data = await ffmpeg.readFile('compressed.mp4');
    return new Blob([data as any], { type: 'video/mp4' });
  };

  return {
    isLoaded,
    progress,
    load,
    processVideoPro,
    mixVideoWithBgm,
    compressVideo
  };
}
