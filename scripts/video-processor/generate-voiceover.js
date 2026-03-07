/**
 * TTS Voiceover Generator
 *
 * Sends the AI-generated script to a Text-to-Speech service
 * and returns both the audio file AND word-level timestamps.
 *
 * Supports two backends:
 *  1. OpenAI TTS (default) — simple, high quality
 *  2. Azure TTS — if you need word-level timestamps (SSML + viseme)
 *
 * This runs inside the GitHub Actions video-processor pipeline.
 */
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * @typedef {Object} SubtitleEntry
 * @property {string} text - The word or phrase
 * @property {number} startTime - Start time in seconds
 * @property {number} endTime - End time in seconds
 */

/**
 * @typedef {Object} VoiceoverResult
 * @property {string} audioPath - Path to the generated audio file
 * @property {SubtitleEntry[]} subtitles - Word-level timestamps
 * @property {number} durationSeconds - Total audio duration in seconds
 */

/**
 * Generate voiceover audio and word timestamps from a script.
 *
 * Uses OpenAI TTS API to generate the audio.
 * Since OpenAI TTS doesn't provide word timestamps natively, we
 * estimate them based on word count and total duration.
 *
 * @param {string} scriptText - The voiceover script text
 * @param {string} language - Language code: 'en', 'no', 'ua'
 * @returns {Promise<VoiceoverResult>}
 */
export async function generateVoiceover(scriptText, language = 'en') {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY or AZURE_OPENAI_API_KEY');
  }

  console.log(`🎙️ Generating voiceover (${language})...`);
  console.log(`   Script length: ${scriptText.length} chars, ${scriptText.split(/\s+/).length} words`);

  // Pick voice based on language
  const voices = {
    en: 'onyx',    // Deep, professional male voice
    no: 'nova',    // Clear female voice (good for European languages)
    ua: 'nova',    // Same
  };
  const voice = voices[language] || 'onyx';

  // ── Step 1: Generate audio via OpenAI TTS ──
  const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1-hd',
      input: scriptText,
      voice,
      response_format: 'mp3',
      speed: 1.0,
    }),
  });

  if (!ttsResponse.ok) {
    const err = await ttsResponse.text();
    throw new Error(`OpenAI TTS error: ${ttsResponse.status} ${err}`);
  }

  // Save audio to temp file
  const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
  const audioPath = path.join(os.tmpdir(), `voiceover_${Date.now()}.mp3`);
  await fs.writeFile(audioPath, audioBuffer);

  const fileSizeMB = (audioBuffer.length / 1024 / 1024).toFixed(2);
  console.log(`✅ Audio generated: ${fileSizeMB} MB → ${audioPath}`);

  // ── Step 2: Estimate audio duration ──
  // MP3 at 48kbps (tts-1-hd typical) ≈ 6KB per second
  // More accurate: count bytes / bitrate
  const estimatedDuration = audioBuffer.length / 6000; // rough estimate
  // Better: use the word count approach (~2.5 words/sec for natural speech)
  const words = scriptText.split(/\s+/).filter(w => w.length > 0);
  const durationSeconds = Math.max(estimatedDuration, words.length / 2.5);

  console.log(`⏱️ Estimated duration: ${durationSeconds.toFixed(1)}s`);

  // ── Step 3: Generate word-level timestamps (estimated) ──
  // Since OpenAI TTS doesn't return timestamps, we distribute
  // words evenly across the duration with natural pausing
  const subtitles = generateEstimatedTimestamps(words, durationSeconds);

  console.log(`📝 Generated ${subtitles.length} subtitle entries`);

  return {
    audioPath,
    subtitles,
    durationSeconds,
  };
}

/**
 * Distribute words across the audio duration, adding natural pauses
 * after punctuation marks (periods, commas, exclamation marks).
 *
 * @param {string[]} words
 * @param {number} totalDuration
 * @returns {SubtitleEntry[]}
 */
function generateEstimatedTimestamps(words, totalDuration) {
  if (words.length === 0) return [];

  const subtitles = [];

  // Assign weights: words after punctuation get a pause bonus
  const weights = words.map((word, i) => {
    let weight = 1.0;
    // Longer words take slightly more time
    if (word.length > 8) weight += 0.3;
    // Add pause after sentence-enders
    if (i > 0) {
      const prev = words[i - 1];
      if (prev.match(/[.!?]$/)) weight += 0.8;  // sentence pause
      else if (prev.match(/[,;:]$/)) weight += 0.3;  // clause pause
    }
    return weight;
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let currentTime = 0.1; // small initial offset

  for (let i = 0; i < words.length; i++) {
    const wordDuration = (weights[i] / totalWeight) * (totalDuration - 0.2);
    const startTime = currentTime;
    const endTime = currentTime + wordDuration;

    subtitles.push({
      text: words[i].replace(/[.,!?;:"""''()—–\-]/g, ''), // clean punctuation for display
      startTime: Math.round(startTime * 100) / 100,
      endTime: Math.round(endTime * 100) / 100,
    });

    currentTime = endTime;
  }

  return subtitles;
}
