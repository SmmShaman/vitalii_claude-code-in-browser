/**
 * Facebook & Instagram API Helpers
 *
 * Provides utility functions for Meta Graph API integration
 * Supports both Facebook Pages and Instagram Business accounts
 */

export const FACEBOOK_HELPERS_VERSION = "2025-01-23-v4";

const GRAPH_API_VERSION = "v18.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// ============================================================
// Types
// ============================================================

export interface FacebookPageInfo {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  followers_count?: number;
}

export interface InstagramAccountInfo {
  id: string;
  username: string;
  name?: string;
  followers_count?: number;
  media_count?: number;
}

export interface FacebookPostResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

export interface InstagramPostResult {
  success: boolean;
  mediaId?: string;
  postUrl?: string;
  error?: string;
}

export interface FacebookComment {
  id: string;
  message: string;
  from?: {
    id: string;
    name: string;
  };
  created_time: string;
  like_count?: number;
  comment_count?: number;
  parent?: { id: string };
}

export interface InstagramComment {
  id: string;
  text: string;
  username: string;
  timestamp: string;
  like_count?: number;
  replies?: { data: InstagramComment[] };
}

export interface TokenDebugInfo {
  isValid: boolean;
  appId?: string;
  type?: string;
  scopes?: string[];
  expiresAt?: string;
  error?: string;
  instagramAccountId?: string;
  instagramUsername?: string;
  pageId?: string;
  pageName?: string;
}

// ============================================================
// Facebook Page Functions
// ============================================================

/**
 * Get Facebook Page info using page access token
 */
export async function getFacebookPageInfo(): Promise<FacebookPageInfo | null> {
  const pageAccessToken = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN");
  const pageId = Deno.env.get("FACEBOOK_PAGE_ID");

  if (!pageAccessToken || !pageId) {
    console.error("❌ Facebook credentials not configured");
    return null;
  }

  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/${pageId}?fields=id,name,category,followers_count&access_token=${pageAccessToken}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Facebook API error:", error);
      return null;
    }

    const data = await response.json();
    return {
      ...data,
      access_token: pageAccessToken,
    };
  } catch (error: any) {
    console.error("❌ Failed to get Facebook page info:", error.message);
    return null;
  }
}

/**
 * Post to Facebook Page (text + optional link/image)
 */
