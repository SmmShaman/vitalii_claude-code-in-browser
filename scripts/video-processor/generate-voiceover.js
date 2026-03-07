/**
 * TTS Voiceover Generator
 *
 * Uses Zvukogram neural TTS API to generate voiceover audio
 * with word-level timestamps for Remotion subtitle animation.
 *
 * API docs: https://zvukogram.com/node/api/
 * Endpoint /subs returns audio + timecoded subtitle fragments.
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
 * @param {string} scriptText - The voiceover script text
 * @param {string} language - Language code: 'en', 'no', 'ua'
 * @returns {Promise<VoiceoverResult>}
 */
export async function generateVoiceover(scriptText, language = 'en') {
  const ZVUKOGRAM_TOKEN = process.env.ZVUKOGRAM_TOKEN;
  const ZVUKOGRAM_EMAIL = process.env.ZVUKOGRAM_EMAIL;

  if (!ZVUKOGRAM_TOKEN || !ZVUKOGRAM_EMAIL) {
    throw new Error('Missing ZVUKOGRAM_TOKEN or ZVUKOGRAM_EMAIL');
  }

  console.log(`🎙️ Generating voiceover (${language})...`);
  console.log(`   Script length: ${scriptText.length} chars, ${scriptText.split(/\s+/).length} words`);

  // Pick voice based on language
  const voices = {
    en: 'Brian US HD',
    no: 'Andrew HD US',
    ua: 'Andrew HD US',
  };
  const voice = voices[language] || 'Brian US HD';

  // ── Step 1: Submit text to /subs endpoint ──
  const BASE = 'https://zvukogram.com/index.php?r=api';

  console.log(`🔊 Using voice: ${voice}`);
  const createResponse = await fetch(`${BASE}/subs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      token: ZVUKOGRAM_TOKEN,
      email: ZVUKOGRAM_EMAIL,
      voice,
      text: scriptText,
      format: 'mp3',
      speed: '1',
    }).toString(),
  });

  if (!createResponse.ok) {
    const err = await createResponse.text();
    throw new Error(`Zvukogram API error: ${createResponse.status} ${err}`);
  }

  const createData = await createResponse.json();
  console.log(`📋 Task created: id=${createData.id}, status=${createData.status}`);

  if (createData.status === -1) {
    throw new Error(`Zvukogram error: ${createData.error || JSON.stringify(createData)}`);
  }

  // ── Step 2: Poll for result if status=0 ──
  let result = createData;

  if (result.status === 0) {
    console.log(`⏳ Processing (${result.parts || '?'} parts)...`);
    const maxAttempts = 120; // 4 minutes max
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 2000));

      const pollResponse = await fetch(`${BASE}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: ZVUKOGRAM_TOKEN,
          email: ZVUKOGRAM_EMAIL,
          id: String(createData.id),
        }).toString(),
      });

      result = await pollResponse.json();

      if (result.status === 1) {
        console.log(`✅ Processing complete`);
        break;
      }
      if (result.status === -1) {
        throw new Error(`Zvukogram processing error: ${result.error || JSON.stringify(result)}`);
      }

      if (i % 5 === 0) {
        console.log(`   ... waiting (${result.parts_done || 0}/${result.parts || '?'} parts)`);
      }
    }

    if (result.status !== 1) {
      throw new Error('Zvukogram processing timeout');
    }
  }

  // ── Step 3: Download audio file ──
  const fileUrl = result.file_cors || result.file;
  if (!fileUrl) {
    throw new Error(`Zvukogram: no file URL in response: ${JSON.stringify(result)}`);
  }

  console.log(`📥 Downloading audio from: ${fileUrl}`);
  const audioResponse = await fetch(fileUrl);
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio: ${audioResponse.status}`);
  }

  const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
  const audioPath = path.join(os.tmpdir(), `voiceover_${Date.now()}.mp3`);
  await fs.writeFile(audioPath, audioBuffer);

  const fileSizeMB = (audioBuffer.length / 1024 / 1024).toFixed(2);
  const durationSeconds = result.duration || audioBuffer.length / 6000;
  console.log(`✅ Audio: ${fileSizeMB} MB, ${durationSeconds}s → ${audioPath}`);
  console.log(`💰 Cost: ${result.cost || '?'} tokens, balance: ${result.balans || '?'}`);

  // ── Step 4: Parse subtitle timestamps from cuts ──
  const subtitles = parseZvukogramCuts(result.cuts, scriptText, durationSeconds);
  console.log(`📝 Generated ${subtitles.length} subtitle entries`);

  return {
    audioPath,
    subtitles,
    durationSeconds,
  };
}

/**
 * Parse Zvukogram /subs `cuts` array into SubtitleEntry format.
 * Each cut has: { file, duration, text, start, end }
 *
 * If cuts are not available, fall back to estimated timestamps.
 *
 * @param {Array|undefined} cuts - Zvukogram cuts array
 * @param {string} scriptText - Original script text
 * @param {number} totalDuration - Total audio duration
 * @returns {SubtitleEntry[]}
 */
function parseZvukogramCuts(cuts, scriptText, totalDuration) {
  if (cuts && Array.isArray(cuts) && cuts.length > 0) {
    const subtitles = [];
    let timeOffset = 0;

    for (const cut of cuts) {
      const cutStart = timeOffset;
      const cutEnd = timeOffset + (cut.duration || 0);
      const cutText = cut.text || '';

      // Split cut text into words and distribute time evenly within the cut
      const words = cutText.split(/\s+/).filter(w => w.length > 0);
      if (words.length === 0) {
        timeOffset = cutEnd;
        continue;
      }

      const wordDuration = (cut.duration || 1) / words.length;
      for (let i = 0; i < words.length; i++) {
        subtitles.push({
          text: words[i].replace(/[.,!?;:"""''()—–\-]/g, ''),
          startTime: Math.round((cutStart + i * wordDuration) * 100) / 100,
          endTime: Math.round((cutStart + (i + 1) * wordDuration) * 100) / 100,
        });
      }

      timeOffset = cutEnd;
    }

    return subtitles;
  }

  // Fallback: estimate timestamps from word count
  console.log('⚠️ No cuts data, using estimated timestamps');
  const words = scriptText.split(/\s+/).filter(w => w.length > 0);
  return generateEstimatedTimestamps(words, totalDuration);
}

/**
 * Fallback: distribute words evenly across audio duration.
 */
function generateEstimatedTimestamps(words, totalDuration) {
  if (words.length === 0) return [];

  const subtitles = [];
  const weights = words.map((word, i) => {
    let weight = 1.0;
    if (word.length > 8) weight += 0.3;
    if (i > 0) {
      const prev = words[i - 1];
      if (prev.match(/[.!?]$/)) weight += 0.8;
      else if (prev.match(/[,;:]$/)) weight += 0.3;
    }
    return weight;
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let currentTime = 0.1;

  for (let i = 0; i < words.length; i++) {
    const wordDuration = (weights[i] / totalWeight) * (totalDuration - 0.2);
    subtitles.push({
      text: words[i].replace(/[.,!?;:"""''()—–\-]/g, ''),
      startTime: Math.round(currentTime * 100) / 100,
      endTime: Math.round((currentTime + wordDuration) * 100) / 100,
    });
    currentTime += wordDuration;
  }

  return subtitles;
}
