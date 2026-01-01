/**
 * GitHub Actions Trigger Helper
 *
 * Triggers GitHub Actions workflows from Supabase Edge Functions
 */

export const GITHUB_ACTIONS_VERSION = "2025-01-01-v1";

interface TriggerVideoProcessingOptions {
  newsId?: string;
  mode?: 'single' | 'batch';
  batchLimit?: number;
}

/**
 * Trigger the video processing GitHub Action
 *
 * @param options - Processing options
 * @returns Success status and any error message
 */
export async function triggerVideoProcessing(
  options: TriggerVideoProcessingOptions = {}
): Promise<{ success: boolean; error?: string }> {
  const ghPat = Deno.env.get('GH_PAT');
  const ghRepo = Deno.env.get('GH_REPO') || 'SmmShaman/vitalii_claude-code-in-browser';

  if (!ghPat) {
    console.warn('⚠️ GH_PAT not configured - cannot trigger GitHub Action');
    return { success: false, error: 'GitHub PAT not configured' };
  }

  const { newsId, mode = 'single', batchLimit = 10 } = options;

  console.log(`🚀 Triggering GitHub Action: process-video`);
  console.log(`   Mode: ${mode}`);
  if (newsId) console.log(`   News ID: ${newsId}`);

  try {
    const response = await fetch(
      `https://api.github.com/repos/${ghRepo}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${ghPat}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: 'process-video',
          client_payload: {
            news_id: newsId || '',
            mode: mode,
            batch_limit: String(batchLimit),
          },
        }),
      }
    );

    if (response.status === 204) {
      console.log('✅ GitHub Action triggered successfully');
      return { success: true };
    }

    const errorText = await response.text();
    console.error(`❌ GitHub Action trigger failed: ${response.status} ${errorText}`);
    return { success: false, error: `HTTP ${response.status}: ${errorText}` };

  } catch (error: any) {
    console.error('❌ Failed to trigger GitHub Action:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Check if video processing should use GitHub Actions
 * Returns true if GH_PAT is configured
 */
export function isGitHubActionsEnabled(): boolean {
  return !!Deno.env.get('GH_PAT');
}

interface TriggerLinkedInVideoOptions {
  newsId: string;
  language: 'en' | 'no' | 'ua';
}

/**
 * Trigger the LinkedIn video upload GitHub Action
 * Downloads video from Telegram and uploads to LinkedIn as native video
 *
 * @param options - News ID and language for LinkedIn post
 * @returns Success status and any error message
 */
export async function triggerLinkedInVideo(
  options: TriggerLinkedInVideoOptions
): Promise<{ success: boolean; error?: string }> {
  const ghPat = Deno.env.get('GH_PAT');
  const ghRepo = Deno.env.get('GH_REPO') || 'SmmShaman/vitalii_claude-code-in-browser';

  if (!ghPat) {
    console.warn('⚠️ GH_PAT not configured - cannot trigger GitHub Action');
    return { success: false, error: 'GitHub PAT not configured' };
  }

  const { newsId, language } = options;

  console.log(`🚀 Triggering GitHub Action: linkedin-video`);
  console.log(`   News ID: ${newsId}`);
  console.log(`   Language: ${language}`);

  try {
    const response = await fetch(
      `https://api.github.com/repos/${ghRepo}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${ghPat}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: 'linkedin-video',
          client_payload: {
            news_id: newsId,
            language: language,
          },
        }),
      }
    );

    if (response.status === 204) {
      console.log('✅ LinkedIn video GitHub Action triggered successfully');
      return { success: true };
    }

    const errorText = await response.text();
    console.error(`❌ GitHub Action trigger failed: ${response.status} ${errorText}`);
    return { success: false, error: `HTTP ${response.status}: ${errorText}` };

  } catch (error: any) {
    console.error('❌ Failed to trigger LinkedIn video Action:', error.message);
    return { success: false, error: error.message };
  }
}