export async function postToFacebookPage(options: {
  message: string;
  link?: string;
  imageUrl?: string;
}): Promise<FacebookPostResult> {
  const pageAccessToken = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN");
  const pageId = Deno.env.get("FACEBOOK_PAGE_ID");

  if (!pageAccessToken || !pageId) {
    return { success: false, error: "Facebook credentials not configured" };
  }

  const { message, link, imageUrl } = options;

  console.log("📘 Posting to Facebook Page...");
  console.log(`   Message length: ${message.length} chars`);
  if (link) console.log(`   Link: ${link}`);
  if (imageUrl) console.log(`   Image: ${imageUrl.substring(0, 50)}...`);

  try {
    let endpoint: string;
    const formData = new URLSearchParams();
    formData.append("access_token", pageAccessToken);
    formData.append("message", message);

    if (imageUrl) {
      // Post with photo
      endpoint = `${GRAPH_API_BASE}/${pageId}/photos`;
      formData.append("url", imageUrl);
      if (link) {
        // Add link to message since photos don't support link parameter
        formData.set("message", `${message}\n\n${link}`);
      }
    } else {
      // Regular post (with optional link)
      endpoint = `${GRAPH_API_BASE}/${pageId}/feed`;
      if (link) {
        formData.append("link", link);
      }
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error("❌ Facebook post failed:", data.error);
      return {
        success: false,
        error: data.error?.message || "Unknown error",
      };
    }

    // For photos, the response has post_id, for feed it has id
    const postId = data.post_id || data.id;
    if (!postId) {
      console.error("⚠️ Facebook API response missing post ID:", JSON.stringify(data));
      return { success: false, error: "No post ID in Facebook response" };
    }

    const postUrl = `https://facebook.com/${postId}`;

    console.log(`✅ Facebook post created: ${postUrl}`);

    return {
      success: true,
      postId,
      postUrl,
    };
  } catch (error: any) {
    console.error("❌ Facebook post error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get comments from a Facebook post
 */
export async function getFacebookPostComments(postId: string): Promise<FacebookComment[]> {
  const pageAccessToken = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN");

  if (!pageAccessToken) {
    console.error("❌ Facebook credentials not configured");
    return [];
  }

  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/${postId}/comments?fields=id,message,from,created_time,like_count,comment_count,parent&access_token=${pageAccessToken}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Failed to get Facebook comments:", error);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error: any) {
    console.error("❌ Facebook comments error:", error.message);
    return [];
  }
}

/**
 * Reply to a Facebook comment
 */
export async function replyToFacebookComment(
  commentId: string,
  message: string
): Promise<{ success: boolean; replyId?: string; error?: string }> {
  const pageAccessToken = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN");

  if (!pageAccessToken) {
    return { success: false, error: "Facebook credentials not configured" };
  }

  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/${commentId}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          access_token: pageAccessToken,
          message: message,
        }).toString(),
      }
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      return { success: false, error: data.error?.message || "Unknown error" };
    }

    console.log(`✅ Replied to Facebook comment ${commentId}`);
    return { success: true, replyId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================
// Instagram Functions
// ============================================================

/**
 * Get Instagram Business account info
 */
export async function getInstagramAccountInfo(): Promise<InstagramAccountInfo | null> {
  const pageAccessToken = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN");
  const instagramAccountId = Deno.env.get("INSTAGRAM_ACCOUNT_ID");

  if (!pageAccessToken || !instagramAccountId) {
    console.error("❌ Instagram credentials not configured");
    return null;
  }

  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/${instagramAccountId}?fields=id,username,name,followers_count,media_count&access_token=${pageAccessToken}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Instagram API error:", error);
      return null;
    }

    return await response.json();
  } catch (error: any) {
    console.error("❌ Failed to get Instagram account info:", error.message);
    return null;
  }
}

/**
 * Post to Instagram (image or video/Reels)
 * Instagram Content Publishing API requires a two-step process:
 * 1. Create media container
 * 2. Publish the container
 *
 * For Reels (video):
 * - Use media_type: 'REELS' and video_url parameter
 * - Video must be MP4, 3-90 seconds, max 1GB
 *
 * Common errors:
 * - Error #10: Application does not have permission (missing instagram_content_publish scope)
 * - Error #190: Invalid OAuth access token
 * - Error #100: Invalid parameter (usually media URL issues)
 */
