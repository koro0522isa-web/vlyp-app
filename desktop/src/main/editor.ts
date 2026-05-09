import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import https from 'https';
import FormData from 'form-data';

export interface EditOptions {
  vertical: boolean;       // 16:9 → 9:16 縦型変換
  captions: boolean;       // Whisper字幕自動生成
  openaiApiKey: string;
  language?: string;       // 'ja' | 'en' | 'auto'
  killTimestamp?: number;  // キル発生時刻(秒) — ズームエフェクト用
}

export interface EditResult {
  editedPath: string;
  srtPath?: string;
  error?: string;
}

interface Segment {
  start: number;
  end: number;
  text: string;
}

export class Editor {
  /**
   * クリップを自動編集する
   * 縦型変換 → 字幕生成 → 字幕焼き込み の順に処理
   */
  async edit(rawClipPath: string, options: EditOptions): Promise<EditResult> {
    const baseName = path.basename(rawClipPath, '.mp4');
    const dir = path.dirname(rawClipPath);
    let currentPath = rawClipPath;
    const tempFiles: string[] = [];

    try {
      // Step 1: 縦型変換 (9:16 ブラー背景)
      if (options.vertical) {
        const vertPath = path.join(dir, `${baseName}_vert.mp4`);
        await this.toVertical(currentPath, vertPath);
        if (currentPath !== rawClipPath) tempFiles.push(currentPath);
        currentPath = vertPath;
        tempFiles.push(vertPath);
        console.log('[Editor] Vertical conversion done:', vertPath);
      }

      // Step 2: Whisper字幕生成 + 焼き込み
      let srtPath: string | undefined;
      if (options.captions && options.openaiApiKey) {
        const audioPath = path.join(dir, `${baseName}_audio.mp3`);
        tempFiles.push(audioPath);

        try {
          await this.extractAudio(currentPath, audioPath);
          const segments = await this.whisperTranscribe(audioPath, options.openaiApiKey, options.language || 'ja');

          if (segments.length > 0) {
            srtPath = path.join(dir, `${baseName}.srt`);
            this.writeSRT(segments, srtPath);

            const subbedPath = path.join(dir, `${baseName}_sub.mp4`);
            await this.burnSubtitles(currentPath, srtPath, subbedPath);
            if (currentPath !== rawClipPath) tempFiles.push(currentPath);
            currentPath = subbedPath;
            tempFiles.push(subbedPath);
            console.log('[Editor] Captions done:', srtPath);
          }
        } catch (err) {
          console.warn('[Editor] Caption generation failed, skipping:', err);
        }

        // 音声ファイル削除
        try { fs.unlinkSync(audioPath); } catch {}
        const idx = tempFiles.indexOf(audioPath);
        if (idx >= 0) tempFiles.splice(idx, 1);
      }

      // Step 3: 最終出力パスへリネーム
      const finalPath = path.join(dir, `${baseName}_edited.mp4`);
      if (currentPath !== rawClipPath) {
        fs.renameSync(currentPath, finalPath);
        // tempFiles からリネーム元を除去
        const idx = tempFiles.indexOf(currentPath);
        if (idx >= 0) tempFiles.splice(idx, 1);
      }

      // 中間ファイル削除
      for (const f of tempFiles) {
        try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
      }

      return { editedPath: finalPath, srtPath };
    } catch (err) {
      // エラー時も中間ファイルをクリーンアップ
      for (const f of tempFiles) {
        try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Editor] Edit failed:', msg);
      return { editedPath: '', error: msg };
    }
  }

  /**
   * 16:9 → 9:16 変換
   * Medal.tv スタイル: ブラー背景に元映像をセンタリング
   */
  private toVertical(input: string, output: string): Promise<void> {
    const vfChain = [
      'split[original][copy]',
      '[copy]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=luma_radius=30:luma_power=2[blur]',
      '[original]scale=1080:-2:force_original_aspect_ratio=decrease[fg]',
      '[blur][fg]overlay=(W-w)/2:(H-h)/2',
    ].join(';');

    return this.runFFmpeg([
      '-i', input,
      '-vf', vfChain,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'copy',
      '-y', output,
    ]);
  }

