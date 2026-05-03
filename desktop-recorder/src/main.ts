import { app, BrowserWindow, ipcMain, desktopCapturer, screen, globalShortcut, Menu } from 'electron';
import path from 'path';
import RecordRTC from 'recordrtc';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import axios from 'axios';

let mainWindow: BrowserWindow | null = null;
let recordingWindow: BrowserWindow | null = null;
let isRecording = false;
let mediaRecorder: any = null;
let recordedChunks: Buffer[] = [];
let vlypScores: number[] = [];

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    titleBarStyle: 'hiddenInset',
    show: false
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createRecordingOverlay() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  recordingWindow = new BrowserWindow({
    width: width,
    height: height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  recordingWindow.loadFile(path.join(__dirname, '../renderer/overlay.html'));
  recordingWindow.setIgnoreMouseEvents(true);
}

app.whenReady().then(() => {
  createMainWindow();
  
  // Global shortcuts
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    toggleRecording();
  });
  
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    highlightMoment();
  });

  const menuTemplate = [
    {
      label: 'VLYP Recorder',
      submenu: [
        {
          label: 'Start Recording',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => toggleRecording()
        },
        {
          label: 'Highlight Moment',
          accelerator: 'CmdOrCtrl+Shift+H',
          click: () => highlightMoment()
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate as any);
  Menu.setApplicationMenu(menu);
});

async function toggleRecording() {
  if (!isRecording) {
    await startRecording();
  } else {
    stopRecording();
  }
}

async function startRecording() {
  try {
    const sources = await desktopCapturer.getSources({ 
      types: ['screen', 'window'],
      thumbnailSize: { width: 1920, height: 1080 }
    });

    const source = sources.find(s => s.name === 'Entire Screen' || s.name === 'Screen 1');
    if (!source) {
      console.error('No screen source found');
      return;
    }

    const stream = await (navigator.mediaDevices as any).getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: source.id,
          minWidth: 1280,
          maxWidth: 1920,
          minHeight: 720,
          maxHeight: 1080
        }
      }
    });

    recordedChunks = [];
    vlypScores = [];
    
    mediaRecorder = new (require('recordrtc').RecordRTCPromisesHandler)(stream, {
      type: 'video',
      mimeType: 'video/webm',
      videoBitsPerSecond: 8000000,
      frameInterval: 30
    });

    await mediaRecorder.startRecording();
    isRecording = true;
    
    createRecordingOverlay();
    
    if (mainWindow) {
      mainWindow.webContents.send('recording-status-changed', { isRecording: true });
    }

    // Start VLYP scoring analysis
    startVlypScoring();

  } catch (error) {
    console.error('Error starting recording:', error);
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stopRecording().then(async () => {
      const blob = await mediaRecorder.getBlob();
      isRecording = false;
      
      if (recordingWindow) {
        recordingWindow.close();
        recordingWindow = null;
      }
      
      if (mainWindow) {
        mainWindow.webContents.send('recording-status-changed', { isRecording: false });
        mainWindow.webContents.send('recording-completed', { 
          videoPath: blob.path,
          vlypScores: vlypScores 
        });
      }

      // Process video with AI editing
      await processVideoWithAI(blob);
    });
  }
}

function highlightMoment() {
  if (isRecording) {
    const timestamp = Date.now();
    vlypScores.push(timestamp);
    
    if (recordingWindow) {
      recordingWindow.webContents.send('highlight-moment', { timestamp });
    }
    
    if (mainWindow) {
      mainWindow.webContents.send('highlight-added', { timestamp });
    }
  }
}

async function startVlypScoring() {
  // AI-powered real-time scoring
  setInterval(async () => {
    if (isRecording && mediaRecorder) {
      try {
        const currentFrame = await captureCurrentFrame();
        const score = await calculateVlypScore(currentFrame);
        vlypScores.push(score);
        
        if (mainWindow) {
          mainWindow.webContents.send('vlyp-score-update', { score, timestamp: Date.now() });
        }
      } catch (error) {
        console.error('VLYP scoring error:', error);
      }
    }
  }, 1000); // Score every second
}

