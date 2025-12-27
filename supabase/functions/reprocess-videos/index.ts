/**
 * Reprocess Videos Edge Function
 *
 * Re-downloads videos from Telegram and uploads to YouTube
 * for existing news/blog_posts that have video_type = 'telegram_embed'
 *
 * Usage:
 * POST /functions/v1/reprocess-videos
 * Body: { "limit": 10, "offset": 0, "type": "news" | "blog" }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  downloadTelegramVideoMTKruto,
  uploadVideoToYouTube,
  getYouTubeConfig
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
}

interface ProcessResult {
  id: string;
  title: string;
  oldVideoUrl: string;
  newVideoUrl?: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('🔄 Reprocess Videos function started');

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request
    const body: ReprocessRequest = await req.json().catch(() => ({}));
    const limit = Math.min(body.limit || 5, 20); // Max 20 per request (YouTube limits)
    const offset = body.offset || 0;
    const type = body.type || 'news';
    const dryRun = body.dryRun || false;
    const specificNewsId = body.newsId;

    console.log(`📋 Config: limit=${limit}, offset=${offset}, type=${type}, dryRun=${dryRun}`);

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

            // Download video from Telegram using MTKruto
            const videoPath = await downloadTelegramVideoMTKruto(channelUsername, messageId);

            if (!videoPath) {
              console.log(`❌ Failed to download video from Telegram`);
              results.push({
                id: news.id,
                title: title,
                oldVideoUrl: news.video_url,
                status: 'failed',
                error: 'Failed to download video from Telegram'
              });
              continue;
            }

            console.log(`✅ Video downloaded to: ${videoPath}`);

            // Read the video file
            const videoBuffer = await Deno.readFile(videoPath);
            console.log(`📦 Video size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);

            // Upload to YouTube
            const youtubeConfig = getYouTubeConfig();
            if (!youtubeConfig) {
              throw new Error('YouTube configuration missing');
            }

            const uploadResult = await uploadVideoToYouTube({
              videoBuffer: videoBuffer,
              title: title.substring(0, 100), // YouTube title limit
              description: `News article: ${title}\n\nSource: https://vitalii.no/news/${news.id}`,
              tags: ['news', 'technology'],
              categoryId: '25' // News & Politics
            });

            // Clean up temp file
            try {
              await Deno.remove(videoPath);
            } catch (e) {
              console.log('Could not remove temp file:', e);
            }

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

    console.log(`\n📊 Summary: ${successCount} success, ${failedCount} failed, ${totalPending - limit} remaining`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        successCount,
        failedCount,
        totalPending,
        remaining: Math.max(0, totalPending - offset - limit),
        nextOffset: offset + limit,
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
  }
});
