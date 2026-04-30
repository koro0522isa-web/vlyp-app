"use client";

import { useState, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export function useVideoProcessor() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const load = async () => {
    if (typeof window === 'undefined') return;
    
    if (!ffmpegRef.current) {
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
   * 動画とBGMをミックスする (Pro機能)
   */
  const mixVideoWithBgm = async (videoFile: File, bgmUrl: string) => {
    if (!isLoaded) await load();
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg) throw new Error('FFmpeg not initialized');

    // ファイルを仮想ファイルシステムに書き込む
    await ffmpeg.writeFile('input_video.mp4', await fetchFile(videoFile));
    await ffmpeg.writeFile('input_bgm.mp3', await fetchFile(bgmUrl));

    // FFmpegコマンドを実行:
    // -i input_video.mp4: 動画入力
    // -i input_bgm.mp3: 音楽入力
    // -filter_complex: 音声をいい感じにミックス (動画音 0.2, BGM 0.8)
    // -c:v copy: 映像は再エンコードせずそのまま (爆速)
    // -map 0:v: 0番目(動画)の映像を使う
    // -map [a]: ミックスした音声を使う
    // -shortest: 短い方のファイル(通常は動画)に合わせる
    await ffmpeg.exec([
      '-i', 'input_video.mp4',
      '-i', 'input_bgm.mp3',
      '-filter_complex', '[0:a]volume=0.3[a1];[1:a]volume=0.8[a2];[a1][a2]amix=inputs=2:duration=first[a]',
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
