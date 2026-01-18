/**
 * Social Media Helpers
 *
 * Common utilities for cross-platform social media operations
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SOCIAL_MEDIA_HELPERS_VERSION = "2025-01-17-v1";

// ============================================================
// Types
// ============================================================

export type Platform = 'linkedin' | 'facebook' | 'instagram' | 'tiktok';
export type ContentType = 'news' | 'blog';
export type Language = 'en' | 'no' | 'ua';
export type PostStatus = 'pending' | 'posted' | 'failed' | 'scheduled';
export type CommentSentiment = 'positive' | 'negative' | 'neutral' | 'question' | 'spam';

export interface SocialMediaPost {
  id: string;
  content_type: ContentType;
  content_id: string;
  platform: Platform;
  platform_post_id?: string;
  platform_post_url?: string;
  language: Language;
  status: PostStatus;
  error_message?: string;
  post_content?: string;
  media_urls?: string[];
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  engagement_rate?: number;
  posted_at?: string;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ContentData {
  id: string;
  type: ContentType;
  title: string;
  description: string;
  content: string;
  slug: string;
  imageUrl?: string;
  videoUrl?: string;
  videoType?: string;
  tags?: string[];
  sourceLink?: string;
  publishedAt?: string;
}

// ============================================================
// Supabase Client
// ============================================================

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabaseClient;
}

// ============================================================
// Content Fetching
// ============================================================

/**
 * Get content (news or blog) by ID with language-specific fields
 */
export async function getContent(
  contentId: string,
  contentType: ContentType,
  language: Language
): Promise<ContentData | null> {
  const supabase = getSupabaseClient();
  const table = contentType === 'news' ? 'news' : 'blog_posts';

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', contentId)
    .single();

  if (error || !data) {
    console.error(`❌ Failed to get ${contentType}:`, error?.message);
    return null;
  }

  // Get language-specific fields
  const titleKey = `title_${language}` as keyof typeof data;
  const descKey = `description_${language}` as keyof typeof data;
  const contentKey = `content_${language}` as keyof typeof data;
  const slugKey = `slug_${language}` as keyof typeof data;

  return {
    id: data.id,
    type: contentType,
    title: (data[titleKey] as string) || data.title_en || data.original_title || '',
    description: (data[descKey] as string) || data.description_en || '',
    content: (data[contentKey] as string) || data.content_en || data.original_content || '',
    slug: (data[slugKey] as string) || data.slug_en || '',
    imageUrl: data.processed_image_url || data.image_url || data.cover_image_url || null,
    videoUrl: data.video_url,
    videoType: data.video_type,
    tags: data.tags || [],
    sourceLink: data.source_link,
    publishedAt: data.published_at,
  };
}

/**
 * Build article URL for the website
 */
export function buildArticleUrl(contentType: ContentType, slug: string): string {
  const baseUrl = Deno.env.get("SITE_URL") || "https://vitalii.no";
  const path = contentType === 'news' ? 'news' : 'blog';
  return `${baseUrl}/${path}/${slug}`;
}

// ============================================================
// Social Media Posts Management
// ============================================================

/**
 * Create a new social media post record
 */
export async function createSocialPost(data: {
  contentType: ContentType;
  contentId: string;
  platform: Platform;
  language: Language;
  postContent?: string;
  mediaUrls?: string[];
}): Promise<SocialMediaPost | null> {
  const supabase = getSupabaseClient();

  const { data: post, error } = await supabase
    .from('social_media_posts')
    .insert({
      content_type: data.contentType,
      content_id: data.contentId,
      platform: data.platform,
      language: data.language,
      post_content: data.postContent,
      media_urls: data.mediaUrls,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error(`❌ Failed to create social post:`, error.message);
    return null;
  }

  return post;
}

/**
 * Update social media post after successful posting
 */
export async function updateSocialPostSuccess(
  postId: string,
  platformPostId: string,
  platformPostUrl: string
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('social_media_posts')
    .update({
      platform_post_id: platformPostId,
      platform_post_url: platformPostUrl,
      status: 'posted',
      posted_at: new Date().toISOString(),
    })
    .eq('id', postId);

  if (error) {
    console.error(`❌ Failed to update social post:`, error.message);
    return false;
  }

  return true;
}

/**
 * Update social media post after failed posting
 */
export async function updateSocialPostFailed(
  postId: string,
  errorMessage: string
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('social_media_posts')
    .update({
      status: 'failed',
      error_message: errorMessage,
    })
    .eq('id', postId);

  if (error) {
    console.error(`❌ Failed to update social post:`, error.message);
    return false;
  }

  return true;
}

/**
 * Check if content was already posted to a platform in a specific language
 */
export async function wasAlreadyPosted(
  contentId: string,
  contentType: ContentType,
  platform: Platform,
  language: Language
): Promise<{ posted: boolean; postUrl?: string }> {
  const supabase = getSupabaseClient();

  const { data } = await supabase
    .from('social_media_posts')
    .select('platform_post_id, platform_post_url')
    .eq('content_id', contentId)
    .eq('content_type', contentType)
    .eq('platform', platform)
    .eq('language', language)
    .eq('status', 'posted')
    .single();

  if (data?.platform_post_id) {
    return { posted: true, postUrl: data.platform_post_url };
  }

  return { posted: false };
}

/**
 * Get all posts for a specific content
 */
export async function getPostsForContent(
  contentId: string,
  contentType: ContentType
): Promise<SocialMediaPost[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('social_media_posts')
    .select('*')
    .eq('content_id', contentId)
    .eq('content_type', contentType)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`❌ Failed to get posts:`, error.message);
    return [];
  }

  return data || [];
}

