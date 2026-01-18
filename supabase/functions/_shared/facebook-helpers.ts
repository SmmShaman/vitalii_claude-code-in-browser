/**
 * Facebook & Instagram API Helpers
 *
 * Provides utility functions for Meta Graph API integration
 * Supports both Facebook Pages and Instagram Business accounts
 */

export const FACEBOOK_HELPERS_VERSION = "2025-01-17-v1";

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
 * Post to Instagram (requires image)
 * Instagram Content Publishing API requires a two-step process:
 * 1. Create media container
 * 2. Publish the container
 */
export async function postToInstagram(options: {
  imageUrl: string;
  caption: string;
}): Promise<InstagramPostResult> {
  const pageAccessToken = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN");
  const instagramAccountId = Deno.env.get("INSTAGRAM_ACCOUNT_ID");

  if (!pageAccessToken || !instagramAccountId) {
    return { success: false, error: "Instagram credentials not configured" };
  }

  const { imageUrl, caption } = options;

  if (!imageUrl) {
    return { success: false, error: "Instagram requires an image URL" };
  }

  console.log("📸 Posting to Instagram...");
  console.log(`   Caption length: ${caption.length} chars`);
  console.log(`   Image: ${imageUrl.substring(0, 50)}...`);

  try {
    // Step 1: Create media container
    console.log("   Step 1: Creating media container...");
    const containerResponse = await fetch(
      `${GRAPH_API_BASE}/${instagramAccountId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          access_token: pageAccessToken,
          image_url: imageUrl,
          caption: caption,
        }).toString(),
      }
    );

    const containerData = await containerResponse.json();

    if (!containerResponse.ok || containerData.error) {
      console.error("❌ Failed to create Instagram container:", containerData.error);
      return {
        success: false,
        error: containerData.error?.message || "Failed to create media container",
      };
    }

    const containerId = containerData.id;
    console.log(`   Container created: ${containerId}`);

    // Step 2: Wait for container to be ready (poll status)
    // Instagram recommends waiting before publishing
    await new Promise((resolve) => setTimeout(resolve, 5000));

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
      console.error("❌ Failed to publish Instagram media:", publishData.error);
      return {
        success: false,
        error: publishData.error?.message || "Failed to publish media",
      };
    }

    const mediaId = publishData.id;

    // Get the permalink
    const permalinkResponse = await fetch(
      `${GRAPH_API_BASE}/${mediaId}?fields=permalink&access_token=${pageAccessToken}`
    );
    const permalinkData = await permalinkResponse.json();
    const postUrl = permalinkData.permalink || `https://instagram.com/p/${mediaId}`;

    console.log(`✅ Instagram post created: ${postUrl}`);

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
 * Format text for Instagram (2200 char limit, handles hashtags)
 */
export function formatInstagramCaption(
  title: string,
  description: string,
  url: string,
  hashtags: string[] = []
): string {
  const link = `\n\n${url}`;
  const hashtagText = hashtags.length > 0 ? `\n\n${hashtags.map(t => `#${t}`).join(' ')}` : '';

  // Instagram has 2200 char limit
  const maxDescLength = 2200 - title.length - link.length - hashtagText.length - 10;
  const trimmedDesc = description.length > maxDescLength
    ? description.substring(0, maxDescLength - 3) + '...'
    : description;

  return `${title}\n\n${trimmedDesc}${link}${hashtagText}`;
}

/**
 * Format text for Facebook (no strict limit but recommended < 500 chars for engagement)
 */
export function formatFacebookPost(
  title: string,
  description: string,
  hashtags: string[] = []
): string {
  const hashtagText = hashtags.length > 0 ? `\n\n${hashtags.map(t => `#${t}`).join(' ')}` : '';

  // Trim description for better engagement (Facebook recommends ~500 chars)
  const maxDescLength = 400;
  const trimmedDesc = description.length > maxDescLength
    ? description.substring(0, maxDescLength - 3) + '...'
    : description;

  return `${title}\n\n${trimmedDesc}${hashtagText}`;
}
