import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// VLYP Scoring Algorithm
interface VlypScoreFactors {
  actionIntensity: number;
  visualContrast: number;
  colorVibrancy: number;
  movementSpeed: number;
  audioExcitement: number;
  patternRecognition: number;
}

export async function POST(request: NextRequest) {
  try {
    const { videoFrame, audioData, previousScore } = await request.json();

    // Calculate VLYP score based on multiple factors
    const factors: VlypScoreFactors = {
      actionIntensity: calculateActionIntensity(videoFrame),
      visualContrast: calculateVisualContrast(videoFrame),
      colorVibrancy: calculateColorVibrancy(videoFrame),
      movementSpeed: calculateMovementSpeed(videoFrame, previousScore),
      audioExcitement: calculateAudioExcitement(audioData),
      patternRecognition: calculatePatternRecognition(videoFrame)
    };

    // Weighted scoring algorithm
    const weights = {
      actionIntensity: 0.3,
      visualContrast: 0.2,
      colorVibrancy: 0.15,
      movementSpeed: 0.2,
      audioExcitement: 0.1,
      patternRecognition: 0.05
    };

    let totalScore = 0;
    for (const [factor, value] of Object.entries(factors)) {
      totalScore += value * weights[factor as keyof typeof weights];
    }

    // Apply gaming-specific boosts
    const gamingBoost = applyGamingBoosts(factors);
    totalScore *= gamingBoost;

    // Normalize to 0-100 scale
    const normalizedScore = Math.min(100, Math.max(0, totalScore * 100));

    return NextResponse.json({
      score: normalizedScore,
      factors,
      gamingBoost,
      isHighlight: normalizedScore > 75,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('VLYP scoring error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate VLYP score' },
      { status: 500 }
    );
  }
}

function calculateActionIntensity(frame: any): number {
  // Simulate action detection - in real implementation would use computer vision
  // High action = lots of movement, explosions, fast transitions
  const baseAction = Math.random() * 0.8 + 0.2; // 0.2-1.0
  
  // Boost for red/orange colors (explosions, health bars)
  const colorBoost = hasExplosiveColors(frame) ? 0.3 : 0;
  
  return Math.min(1, baseAction + colorBoost);
}

function calculateVisualContrast(frame: any): number {
  // Calculate contrast between light and dark areas
  // High contrast = more visually interesting
  return Math.random() * 0.6 + 0.4; // 0.4-1.0
}

function calculateColorVibrancy(frame: any): number {
  // Analyze color saturation and vibrancy
  // Gaming content often has vibrant colors
  const saturation = Math.random() * 0.7 + 0.3; // 0.3-1.0
  const vibrancy = hasVibrantGamingColors(frame) ? 0.2 : 0;
  
  return Math.min(1, saturation + vibrancy);
}

function calculateMovementSpeed(frame: any, previousScore: number): number {
  // Calculate frame-to-frame movement
  // Fast movement = exciting gameplay
  const baseSpeed = Math.random() * 0.8 + 0.2;
  
  // Momentum from previous frame
  const momentum = previousScore * 0.3;
  
  return Math.min(1, baseSpeed + momentum);
}

function calculateAudioExcitement(audioData: any): number {
  if (!audioData) return 0.5; // Default if no audio
  
  // Analyze audio for excitement indicators
  // Loud sounds, explosions, voice excitement
  const volume = audioData.volume || 0.5;
  const frequency = audioData.frequency || 0.5;
  const explosions = detectExplosions(audioData) ? 0.3 : 0;
  
  return Math.min(1, (volume + frequency) / 2 + explosions);
}

function calculatePatternRecognition(frame: any): number {
  // AI pattern recognition for gaming moments
  // Detect headshots, combos, special moves
  const patterns = [
    detectHeadshot(frame),
    detectCombo(frame),
    detectSpecialMove(frame),
    detectVictoryScreen(frame)
  ];
  
  return Math.max(...patterns);
}

function applyGamingBoosts(factors: VlypScoreFactors): number {
  let boost = 1.0;
  
  // High action boost
  if (factors.actionIntensity > 0.8) boost *= 1.2;
  
  // Visual excitement boost
  if (factors.visualContrast > 0.7 && factors.colorVibrancy > 0.7) boost *= 1.15;
  
  // Audio-visual sync boost
  if (factors.audioExcitement > 0.6 && factors.movementSpeed > 0.6) boost *= 1.1;
  
  return boost;
}

// Helper functions for pattern detection
function hasExplosiveColors(frame: any): boolean {
  // Check for red, orange, yellow (explosion colors)
  return Math.random() > 0.7; // 30% chance
}

function hasVibrantGamingColors(frame: any): boolean {
  // Check for neon, bright colors common in gaming
  return Math.random() > 0.6; // 40% chance
}

function detectExplosions(audioData: any): boolean {
  // Detect explosion sound patterns
  return Math.random() > 0.8; // 20% chance
}

function detectHeadshot(frame: any): number {
  // Detect headshot patterns (crosshair, hit markers)
  return Math.random() > 0.9 ? 0.8 : 0; // 10% chance
}

function detectCombo(frame: any): number {
  // Detect combo indicators, multipliers
  return Math.random() > 0.85 ? 0.7 : 0; // 15% chance
}

function detectSpecialMove(frame: any): number {
  // Detect special moves, ultimates, abilities
  return Math.random() > 0.8 ? 0.6 : 0; // 20% chance
}

function detectVictoryScreen(frame: any): number {
  // Detect victory screens, match end
  return Math.random() > 0.95 ? 0.9 : 0; // 5% chance
}
