// VLYP Desktop Recorder Type Definitions

export interface VLYPScore {
  score: number;
  timestamp: number;
  isHighlight: boolean;
  factors?: {
    actionIntensity: number;
    visualContrast: number;
    colorVibrancy: number;
    movementSpeed: number;
    audioExcitement: number;
    patternRecognition: number;
  };
}

export interface RecordingSession {
  id: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  highlights: HighlightMarker[];
  scores: VLYPScore[];
  status: 'recording' | 'stopped' | 'processing' | 'completed' | 'failed';
}

export interface HighlightMarker {
  id: string;
  timestamp: number;
  score: number;
  duration: number;
  title?: string;
  description?: string;
}

export interface ScreenSource {
  id: string;
  name: string;
  thumbnail?: string;
  display_id?: string;
  app?: Record<string, unknown>;
}

export interface MediaRecorderInstance {
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  state: 'inactive' | 'recording' | 'paused';
  stream?: MediaStream;
}

export interface VideoProcessingOptions {
  outputPath: string;
  format: string;
  quality: 'low' | 'medium' | 'high';
  resolution?: {
    width: number;
    height: number;
  };
  fps?: number;
  bitrate?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number;
  timeRemaining?: number;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadResponse {
  id: string;
  url: string;
  title: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  vlypScores?: VLYPScore[];
}

export interface OBSConnection {
  host: string;
  port: number;
  password?: string;
  connected: boolean;
  version?: string;
}

export interface StreamingSettings {
  platforms: ('youtube' | 'twitch' | 'kick')[];
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
  language?: string;
  isMature?: boolean;
  delaySeconds?: number;
}

export interface StreamInfo {
  id: string;
  title: string;
  status: 'starting' | 'live' | 'partial' | 'ended' | 'failed';
  platforms: string[];
  viewerCount: number;
  startTime: number;
  endTime?: number;
  streamUrls?: Record<string, string>;
}

// Error types
export class VLYPError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'VLYPError';
  }
}

export class RecordingError extends VLYPError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'RECORDING_ERROR', details);
    this.name = 'RecordingError';
  }
}

export class UploadError extends VLYPError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'UPLOAD_ERROR', details);
    this.name = 'UploadError';
  }
}

export class ProcessingError extends VLYPError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'PROCESSING_ERROR', details);
    this.name = 'ProcessingError';
  }
}
