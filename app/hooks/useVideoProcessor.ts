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
      bgmStartTime?: number,
      bgmDuration?: number,
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
      bgmStartTime = 0,
      bgmDuration,
      volumeVideo = 1.0,
      volumeBgm = 0.5,
      volumeNarration = 1.5
    } = options as any;

    // ファイルを書き込み
    await ffmpeg.writeFile('input_video.mp4', await fetchFile(videoFile));
    
    let inputArgs: string[] = [];
    
    // トリミング設定
    if (startTime > 0) inputArgs.push('-ss', startTime.toString());
    inputArgs.push('-i', 'input_video.mp4');
    if (duration) inputArgs.push('-t', duration.toString());

    const inputs = [...inputArgs];
    let filterComplex = '';
    let mixInputs = '';
    let audioInputs = 0;

    // 1. ビデオストリームの処理 ([0:v] -> [v1])
    let videoFilter = '';
    switch (filter) {
      case 'grayscale': videoFilter = 'hue=s=0'; break;
      case 'sepia': videoFilter = 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131'; break;
      case 'cyberpunk': videoFilter = 'eq=contrast=1.2:brightness=0.05:saturation=2,curves=blue="0/0 0.5/0.8 1/1":red="0/0 0.5/0.2 1/1"'; break;
      case 'vintage': videoFilter = 'curves=all="0/0 0.5/0.46 1/1":red="0/0 0.5/0.55 1/1":blue="0/0 0.5/0.35 1/1"'; break;
      case 'warm': videoFilter = 'curves=all="0/0 0.5/0.45 1/1",colorbalance=rs=0.2:gs=0.1:bs=-0.2'; break;
      default: videoFilter = 'copy';
    }

    if (videoFilter !== 'copy') {
      filterComplex += `[0:v]${videoFilter}[v1];`;
    } else {
      filterComplex += `[0:v]null[v1];`;
    }

    // 2. オーディオストリームの準備
    const fetchAudioSafely = async (url: string) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) return null;
        return await res.blob();
      } catch {
        return null;
      }
    };

    // 元動画の音声 ([0:a] -> [a0])
    // 音声がない場合を考慮して、常に無音を追加してミックスするのが安全
    filterComplex += `[0:a]volume=${volumeVideo}[a0];`;
    mixInputs += '[a0]';
    audioInputs++;

    // BGM ([inputCount:a] -> [a1])
    if (bgmUrl) {
      const bgmBlob = await fetchAudioSafely(bgmUrl);
      if (bgmBlob) {
        await ffmpeg.writeFile('input_bgm.mp3', await fetchFile(bgmBlob));
        let bgmArgs = [];
        if (bgmStartTime > 0) bgmArgs.push('-ss', bgmStartTime.toString());
        bgmArgs.push('-i', 'input_bgm.mp3');
        if (bgmDuration) bgmArgs.push('-t', bgmDuration.toString());
        
        inputs.push(...bgmArgs);
        filterComplex += `[${audioInputs}:a]volume=${volumeBgm}[a1];`;
        mixInputs += '[a1]';
        audioInputs++;
      }
    }

    // ナレーション ([inputCount:a] -> [a2])
    if (narrationUrl) {
      const narrationBlob = await fetchAudioSafely(narrationUrl);
      if (narrationBlob) {
        await ffmpeg.writeFile('input_narration.mp3', await fetchFile(narrationBlob));
        inputs.push('-i', 'input_narration.mp3');
        filterComplex += `[${audioInputs}:a]volume=${volumeNarration}[a2];`;
        mixInputs += '[a2]';
        audioInputs++;
      }
    }

    // オーディオミキシング
    if (audioInputs > 1) {
      filterComplex += `${mixInputs}amix=inputs=${audioInputs}:duration=first[aout]`;
    } else {
      filterComplex += `[a0]anull[aout]`;
    }

    const execArgs = [
      ...inputs,
      '-filter_complex', filterComplex,
      '-map', '[v1]',
      '-map', '[aout]',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-preset', 'ultrafast', 
      '-crf', '28',           
      '-shortest',
      'output.mp4'
    ];

    let lastError = '';
    const logCallback = ({ message }: { message: string }) => {
      console.log(message);
      if (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) {
        lastError = message;
      }
    };
    ffmpeg.on('log', logCallback);

    try {
      const code = await ffmpeg.exec(execArgs);
      if (code !== 0) {
        throw new Error(`FFmpeg error (code ${code}): ${lastError || 'Unknown error'}`);
      }
      const data = await ffmpeg.readFile('output.mp4');
      return new Blob([data as any], { type: 'video/mp4' });
    } finally {
      ffmpeg.off('log', logCallback);
    }
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