// ============================================================
// Telegram Bot Helpers
// ============================================================

/**
 * Send a message to Telegram bot
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: {
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    replyMarkup?: any;
    disableWebPagePreview?: boolean;
  }
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

  if (!botToken) {
    return { success: false, error: "Telegram bot token not configured" };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: options?.parseMode || 'HTML',
          reply_markup: options?.replyMarkup,
          disable_web_page_preview: options?.disableWebPagePreview || false,
        }),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      return { success: false, error: data.description };
    }

    return { success: true, messageId: data.result.message_id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Send message to the comments bot (separate bot for comment notifications)
 */
export async function sendToCommentsBot(
  text: string,
  options?: {
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    replyMarkup?: any;
  }
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const botToken = Deno.env.get("TELEGRAM_COMMENTS_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_COMMENTS_CHAT_ID");

  if (!botToken || !chatId) {
    console.warn("⚠️ Comments bot not configured");
    return { success: false, error: "Comments bot not configured" };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: options?.parseMode || 'HTML',
          reply_markup: options?.replyMarkup,
          disable_web_page_preview: false,
        }),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      console.error("❌ Comments bot error:", data.description);
      return { success: false, error: data.description };
    }

    return { success: true, messageId: data.result.message_id };
  } catch (error: any) {
    console.error("❌ Comments bot error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Answer callback query (acknowledge button press)
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert?: boolean,
  botToken?: string
): Promise<boolean> {
  const token = botToken || Deno.env.get("TELEGRAM_BOT_TOKEN");

  if (!token) {
    return false;
  }

  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text,
        show_alert: showAlert || false,
      }),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Edit message text
 */
export async function editMessageText(
  chatId: string | number,
  messageId: number,
  text: string,
  options?: {
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    replyMarkup?: any;
  },
  botToken?: string
): Promise<boolean> {
  const token = botToken || Deno.env.get("TELEGRAM_BOT_TOKEN");

  if (!token) {
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/editMessageText`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: options?.parseMode || 'HTML',
          reply_markup: options?.replyMarkup,
        }),
      }
    );

    const data = await response.json();
    return data.ok;
  } catch {
    return false;
  }
}

// ============================================================
// Text Formatting
// ============================================================

/**
 * Escape HTML special characters for Telegram
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Truncate text to max length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Extract hashtags from tags array
 */
export function formatHashtags(tags: string[], maxCount: number = 5): string {
  return tags
    .slice(0, maxCount)
    .map(tag => `#${tag.replace(/[^a-zA-Z0-9]/g, '')}`)
    .join(' ');
}

/**
 * Get language name for display
 */
export function getLanguageName(lang: Language): string {
  const names: Record<Language, string> = {
    en: 'English',
    no: 'Norwegian',
    ua: 'Ukrainian',
  };
  return names[lang] || lang.toUpperCase();
}

/**
 * Get language emoji
 */
export function getLanguageEmoji(lang: Language): string {
  const emojis: Record<Language, string> = {
    en: '🇬🇧',
    no: '🇳🇴',
    ua: '🇺🇦',
  };
  return emojis[lang] || '🌐';
}

/**
 * Get platform emoji
 */
export function getPlatformEmoji(platform: Platform): string {
  const emojis: Record<Platform, string> = {
    linkedin: '🔗',
    facebook: '📘',
    instagram: '📸',
    tiktok: '🎵',
  };
  return emojis[platform] || '📱';
}

/**
 * Get platform name
 */
export function getPlatformName(platform: Platform): string {
  const names: Record<Platform, string> = {
    linkedin: 'LinkedIn',
    facebook: 'Facebook',
    instagram: 'Instagram',
    tiktok: 'TikTok',
  };
  return names[platform] || platform;
}
