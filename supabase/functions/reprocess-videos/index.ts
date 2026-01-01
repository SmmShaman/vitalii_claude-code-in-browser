/**
 * Reprocess Videos Edge Function
 *
 * Re-downloads videos from Telegram and uploads to YouTube
 * for existing news/blog_posts that have video_type = 'telegram_embed'
 *
 * Modes:
 * 1. Manual: POST with { "limit": 10, "offset": 0 }
 * 2. Autonomous: POST with { "autonomous": true } - reads state from DB, auto-advances
 *
 * Usage:
 * POST /functions/v1/reprocess-videos
 * Body: { "limit": 10, "offset": 0, "type": "news" | "blog", "autonomous": true }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createMTKrutoClient,
  disconnectMTKrutoClient,
  downloadVideoWithClient,
  uploadVideoToYouTube,
  getYouTubeConfig,
  getYouTubeAccessToken,
  MTKrutoClient,
  YOUTUBE_HELPERS_VERSION
} from "../_shared/youtube-helpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReprocessRequest {
  limit?: number;      // How many to process (default: 5)
  offset?: number;     // Skip first N records (default: 0)
  type?: 'news' | 'blog' | 'all';  // Which table to process (default: 'news')
  dryRun?: boolean;    // Just show what would be processed (default: false)
  newsId?: string;     // Process specific news ID
  autonomous?: boolean; // Auto mode - reads state from DB, auto-advances
}

interface ProcessResult {
  id: string;
  title: string;
  oldVideoUrl: string;
  newVideoUrl?: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
}

interface ReprocessState {
  id: number;
  current_offset: number;
  last_run_at: string | null;
  total_processed: number;
  total_success: number;
  total_failed: number;
  is_complete: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('🔄 Reprocess Videos function started');
  console.log(`📦 Using youtube-helpers ${YOUTUBE_HELPERS_VERSION}`);

  // Create SHARED MTKruto client ONCE for all videos (avoids FLOOD_WAIT)
  let sharedMTKrutoClient: MTKrutoClient | null = null;

  try {
    console.log('🔌 Creating shared MTKruto client...');
    sharedMTKrutoClient = await createMTKrutoClient();
    if (sharedMTKrutoClient) {
      console.log('✅ Shared MTKruto client ready - will reuse for all videos');
    } else {
      console.warn('⚠️ Failed to create MTKruto client - video downloads will fail');
    }
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request
    const body: ReprocessRequest = await req.json().catch(() => ({}));
    const autonomous = body.autonomous || false;
    let limit = Math.min(body.limit || 5, 20); // Max 20 per request (YouTube limits)
    let offset = body.offset || 0;
    const type = body.type || 'news';
    const dryRun = body.dryRun || false;
    const specificNewsId = body.newsId;

    // In autonomous mode, read state from DB
    let currentState: ReprocessState | null = null;
    if (autonomous) {
      console.log('🤖 Running in AUTONOMOUS mode');

      const { data: stateData, error: stateError } = await supabase
        .from('video_reprocess_state')
        .select('*')
        .eq('id', 1)
        .single();

      if (stateError) {
        console.log('⚠️ No state table found, creating initial state...');
        // Create initial state if table exists but no row
        await supabase
          .from('video_reprocess_state')
          .upsert({ id: 1, current_offset: 0, total_processed: 0, total_success: 0, total_failed: 0, is_complete: false });
        currentState = { id: 1, current_offset: 0, last_run_at: null, total_processed: 0, total_success: 0, total_failed: 0, is_complete: false };
      } else {
        currentState = stateData as ReprocessState;
      }

      // Check if already complete
      if (currentState?.is_complete) {
        console.log('✅ Video reprocessing already COMPLETE!');
        return new Response(
          JSON.stringify({
            success: true,
            message: 'All videos have been reprocessed!',
            state: currentState
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Use state offset
      offset = currentState?.current_offset || 0;
      limit = 5; // Smaller batches in autonomous mode for reliability
      console.log(`📍 Autonomous state: offset=${offset}, processed=${currentState?.total_processed}`);
    }

    console.log(`📋 Config: limit=${limit}, offset=${offset}, type=${type}, dryRun=${dryRun}, autonomous=${autonomous}`);

    const results: ProcessResult[] = [];
    let totalPending = 0;

    // Process news table
    if (type === 'news' || type === 'all') {
      let query = supabase
        .from('news')
        .select('id, original_title, title_en, video_url, video_type')
        .eq('video_type', 'telegram_embed')
        .not('video_url', 'is', null);

      if (specificNewsId) {
        query = query.eq('id', specificNewsId);
      }

      const { data: newsItems, error: newsError, count } = await query
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (newsError) {
        console.error('Error fetching news:', newsError);
        throw newsError;
      }

      // Get total count
      const { count: totalCount } = await supabase
        .from('news')
        .select('id', { count: 'exact', head: true })
        .eq('video_type', 'telegram_embed')
        .not('video_url', 'is', null);

      totalPending = totalCount || 0;

      console.log(`📰 Found ${newsItems?.length || 0} news items to process (${totalPending} total pending)`);

      if (newsItems && newsItems.length > 0) {
        for (const news of newsItems) {
          const title = news.title_en || news.original_title || 'Untitled';
          console.log(`\n🎬 Processing: ${title.substring(0, 50)}...`);

          if (dryRun) {
            results.push({
              id: news.id,
              title: title,
              oldVideoUrl: news.video_url,
              status: 'skipped',
              error: 'Dry run - no changes made'
            });
            continue;
          }

          try {
            // Extract Telegram info from video_url
            // Format: https://t.me/channelname/12345?embed=1
            const telegramMatch = news.video_url.match(/t\.me\/([^\/]+)\/(\d+)/);

            if (!telegramMatch) {
              console.log(`⚠️ Cannot parse Telegram URL: ${news.video_url}`);
              results.push({
                id: news.id,
                title: title,
                oldVideoUrl: news.video_url,
                status: 'failed',
                error: 'Cannot parse Telegram URL format'
              });
              continue;
            }

            const channelUsername = telegramMatch[1];
            const messageId = parseInt(telegramMatch[2]);

            console.log(`📱 Telegram channel: @${channelUsername}, message: ${messageId}`);

            // Download video from Telegram using SHARED MTKruto client (avoids FLOOD_WAIT)
            let videoBuffer: Uint8Array | null = null;
            let downloadError: string | null = null;

            if (sharedMTKrutoClient) {
              console.log('🔄 Using shared MTKruto client (single auth)');
              try {
                videoBuffer = await downloadVideoWithClient(sharedMTKrutoClient, channelUsername, messageId);
              } catch (dlError: any) {
                downloadError = dlError?.message || 'Unknown download error';
                console.error('❌ Download exception:', downloadError);
              }
            } else {
              downloadError = 'No shared MTKruto client available (client creation failed)';
              console.log('❌ No shared MTKruto client available');
            }

            if (!videoBuffer) {
              const errorMsg = downloadError || 'Failed to download video from Telegram (null buffer)';
              console.log(`❌ ${errorMsg}`);
              results.push({
                id: news.id,
                title: title,
                oldVideoUrl: news.video_url,
                status: 'failed',
                error: errorMsg
              });
              continue;
            }

            console.log(`✅ Video downloaded, size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);

            // Get YouTube config and access token
            const youtubeConfig = getYouTubeConfig();
            if (!youtubeConfig) {
              throw new Error('YouTube configuration missing');
            }

            console.log('🔑 Getting YouTube access token...');
            const accessToken = await getYouTubeAccessToken(youtubeConfig);

            // Upload to YouTube
            const uploadResult = await uploadVideoToYouTube(accessToken, {
              videoBuffer: videoBuffer,
              title: title.substring(0, 100), // YouTube title limit
              description: `News article: ${title}\n\nSource: https://vitalii.no/news/${news.id}`,
              tags: ['news', 'technology'],
              categoryId: '25' // News & Politics
            });

            if (uploadResult.success && uploadResult.embedUrl) {
              console.log(`🎉 YouTube upload successful: ${uploadResult.embedUrl}`);

              // Update database
              const { error: updateError } = await supabase
                .from('news')
                .update({
                  video_url: uploadResult.embedUrl,
                  video_type: 'youtube'
                })
                .eq('id', news.id);

              if (updateError) {
                console.error('Failed to update database:', updateError);
                results.push({
                  id: news.id,
                  title: title,
                  oldVideoUrl: news.video_url,
                  newVideoUrl: uploadResult.embedUrl,
                  status: 'failed',
                  error: 'YouTube uploaded but database update failed'
                });
              } else {
                // Also update any blog_posts that reference this news
                const { error: blogUpdateError } = await supabase
                  .from('blog_posts')
                  .update({
                    video_url: uploadResult.embedUrl,
                    video_type: 'youtube'
                  })
                  .eq('source_news_id', news.id);

                if (blogUpdateError) {
                  console.log('Note: Could not update related blog posts:', blogUpdateError.message);
                } else {
                  console.log('✅ Also updated related blog_posts');
                }

                results.push({
                  id: news.id,
                  title: title,
                  oldVideoUrl: news.video_url,
                  newVideoUrl: uploadResult.embedUrl,
                  status: 'success'
                });
              }
            } else {
              console.log(`❌ YouTube upload failed: ${uploadResult.error}`);
              results.push({
                id: news.id,
                title: title,
                oldVideoUrl: news.video_url,
                status: 'failed',
                error: uploadResult.error || 'YouTube upload failed'
              });
            }

          } catch (error) {
            console.error(`Error processing ${news.id}:`, error);
            results.push({
              id: news.id,
              title: title,
              oldVideoUrl: news.video_url,
              status: 'failed',
              error: error.message || 'Unknown error'
            });
          }
        }
      }
    }

    // Process blog_posts table
    if (type === 'blog' || type === 'all') {
      const { data: blogItems, error: blogError } = await supabase
        .from('blog_posts')
        .select('id, title_en, video_url, video_type')
        .eq('video_type', 'telegram_embed')
        .not('video_url', 'is', null)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (blogError) {
        console.error('Error fetching blog posts:', blogError);
      }

      // Get total blog count
      const { count: blogTotalCount } = await supabase
        .from('blog_posts')
        .select('id', { count: 'exact', head: true })
        .eq('video_type', 'telegram_embed')
        .not('video_url', 'is', null);

      console.log(`📝 Found ${blogItems?.length || 0} blog posts to process (${blogTotalCount || 0} total pending)`);

      // Similar processing logic for blog posts...
      // (Blog posts get their video from source news, so updating news should be enough)
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const remaining = Math.max(0, totalPending - offset - limit);

    console.log(`\n📊 Summary: ${successCount} success, ${failedCount} failed, ${remaining} remaining`);

    // Update state in autonomous mode
    if (autonomous && !dryRun) {
      const isComplete = remaining === 0;

      const { error: updateStateError } = await supabase
        .from('video_reprocess_state')
        .update({
          current_offset: offset + results.length,
          last_run_at: new Date().toISOString(),
          total_processed: (currentState?.total_processed || 0) + results.length,
          total_success: (currentState?.total_success || 0) + successCount,
          total_failed: (currentState?.total_failed || 0) + failedCount,
          is_complete: isComplete,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);

      if (updateStateError) {
        console.error('Failed to update state:', updateStateError);
      } else {
        console.log(`✅ State updated: offset=${offset + results.length}, complete=${isComplete}`);
      }

      if (isComplete) {
        console.log('🎉 ALL VIDEOS REPROCESSED! Job complete.');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        successCount,
        failedCount,
        totalPending,
        remaining,
        nextOffset: offset + limit,
        autonomous,
        mtkrutoClientReady: !!sharedMTKrutoClient,
        state: autonomous ? {
          current_offset: offset + results.length,
          total_processed: (currentState?.total_processed || 0) + results.length,
          total_success: (currentState?.total_success || 0) + successCount,
          total_failed: (currentState?.total_failed || 0) + failedCount,
          is_complete: remaining === 0
        } : undefined,
        results,
        message: dryRun
          ? `Dry run complete. Would process ${results.length} items.`
          : `Processed ${results.length} items. ${successCount} successful, ${failedCount} failed.`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Reprocess Videos error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  } finally {
    // Disconnect shared MTKruto client after all processing
    if (sharedMTKrutoClient) {
      console.log('🔌 Disconnecting shared MTKruto client...');
      await disconnectMTKrutoClient(sharedMTKrutoClient);
    }
  }
});
