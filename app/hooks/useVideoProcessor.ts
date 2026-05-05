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
      playbackSpeed?: number,
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
      playbackSpeed = 1.0,
      bgmStartTime = 0,
      bgmDuration,
      volumeVideo = 1.0,
      volumeBgm = 0.5,
      volumeNarration = 1.5
    } = options as any;

    await ffmpeg.writeFile('input_video.mp4', await fetchFile(videoFile));
    
    let inputArgs: string[] = [];
    
    if (startTime > 0) inputArgs.push('-ss', startTime.toString());
    inputArgs.push('-i', 'input_video.mp4');
    if (duration) inputArgs.push('-t', duration.toString());

    inputArgs.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');

    const inputs = [...inputArgs];
    let filterComplex = '';
    let mixInputs = '';
    let audioInputs = 0;

    let videoFilters = [];
    
    if (playbackSpeed !== 1.0) {
      videoFilters.push(`setpts=${1.0 / playbackSpeed}*PTS`);
    }

    videoFilters.push("zoompan=z='min(zoom+0.001,1.05)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=hd1080");

    switch (filter) {
      case 'grayscale': videoFilters.push('hue=s=0,eq=contrast=1.2:brightness=0.02'); break;
      case 'sepia': videoFilters.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,curves=all="0/0 0.5/0.4 1/1"'); break;
      case 'cyberpunk': videoFilters.push('eq=contrast=1.4:brightness=0.06:saturation=2.5,curves=blue="0/0 0.4/0.7 1/1":red="0/0 0.6/0.4 1/1",colorbalance=ms=0.2:rs=0.3:bs=0.4'); break;
      case 'vintage': videoFilters.push('curves=all="0/0 0.5/0.46 1/1":red="0/0 0.5/0.55 1/1":blue="0/0 0.5/0.35 1/1",vignette=angle=0.4'); break;
      case 'warm': videoFilters.push('curves=all="0/0 0.5/0.45 1/1",colorbalance=rs=0.3:gs=0.15:bs=-0.1:rm=0.1:gm=0.05'); break;
      case 'none': break; 
    }

    if (videoFilters.length > 0) {
      filterComplex += `[0:v]${videoFilters.join(',')}[v1];`;
    } else {
      filterComplex += `[0:v]null[v1];`;
    }

    let videoAudioFilter = `volume=${volumeVideo}`;
    if (playbackSpeed !== 1.0) {
      const speed = Math.max(0.5, Math.min(2.0, playbackSpeed));
      videoAudioFilter += `,atempo=${speed}`;
    }
    
    filterComplex += `[1:a]volume=0.01[a_silent];`;
    filterComplex += `[0:a]${videoAudioFilter}[a_vid];`;
    mixInputs += '[a_vid][a_silent]';
    audioInputs = 2;

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

    if (bgmUrl) {
      const bgmBlob = await fetchAudioSafely(bgmUrl);
      if (bgmBlob) {
        await ffmpeg.writeFile('input_bgm.mp3', await fetchFile(bgmBlob));
        let bgmArgs = [];
        if (bgmStartTime > 0) bgmArgs.push('-ss', bgmStartTime.toString());
        bgmArgs.push('-i', 'input_bgm.mp3');
        if (bgmDuration) bgmArgs.push('-t', bgmDuration.toString());
        
        const bgmInputIndex = inputs.length;
        inputs.push(...bgmArgs);
        filterComplex += `[${bgmInputIndex}:a]volume=${volumeBgm}[a_bgm];`;
        mixInputs += '[a_bgm]';
        audioInputs++;
      }
    }

    if (narrationUrl) {
      const narrationBlob = await fetchAudioSafely(narrationUrl);
      if (narrationBlob) {
        await ffmpeg.writeFile('input_narration.mp3', await fetchFile(narrationBlob));
        const narrInputIndex = inputs.length;
        inputs.push('-i', 'input_narration.mp3');
        filterComplex += `[${narrInputIndex}:a]volume=${volumeNarration}[a_narr];`;
        mixInputs += '[a_narr]';
        audioInputs++;
      }
    }

    filterComplex += `${mixInputs}amix=inputs=${audioInputs}:duration=first[aout]`;

    const execArgs = [
      ...inputs,
      '-filter_complex', filterComplex,
      '-map', '[v1]',
      '-map', '[aout]',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-preset', 'ultrafast', 
      '-crf', '24',
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

  /**
   * 動画を縦型 (9:16 = 1080x1920) に変換する
   * mode: 'pad'  → 黒帯を付けてコンテンツ全体を表示（デフォルト）
   *       'crop' → 中央クロップで全画面表示（横動画は両端が切れる）
   */
  const convertToVertical = async (
    videoFile: File,
    options: {
      mode?: 'pad' | 'crop';
      width?: number;
      height?: number;
      bgColor?: string;
    } = {}
  ) => {
    if (!isLoaded) await load();
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg) throw new Error('FFmpeg not initialized');

    const {
      mode = 'pad',
      width = 1080,
      height = 1920,
      bgColor = 'black',
    } = options;

    await ffmpeg.writeFile('input_vert.mp4', await fetchFile(videoFile));

    let vf: string;
    if (mode === 'crop') {
      vf = [
        `scale=${width}:${height}:force_original_aspect_ratio=increase`,
        `crop=${width}:${height}`,
      ].join(',');
    } else {
      vf = [
        `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:${bgColor}`,
      ].join(',');
    }

    let lastError = '';
    const logCb = ({ message }: { message: string }) => {
      if (message.toLowerCase().includes('error')) lastError = message;
    };
    ffmpeg.on('log', logCb);

    try {
      const code = await ffmpeg.exec([
        '-i', 'input_vert.mp4',
        '-vf', vf,
        '-c:v', 'libx264',
        '-c:a', 'copy',
        '-preset', 'ultrafast',
        '-crf', '24',
        'output_vert.mp4',
      ]);

      if (code !== 0) {
        throw new Error(`縦型変換エラー (code ${code}): ${lastError || 'Unknown error'}`);
      }

      const data = await ffmpeg.readFile('output_vert.mp4');
      return new Blob([data as any], { type: 'video/mp4' });
    } finally {
      ffmpeg.off('log', logCb);
    }
  };

  return {
    isLoaded,
    progress,
    load,
    processVideoPro,
    mixVideoWithBgm,
    compressVideo,
    convertToVertical,
  };
}
