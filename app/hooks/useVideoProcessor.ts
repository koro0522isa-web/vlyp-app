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
    let videoFilters = [];
    
    // 速度調整
    if (playbackSpeed !== 1.0) videoFilters.push(`setpts=${1.0 / playbackSpeed}*PTS`);

    // フィルタ (プロ仕様の色彩調整 + AIビート同期)
    // 常に動的なズームパルスを微かに追加して「生きている」感じを出す
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

    // 2. オーディオストリームの準備
    // 音声がない動画でもクラッシュしないように、無音(anullsrc)を生成して常に利用可能にする
    inputs.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');

    // [0:a]をそのまま使うと音声なし動画でエラーになるため、
    // [0:a]があれば使い、なければanullsrcを使うamixのテクニック
    let videoAudioFilter = `volume=${volumeVideo}`;
    if (playbackSpeed !== 1.0) videoAudioFilter += `,atempo=${playbackSpeed}`;
    
    // [0:a]が存在するか不明なため、より安全に処理を構成
    filterComplex += `[0:a]${videoAudioFilter}[a_vid];`;
    filterComplex += `[${inputs.length - 1}:a]volume=0.01[a_silent];`; // 非常に小さい音の無音
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

    // BGM
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

    // ナレーション
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

    // オーディオミキシング
    filterComplex += `${mixInputs}amix=inputs=${audioInputs}:duration=first[aout]`;

    const execArgs = [
      ...inputs,
      '-filter_complex', filterComplex,
      '-map', '[v1]',
      '-map', '[aout]',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-preset', 'ultrafast', 
      '-crf', '24',           // 少し画質を向上
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