async function captureCurrentFrame() {
  // Capture current screen frame for analysis
  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  // Implementation for frame capture
  return Buffer.from('');
}

async function calculateVlypScore(frame: Buffer): Promise<number> {
  // AI scoring algorithm based on:
  // - Action detection (movement, changes)
  // - Color intensity and contrast
  // - Pattern recognition for gaming moments
  // - Audio excitement levels
  
  // This is a simplified version - real implementation would use TensorFlow
  const baseScore = Math.random() * 100;
  const actionMultiplier = 1.5; // Boost for detected action
  return Math.min(100, baseScore * actionMultiplier);
}

async function processVideoWithAI(videoBlob: any) {
  try {
    // Auto-edit video based on VLYP scores
    const highlights = extractHighlights(vlypScores);
    const editedVideo = await autoEditVideo(videoBlob, highlights);
    
    // Upload to VLYP platform
    await uploadToVlyp(editedVideo);
    
  } catch (error) {
    console.error('AI processing error:', error);
  }
}

function extractHighlights(scores: number[]): { start: number; end: number; score: number }[] {
  const highlights = [];
  const threshold = 75; // VLYP score threshold for highlights
  
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] > threshold) {
      const start = i * 1000; // Convert to milliseconds
      let end = start + 10000; // 10 second clip
      
      // Find the peak in this window
      let peakScore = scores[i];
      for (let j = i; j < Math.min(i + 10, scores.length); j++) {
        if (scores[j] > peakScore) {
          peakScore = scores[j];
          end = j * 1000 + 10000;
        }
      }
      
      highlights.push({ start, end, score: peakScore });
      i += 10; // Skip ahead to avoid overlapping
    }
  }
  
  return highlights;
}

async function autoEditVideo(videoBlob: any, highlights: any[]) {
  // Use FFmpeg to cut and edit video highlights
  return new Promise((resolve) => {
    const outputPath = path.join(__dirname, '../temp/edited_video.mp4');
    
    // Create highlight compilation
    const ffmpegCommand = ffmpeg();
    
    highlights.forEach((highlight, index) => {
      ffmpegCommand
        .input(videoBlob.path)
        .inputOptions([
          `-ss ${highlight.start / 1000}`,
          `-t ${(highlight.end - highlight.start) / 1000}`
        ]);
    });
    
    ffmpegCommand
      .outputOptions([
        '-filter_complex', `concat=n=${highlights.length}:v=1:a=1`,
        '-preset', 'fast',
        '-crf', '23'
      ])
      .output(outputPath)
      .on('end', () => {
        resolve(outputPath);
      })
      .on('error', (error) => {
        console.error('FFmpeg error:', error);
        resolve(videoBlob.path); // Fallback to original
      })
      .run();
  });
}

async function uploadToVlyp(videoPath: string) {
  try {
    const formData = new FormData();
    formData.append('video', fs.createReadStream(videoPath));
    formData.append('title', 'Auto-edited highlight from VLYP Desktop');
    formData.append('game_title', 'Auto-detected');
    formData.append('vlyp_scores', JSON.stringify(vlypScores));
    
    const response = await axios.post('http://localhost:3000/api/desktop-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    if (mainWindow) {
      mainWindow.webContents.send('upload-complete', response.data);
    }
    
  } catch (error) {
    console.error('Upload error:', error);
  }
}

// IPC handlers
ipcMain.handle('get-screens', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  return sources.map(s => ({
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail.toDataURL()
  }));
});

ipcMain.handle('start-recording', async () => {
  await startRecording();
  return { success: true, isRecording };
});

ipcMain.handle('stop-recording', async () => {
  stopRecording();
  return { success: true, isRecording: false };
});

ipcMain.handle('highlight-moment', () => {
  highlightMoment();
  return { success: true };
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
