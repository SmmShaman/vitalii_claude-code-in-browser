/**
 * Avatar Video Generator — fal.ai EchoMimicV3
 *
 * Generates talking-head avatar video clips for daily news show.
 * Each clip: source photo + audio → MP4 with lip-sync + upper body gestures.
 *
 * Flow: Upload audio to Supabase Storage → fal.ai queue API → poll → download MP4
 *
 * Toggle: ENABLE_AVATAR=true to activate
 * Env: FAL_KEY, AVATAR_SOURCE_PHOTO_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createClient } from '@supabase/supabase-js';

// ── Config ──

const FAL_KEY = process.env.FAL_KEY || '';
const FAL_BASE_URL = 'https://queue.fal.run/fal-ai/echomimic-v3';
const ENABLE_AVATAR = process.env.ENABLE_AVATAR === 'true';
const AVATAR_SOURCE_PHOTO_URL = process.env.AVATAR_SOURCE_PHOTO_URL || '';

// Supabase for temporary audio upload (fal.ai needs public URLs)
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const STORAGE_BUCKET = 'avatar-temp';

// Timeouts
const PER_CLIP_TIMEOUT_MS = 300_000;  // 5 min per clip (EchoMimicV3 can be slow)
const TOTAL_TIMEOUT_MS = 900_000;     // 15 min total
const POLL_INTERVAL_MS = 8_000;       // 8s between status checks

// ── Supabase Storage Helpers ──

let _supabase = null;

function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabase;
}

/**
 * Ensure the avatar-temp storage bucket exists (public, 1h expiry)
 */
async function ensureBucket() {
  const supabase = getSupabase();
  const { data } = await supabase.storage.getBucket(STORAGE_BUCKET);
  if (!data) {
    await supabase.storage.createBucket(STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: 52428800, // 50MB
    });
    console.log(`  📦 Created storage bucket: ${STORAGE_BUCKET}`);
  }
}

/**
 * Upload local audio file to Supabase Storage and return public URL
 * @param {string} audioPath - Local path to MP3
 * @param {string} label - Unique label for filename
 * @returns {{ publicUrl: string, storagePath: string }}
 */
async function uploadAudioToStorage(audioPath, label) {
  const supabase = getSupabase();
  const buffer = await fs.readFile(audioPath);
  const storagePath = `${label}_${Date.now()}.mp3`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return { publicUrl: data.publicUrl, storagePath };
}

/**
 * Delete temp audio from Supabase Storage
 * @param {string} storagePath
 */
async function deleteFromStorage(storagePath) {
  try {
    const supabase = getSupabase();
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
  } catch (e) {
    console.log(`  ⚠️ Storage cleanup failed: ${e.message}`);
  }
}

// ── fal.ai API Helpers ──

/**
 * Submit avatar generation job to fal.ai queue
 * @param {{ imageUrl: string, audioUrl: string }} opts
 * @returns {string} request_id
 */
async function submitToFal({ imageUrl, audioUrl }) {
  const response = await fetch(FAL_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: imageUrl,
      audio_url: audioUrl,
      video_size: '512x512',
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`fal.ai submit error ${response.status}: ${text}`);
  }

  const data = await response.json();
  if (!data.request_id) {
    throw new Error(`No request_id in response: ${JSON.stringify(data)}`);
  }
  return data.request_id;
}

/**
 * Poll fal.ai queue for job completion
 * @param {string} requestId
 * @param {number} timeoutMs
 * @returns {string} Video URL
 */
async function pollFalStatus(requestId, timeoutMs = PER_CLIP_TIMEOUT_MS) {
  const statusUrl = `${FAL_BASE_URL}/requests/${requestId}/status`;
  const resultUrl = `${FAL_BASE_URL}/requests/${requestId}`;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const statusRes = await fetch(statusUrl, {
      headers: { 'Authorization': `Key ${FAL_KEY}` },
    });

    if (!statusRes.ok) {
      const text = await statusRes.text().catch(() => '');
      throw new Error(`fal.ai status error ${statusRes.status}: ${text}`);
    }

    const status = await statusRes.json();

    if (status.status === 'COMPLETED') {
      // Fetch full result
      const resultRes = await fetch(resultUrl, {
        headers: { 'Authorization': `Key ${FAL_KEY}` },
      });
      if (!resultRes.ok) {
        throw new Error(`fal.ai result error ${resultRes.status}`);
      }
      const result = await resultRes.json();
      const videoUrl = result?.video?.url;
      if (!videoUrl) {
        throw new Error(`No video URL in result: ${JSON.stringify(result).slice(0, 200)}`);
      }
      return videoUrl;
    }

    if (status.status === 'FAILED') {
      throw new Error(`fal.ai job failed: ${status.error || 'unknown'}`);
    }

    // IN_QUEUE or IN_PROGRESS — wait and retry
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error(`fal.ai timed out after ${timeoutMs / 1000}s`);
}

/**
 * Download video from URL to local file
 * @param {string} url
 * @param {string} outputPath
 * @returns {number} File size in bytes
 */
async function downloadVideo(url, outputPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(outputPath, buffer);
  return buffer.length;
}

// ── Public API ──

/**
 * Generate a single avatar video clip via fal.ai EchoMimicV3
 *
 * @param {string} audioPath - Local path to segment MP3 audio
 * @param {string} segmentLabel - Label for logging (e.g. "intro", "seg0")
 * @returns {{ videoPath: string, durationSeconds: number } | null}
 */