export async function postToInstagram(options: {
  imageUrl?: string;
  videoUrl?: string;
  caption: string;
}): Promise<InstagramPostResult> {
  const pageAccessToken = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN");
  const instagramAccountId = Deno.env.get("INSTAGRAM_ACCOUNT_ID");

  if (!pageAccessToken || !instagramAccountId) {
    return { success: false, error: "Instagram credentials not configured" };
  }

  const { imageUrl, videoUrl, caption } = options;

  if (!imageUrl && !videoUrl) {
    return { success: false, error: "Instagram requires an image or video URL" };
  }

  const isVideo = !!videoUrl && !imageUrl;
  const mediaUrl = videoUrl || imageUrl;

  console.log(`📸 Posting to Instagram (${isVideo ? 'REELS/VIDEO' : 'IMAGE'})...`);
  console.log(`   Instagram Account ID: ${instagramAccountId}`);
  console.log(`   Caption length: ${caption.length} chars`);
  console.log(`   Media URL: ${mediaUrl}`);
  console.log(`   Media type: ${isVideo ? 'REELS' : 'IMAGE'}`);

  try {
    // Step 1: Create media container
    console.log("   Step 1: Creating media container...");

    const containerParams: Record<string, string> = {
      access_token: pageAccessToken,
      caption: caption,
    };

    if (isVideo) {
      // For Reels/Video
      containerParams.media_type = 'REELS';
      containerParams.video_url = videoUrl!;
      // Share to feed as well
      containerParams.share_to_feed = 'true';
    } else {
      // For Images
      containerParams.image_url = imageUrl!;
    }

    const containerResponse = await fetch(
      `${GRAPH_API_BASE}/${instagramAccountId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(containerParams).toString(),
      }
    );

    const containerData = await containerResponse.json();

    if (!containerResponse.ok || containerData.error) {
      const errorCode = containerData.error?.code;
      const errorType = containerData.error?.type;
      const errorMessage = containerData.error?.message;
      const errorSubcode = containerData.error?.error_subcode;

      console.error("❌ Failed to create Instagram container:");
      console.error(`   Error Code: ${errorCode}`);
      console.error(`   Error Type: ${errorType}`);
      console.error(`   Error Message: ${errorMessage}`);
      console.error(`   Error Subcode: ${errorSubcode}`);
      console.error(`   Full error: ${JSON.stringify(containerData.error, null, 2)}`);

      // Provide helpful troubleshooting info for common errors
      let troubleshootingHint = "";
      if (errorCode === 10) {
        troubleshootingHint = "\n\n🔧 Error #10 Fix: Your token is missing the 'instagram_content_publish' permission. " +
          "Go to Graph API Explorer, generate a new Page Access Token with scopes: " +
          "instagram_basic, instagram_content_publish, pages_read_engagement. " +
          "Then convert to long-lived token and update FACEBOOK_PAGE_ACCESS_TOKEN.";
      } else if (errorCode === 190) {
        troubleshootingHint = "\n\n🔧 Error #190 Fix: Your access token is invalid or expired. " +
          "Generate a new token from Graph API Explorer.";
      } else if (errorCode === 100) {
        troubleshootingHint = `\n\n🔧 Error #100 Fix: Check that the ${isVideo ? 'video' : 'image'} URL is publicly accessible, ` +
          `uses HTTPS, and the format is supported ${isVideo ? '(MP4, 3-90 seconds, max 1GB)' : '(JPEG/PNG)'}.`;
      } else if (errorCode === 24) {
        troubleshootingHint = "\n\n🔧 Error #24 Fix: You've reached the Instagram API rate limit. " +
          "Wait 24 hours before posting again.";
      }

      return {
        success: false,
        error: `Error #${errorCode}: ${errorMessage}${troubleshootingHint}`,
      };
    }

    const containerId = containerData.id;
    console.log(`   ✅ Container created: ${containerId}`);

    // Step 2: Wait for container to be ready (poll status)
    // For videos, Instagram needs more time to process
    const waitTime = isVideo ? 30000 : 5000; // 30s for video, 5s for image
    console.log(`   Waiting ${waitTime/1000}s for container to process...`);

    // For videos, we should poll the status instead of just waiting
    if (isVideo) {
      let attempts = 0;
      const maxAttempts = 30; // Max 5 minutes (30 * 10s)
      let containerStatus = 'IN_PROGRESS';

      while (containerStatus === 'IN_PROGRESS' && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10s between checks
        attempts++;

        console.log(`   Checking container status (attempt ${attempts}/${maxAttempts})...`);

        const statusResponse = await fetch(
          `${GRAPH_API_BASE}/${containerId}?fields=status_code,status&access_token=${pageAccessToken}`
        );
        const statusData = await statusResponse.json();

        containerStatus = statusData.status_code || statusData.status || 'UNKNOWN';
        console.log(`   Container status: ${containerStatus}`);

        if (statusData.error) {
          console.error("❌ Container status check failed:", statusData.error);
          return {
            success: false,
            error: `Video processing failed: ${statusData.error.message}`,
          };
        }

        if (containerStatus === 'ERROR') {
          return {
            success: false,
            error: 'Video processing failed. Check video format (MP4), duration (3-90s), and size (max 1GB).',
          };
        }

        if (containerStatus === 'FINISHED') {
          console.log(`   ✅ Video processing completed!`);
          break;
        }
      }

      if (containerStatus === 'IN_PROGRESS') {
        return {
          success: false,
          error: 'Video processing timeout. The video may be too large or in an unsupported format.',
        };
      }
    } else {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    // Step 3: Publish the container
    console.log("   Step 2: Publishing media...");
    const publishResponse = await fetch(
      `${GRAPH_API_BASE}/${instagramAccountId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          access_token: pageAccessToken,
          creation_id: containerId,
        }).toString(),
      }
    );

    const publishData = await publishResponse.json();

    if (!publishResponse.ok || publishData.error) {
      const errorCode = publishData.error?.code;
      const errorMessage = publishData.error?.message;
      console.error("❌ Failed to publish Instagram media:");
      console.error(`   Error Code: ${errorCode}`);
      console.error(`   Error Message: ${errorMessage}`);
      console.error(`   Full error: ${JSON.stringify(publishData.error, null, 2)}`);

      return {
        success: false,
        error: `Publish Error #${errorCode}: ${errorMessage}`,
      };
    }

    const mediaId = publishData.id;
    console.log(`   ✅ Media published: ${mediaId}`);

    // Get the permalink
    const permalinkResponse = await fetch(
      `${GRAPH_API_BASE}/${mediaId}?fields=permalink&access_token=${pageAccessToken}`
    );
    const permalinkData = await permalinkResponse.json();
    const postUrl = permalinkData.permalink || `https://instagram.com/p/${mediaId}`;

    console.log(`✅ Instagram ${isVideo ? 'Reel' : 'post'} created: ${postUrl}`);

    return {
      success: true,
      mediaId,
      postUrl,
    };
  } catch (error: any) {
    console.error("❌ Instagram post error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get comments from an Instagram post
 */
export async function getInstagramPostComments(mediaId: string): Promise<InstagramComment[]> {
  const pageAccessToken = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN");

  if (!pageAccessToken) {
    console.error("❌ Instagram credentials not configured");
    return [];
  }

  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/${mediaId}/comments?fields=id,text,username,timestamp,like_count,replies{id,text,username,timestamp}&access_token=${pageAccessToken}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Failed to get Instagram comments:", error);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error: any) {
    console.error("❌ Instagram comments error:", error.message);
    return [];
  }
}

/**
 * Reply to an Instagram comment
 */
export async function replyToInstagramComment(
  commentId: string,
  message: string
): Promise<{ success: boolean; replyId?: string; error?: string }> {
  const pageAccessToken = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN");

  if (!pageAccessToken) {
    return { success: false, error: "Instagram credentials not configured" };
  }

  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/${commentId}/replies`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          access_token: pageAccessToken,
          message: message,
        }).toString(),
      }
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      return { success: false, error: data.error?.message || "Unknown error" };
    }

    console.log(`✅ Replied to Instagram comment ${commentId}`);
    return { success: true, replyId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Check if Facebook integration is configured
 */
export function isFacebookConfigured(): boolean {
  return !!(
    Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN") &&
    Deno.env.get("FACEBOOK_PAGE_ID")
  );
}

/**
 * Check if Instagram integration is configured
 */
export function isInstagramConfigured(): boolean {
  return !!(
    Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN") &&
    Deno.env.get("INSTAGRAM_ACCOUNT_ID")
  );
}

/**
 * Debug Instagram token - check permissions and validity
 * Error #10 usually means missing permissions:
 * - instagram_basic
 * - instagram_content_publish
 * - pages_read_engagement
 */
export async function debugInstagramToken(): Promise<TokenDebugInfo> {
  const pageAccessToken = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN");
  const instagramAccountId = Deno.env.get("INSTAGRAM_ACCOUNT_ID");
  const pageId = Deno.env.get("FACEBOOK_PAGE_ID");

  if (!pageAccessToken) {
    return {
      isValid: false,
      error: "FACEBOOK_PAGE_ACCESS_TOKEN not set in environment",
    };
  }

  console.log("🔍 Debugging Instagram token...");
  console.log(`   Instagram Account ID: ${instagramAccountId || "NOT SET"}`);
  console.log(`   Facebook Page ID: ${pageId || "NOT SET"}`);

  try {
    // Step 1: Debug the token itself
    console.log("   Step 1: Checking token validity...");
    const debugResponse = await fetch(
      `${GRAPH_API_BASE}/debug_token?input_token=${pageAccessToken}&access_token=${pageAccessToken}`
    );
    const debugData = await debugResponse.json();

    if (debugData.error) {
      console.error("❌ Token debug failed:", debugData.error);
      return {
        isValid: false,
        error: `Token debug failed: ${debugData.error.message} (code: ${debugData.error.code})`,
      };
    }

    const tokenInfo = debugData.data;
    console.log("   Token info:", JSON.stringify(tokenInfo, null, 2));

    const result: TokenDebugInfo = {
      isValid: tokenInfo.is_valid,
      appId: tokenInfo.app_id,
      type: tokenInfo.type,
      scopes: tokenInfo.scopes || [],
      expiresAt: tokenInfo.expires_at
        ? new Date(tokenInfo.expires_at * 1000).toISOString()
        : "never",
    };

    // Check required scopes
    const requiredScopes = [
      "instagram_basic",
      "instagram_content_publish",
      "pages_read_engagement",
    ];
    const missingScopes = requiredScopes.filter(
      (scope) => !result.scopes?.includes(scope)
    );

    if (missingScopes.length > 0) {
      console.warn(`⚠️ Missing required scopes: ${missingScopes.join(", ")}`);
      result.error = `Missing required scopes: ${missingScopes.join(", ")}. ` +
        `You need to regenerate the token with these permissions.`;
    }

    // Step 2: Try to get Instagram account info
    if (instagramAccountId) {
      console.log("   Step 2: Checking Instagram account access...");
      try {
        const igResponse = await fetch(
          `${GRAPH_API_BASE}/${instagramAccountId}?fields=id,username&access_token=${pageAccessToken}`
        );
        const igData = await igResponse.json();

        if (igData.error) {
          console.error("❌ Instagram account access failed:", igData.error);
          result.error = (result.error ? result.error + " " : "") +
            `Instagram account error: ${igData.error.message} (code: ${igData.error.code})`;
        } else {
          result.instagramAccountId = igData.id;
          result.instagramUsername = igData.username;
          console.log(`   ✅ Instagram account: @${igData.username} (${igData.id})`);
        }
      } catch (e: any) {
        console.error("❌ Instagram account fetch failed:", e.message);
      }
    }

    // Step 3: Check if Instagram account is linked to Page
    if (pageId) {
      console.log("   Step 3: Checking Page → Instagram link...");
      try {
        const pageResponse = await fetch(
          `${GRAPH_API_BASE}/${pageId}?fields=id,name,instagram_business_account&access_token=${pageAccessToken}`
        );
        const pageData = await pageResponse.json();

        if (pageData.error) {
          console.error("❌ Page access failed:", pageData.error);
          result.error = (result.error ? result.error + " " : "") +
            `Page error: ${pageData.error.message} (code: ${pageData.error.code})`;
        } else {
          result.pageId = pageData.id;
          result.pageName = pageData.name;
          console.log(`   ✅ Page: ${pageData.name} (${pageData.id})`);

          if (pageData.instagram_business_account) {
            const linkedIgId = pageData.instagram_business_account.id;
            console.log(`   ✅ Linked Instagram ID: ${linkedIgId}`);

            if (instagramAccountId && linkedIgId !== instagramAccountId) {
              console.warn(`⚠️ MISMATCH: INSTAGRAM_ACCOUNT_ID (${instagramAccountId}) != linked account (${linkedIgId})`);
              result.error = (result.error ? result.error + " " : "") +
                `Instagram ID mismatch! Set INSTAGRAM_ACCOUNT_ID=${linkedIgId}`;
            }
          } else {
            console.warn("⚠️ No Instagram Business account linked to this Page");
            result.error = (result.error ? result.error + " " : "") +
              "No Instagram Business account is linked to this Facebook Page. " +
              "Go to Facebook Page Settings → Instagram and connect your account.";
          }
        }
      } catch (e: any) {
        console.error("❌ Page fetch failed:", e.message);
      }
    }

    // Summary
    console.log("\n📋 Token Debug Summary:");
    console.log(`   Valid: ${result.isValid}`);
    console.log(`   Scopes: ${result.scopes?.join(", ") || "none"}`);
    console.log(`   Expires: ${result.expiresAt}`);
    if (result.error) {
      console.log(`   ⚠️ Issues: ${result.error}`);
    }

    return result;
  } catch (error: any) {
    console.error("❌ Token debug error:", error.message);
    return {
      isValid: false,
      error: `Debug failed: ${error.message}`,
    };
  }
}

// Localized CTA for Instagram captions
const INSTAGRAM_LINK_CTA: Record<string, string> = {
  en: '🔗 Read on vitalii.no',
  no: '🔗 Les på vitalii.no',
  ua: '🔗 Читати на vitalii.no'
}

/**
 * Format text for Instagram (2200 char limit, handles hashtags)
 * NOTE: Instagram does NOT support clickable links in captions!
 * Links appear as plain text only. Users must copy/paste or use "link in bio"
 */
export function formatInstagramCaption(
  title: string,
  description: string,
  url: string,
  hashtags: string[] = [],
  language: 'en' | 'no' | 'ua' = 'en'
): string {
  // Instagram doesn't support clickable links - use "link in bio" style
  // Show domain name only (users can find the article on the website)
  const linkText = `\n\n${INSTAGRAM_LINK_CTA[language] || INSTAGRAM_LINK_CTA.en}`;

  const hashtagText = hashtags.length > 0
    ? `\n\n${hashtags.slice(0, 10).map(t => `#${t.replace(/[^a-zA-Z0-9а-яА-ЯіІїЇєЄ]/g, '')}`).join(' ')}`
    : '';

  // Instagram has 2200 char limit
  const maxDescLength = 2200 - title.length - linkText.length - hashtagText.length - 10;
  const trimmedDesc = description.length > maxDescLength
    ? description.substring(0, maxDescLength - 3) + '...'
    : description;

  return `${title}\n\n${trimmedDesc}${linkText}${hashtagText}`;
}

/**
 * Format text for Facebook (no strict limit but recommended < 500 chars for engagement)
 */
export function formatFacebookPost(
  title: string,
  description: string,
  hashtags: string[] = []
): string {
  // Remove spaces and special chars from hashtags (e.g. "Data Intelligence" → "DataIntelligence")
  const hashtagText = hashtags.length > 0
    ? `\n\n${hashtags.map(t => `#${t.replace(/[^a-zA-Z0-9а-яА-ЯіІїЇєЄæøåÆØÅ]/g, '')}`).join(' ')}`
    : '';

  // Trim description for better engagement (Facebook recommends ~500 chars)
  const maxDescLength = 400;
  const trimmedDesc = description.length > maxDescLength
    ? description.substring(0, maxDescLength - 3) + '...'
    : description;

  return `${title}\n\n${trimmedDesc}${hashtagText}`;
}