  /**
   * 動画から音声を抽出 (Whisper用: mono 16kHz 64kbps mp3)
   */
  private extractAudio(input: string, output: string): Promise<void> {
    return this.runFFmpeg([
      '-i', input,
      '-vn',
      '-acodec', 'libmp3lame',
      '-ar', '16000',
      '-ac', '1',
      '-b:a', '64k',
      '-y', output,
    ]);
  }

  /**
   * OpenAI Whisper API で文字起こし
   */
  private whisperTranscribe(
    audioPath: string,
    apiKey: string,
    language: string
  ): Promise<Segment[]> {
    return new Promise((resolve) => {
      try {
        const form = new FormData();
        form.append('file', fs.createReadStream(audioPath), {
          filename: 'audio.mp3',
          contentType: 'audio/mpeg',
        });
        form.append('model', 'whisper-1');
        form.append('response_format', 'verbose_json');
        if (language !== 'auto') {
          form.append('language', language);
        }

        const req = https.request(
          {
            hostname: 'api.openai.com',
            path: '/v1/audio/transcriptions',
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              ...form.getHeaders(),
            },
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              try {
                const json = JSON.parse(data);
                const segments: Segment[] = (json.segments || []).map(
                  (s: { start: number; end: number; text: string }) => ({
                    start: s.start,
                    end: s.end,
                    text: s.text.trim(),
                  })
                );
                resolve(segments);
              } catch {
                resolve([]);
              }
            });
          }
        );

        req.on('error', (err) => {
          console.warn('[Editor] Whisper request error:', err.message);
          resolve([]);
        });

        form.pipe(req);
      } catch (err) {
        console.warn('[Editor] Whisper setup error:', err);
        resolve([]);
      }
    });
  }

  /**
   * SRT形式で字幕ファイルを書き出す
   */
  private writeSRT(segments: Segment[], srtPath: string): void {
    const toSRTTime = (s: number): string => {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = Math.floor(s % 60);
      const ms = Math.round((s % 1) * 1000);
      return [
        String(h).padStart(2, '0'),
        String(m).padStart(2, '0'),
        String(sec).padStart(2, '0'),
      ].join(':') + ',' + String(ms).padStart(3, '0');
    };

    const srt = segments
      .map(
        (seg, i) =>
          `${i + 1}\n${toSRTTime(seg.start)} --> ${toSRTTime(seg.end)}\n${seg.text}`
      )
      .join('\n\n');

    fs.writeFileSync(srtPath, srt, 'utf-8');
  }

  /**
   * SRT字幕を動画に焼き込む
   * スタイル: 白文字・黒アウトライン・下部中央 (Medal/TikTok風)
   */
  private burnSubtitles(input: string, srtPath: string, output: string): Promise<void> {
    // Windowsパス対応: バックスラッシュをスラッシュに変換 + コロンをエスケープ
    const escapedSrt = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');

    const style = [
      'FontName=Arial',
      'FontSize=20',
      'Bold=1',
      'PrimaryColour=&H00FFFFFF',  // 白
      'OutlineColour=&H00000000',  // 黒アウトライン
      'BackColour=&H80000000',     // 半透明背景
      'Outline=2',
      'Shadow=0',
      'Alignment=2',               // 下部中央
      'MarginV=40',
    ].join(',');

    return this.runFFmpeg([
      '-i', input,
      '-vf', `subtitles='${escapedSrt}':force_style='${style}'`,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'copy',
      '-y', output,
    ]);
  }

  /**
   * ffmpegプロセスを実行して完了を待つ
   */
  private runFFmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const ff = spawn('ffmpeg', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stderr = '';
      ff.stderr?.on('data', (d) => (stderr += d.toString()));

      ff.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
        } else {
          resolve();
        }
      });

      ff.on('error', (err) => {
        reject(new Error(`ffmpeg spawn error: ${err.message}`));
      });
    });
  }
}