export async function generateAvatarClip(audioPath, segmentLabel = 'clip') {
  if (!ENABLE_AVATAR) return null;
  if (!FAL_KEY) {
    console.log(`  ⚠️ Avatar [${segmentLabel}]: FAL_KEY not set, skipping`);
    return null;
  }
  if (!AVATAR_SOURCE_PHOTO_URL) {
    console.log(`  ⚠️ Avatar [${segmentLabel}]: AVATAR_SOURCE_PHOTO_URL not set, skipping`);
    return null;
  }

  let storagePath = null;
  try {
    // Upload audio to Supabase Storage (fal.ai needs public URL)
    console.log(`  🧑 Avatar [${segmentLabel}]: uploading audio to storage...`);
    await ensureBucket();
    const upload = await uploadAudioToStorage(audioPath, segmentLabel);
    storagePath = upload.storagePath;

    // Submit to fal.ai
    console.log(`  🧑 Avatar [${segmentLabel}]: submitting to fal.ai EchoMimicV3...`);
    const requestId = await submitToFal({
      imageUrl: AVATAR_SOURCE_PHOTO_URL,
      audioUrl: upload.publicUrl,
    });

    // Poll for completion
    console.log(`  🧑 Avatar [${segmentLabel}]: polling (id: ${requestId})...`);
    const videoUrl = await pollFalStatus(requestId);

    // Download MP4
    const outputPath = path.join(os.tmpdir(), `avatar_${segmentLabel}_${Date.now()}.mp4`);
    const fileSize = await downloadVideo(videoUrl, outputPath);

    // Validate file
    if (fileSize < 10_000) {
      console.log(`  ⚠️ Avatar [${segmentLabel}]: file too small (${fileSize}B), skipping`);
      await fs.unlink(outputPath).catch(() => {});
      return null;
    }
    if (fileSize > 50_000_000) {
      console.log(`  ⚠️ Avatar [${segmentLabel}]: file too large (${(fileSize / 1024 / 1024).toFixed(1)}MB), skipping`);
      await fs.unlink(outputPath).catch(() => {});
      return null;
    }

    console.log(`  ✅ Avatar [${segmentLabel}]: ${(fileSize / 1024).toFixed(0)}KB`);
    return { videoPath: outputPath, durationSeconds: 0 };
  } catch (error) {
    console.log(`  ⚠️ Avatar [${segmentLabel}] failed: ${error.message}`);
    return null;
  } finally {
    // Clean up temp audio from storage
    if (storagePath) await deleteFromStorage(storagePath);
  }
}

/**
 * Generate avatar clips for all segments of a daily news show.
 * Respects TOTAL_TIMEOUT_MS — if exceeded, remaining segments get null.
 *
 * @param {object} opts
 * @param {string|null} opts.introAudioPath - Path to intro MP3
 * @param {string|null} opts.outroAudioPath - Path to outro MP3
 * @param {{ audioPath: string }[]} opts.segmentAudios - Per-segment audio paths
 * @param {string} opts.publicDir - Remotion public/ dir to copy files to
 * @returns {{
 *   introAvatarSrc: string | null,
 *   outroAvatarSrc: string | null,
 *   segmentAvatarSrcs: (string | null)[]
 * }}
 */
export async function generateAllAvatarClips({ introAudioPath, outroAudioPath, segmentAudios, publicDir }) {
  if (!ENABLE_AVATAR) {
    console.log('🧑 Avatar generation disabled (ENABLE_AVATAR !== true)');
    return {
      introAvatarSrc: null,
      outroAvatarSrc: null,
      segmentAvatarSrcs: segmentAudios.map(() => null),
    };
  }

  console.log(`\n🧑 Generating avatar clips via fal.ai EchoMimicV3 (${segmentAudios.length} segments + intro/outro)...`);
  const totalStart = Date.now();

  const result = {
    introAvatarSrc: null,
    outroAvatarSrc: null,
    segmentAvatarSrcs: [],
  };

  /**
   * Helper: generate clip and copy to public dir if successful
   * @returns {string|null} Filename in public dir, or null
   */
  async function generateAndCopy(audioPath, label) {
    if (!audioPath) return null;
    if (Date.now() - totalStart > TOTAL_TIMEOUT_MS) {
      console.log(`  ⏰ Avatar total timeout reached, skipping ${label}`);
      return null;
    }

    const clip = await generateAvatarClip(audioPath, label);
    if (!clip) return null;

    // Copy to Remotion public dir
    const filename = `avatar_${label}_${Date.now()}.mp4`;
    await fs.copyFile(clip.videoPath, path.join(publicDir, filename));
    await fs.unlink(clip.videoPath).catch(() => {});

    return filename;
  }

  // Generate intro avatar
  result.introAvatarSrc = await generateAndCopy(introAudioPath, 'intro');

  // Generate per-segment avatars
  for (let i = 0; i < segmentAudios.length; i++) {
    const src = await generateAndCopy(segmentAudios[i]?.audioPath, `seg${i}`);
    result.segmentAvatarSrcs.push(src);
  }

  // Generate outro avatar
  result.outroAvatarSrc = await generateAndCopy(outroAudioPath, 'outro');

  const elapsed = ((Date.now() - totalStart) / 1000).toFixed(1);
  const generated = [result.introAvatarSrc, result.outroAvatarSrc, ...result.segmentAvatarSrcs].filter(Boolean).length;
  const total = 2 + segmentAudios.length;
  console.log(`🧑 Avatar generation complete: ${generated}/${total} clips in ${elapsed}s`);

  return result;
}
