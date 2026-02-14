/**
 * Duplicate Detection Helpers
 *
 * Cross-source duplicate news detection using pg_trgm similarity and AI
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

export const DUPLICATE_HELPERS_VERSION = "2026-02-15-v1";

// ============================================================
// Types
// ============================================================

export interface DuplicateResult {
  isDuplicate: boolean;
  existingNewsId?: string;
  existingTitle?: string;
  score?: number;
  method: 'url' | 'trigram' | 'ai';
  reason?: string;
  sourceName?: string;
  createdAt?: string;
}

interface FindSimilarRow {
  news_id: string;
  news_title: string;
  similarity_score: number;
  created_at: string;
  source_name: string;
}

// ============================================================
// Title normalization (mirrors SQL normalize_title)
// ============================================================

export function normalizeTitle(title: string): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')   // Remove punctuation
    .replace(/\s+/g, ' ')       // Collapse whitespace
    .trim();
}

// ============================================================
// Trigram-based duplicate check (via PostgreSQL function)
// ============================================================

export async function checkDuplicateByTitle(
  supabase: SupabaseClient,
  title: string,
  options?: { daysBack?: number; threshold?: number; excludeId?: string }
): Promise<DuplicateResult[]> {
  const daysBack = options?.daysBack ?? 7;
  const threshold = options?.threshold ?? 0.4;

  if (!title || title.length < 10) {
    return [];
  }

  const { data, error } = await supabase
    .rpc('find_similar_news', {
      search_title: title,
      days_back: daysBack,
      sim_threshold: threshold,
      max_results: 3
    });

  if (error) {
    console.warn('⚠️ Trigram duplicate check failed:', error.message);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  return (data as FindSimilarRow[])
    .filter((row) => !options?.excludeId || row.news_id !== options.excludeId)
    .map((row) => ({
      isDuplicate: row.similarity_score > 0.6,
      existingNewsId: row.news_id,
      existingTitle: row.news_title,
      score: row.similarity_score,
      method: 'trigram' as const,
      sourceName: row.source_name,
      createdAt: row.created_at,
      reason: row.similarity_score > 0.6
        ? `High similarity (${(row.similarity_score * 100).toFixed(0)}%)`
        : `Potential match (${(row.similarity_score * 100).toFixed(0)}%)`
    }));
}

// ============================================================
// AI-based duplicate check (cross-language)
// ============================================================

export async function checkDuplicateByAI(
  azureEndpoint: string,
  azureKey: string,
  newTitle: string,
  newSummary: string,
  recentArticles: { id: string; title: string }[],
  promptText?: string
): Promise<DuplicateResult | null> {
  if (!azureEndpoint || !azureKey) {
    console.warn('⚠️ Azure OpenAI not configured for AI dedup');
    return null;
  }

  if (recentArticles.length === 0) {
    return null;
  }

  const recentTitlesList = recentArticles
    .map((a, i) => `${i + 1}. ${a.title}`)
    .join('\n');

  const defaultPrompt = `You are a news duplicate detector. Compare the NEW article with RECENT articles and determine if they cover the SAME event or story.

NEW ARTICLE:
Title: ${newTitle}
Summary: ${newSummary}

RECENT ARTICLES (last 7 days):
${recentTitlesList}

Respond ONLY with valid JSON:
{"is_duplicate": true/false, "duplicate_of_index": number or null, "confidence": number 0-1, "reason": "brief explanation in English"}

Rules:
- Same event reported by different outlets = DUPLICATE
- Related but different aspects of a topic = NOT duplicate
- Same topic but different time period or new data = NOT duplicate
- Translation of the same article = DUPLICATE
- General industry trends appearing in multiple articles = NOT duplicate`;

  const prompt = promptText
    ? promptText
      .replace('{new_title}', newTitle)
      .replace('{new_summary}', newSummary)
      .replace('{recent_titles}', recentTitlesList)
    : defaultPrompt;

  try {
    const azureUrl = `${azureEndpoint}/openai/deployments/Jobbot-gpt-4.1-mini/chat/completions?api-version=2024-02-15-preview`;

    const response = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'api-key': azureKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a news duplicate detector. Respond ONLY with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      console.error('AI dedup call failed:', await response.text());
      return null;
    }

    const aiResult = await response.json();
    const aiContent = aiResult.choices?.[0]?.message?.content;
    if (!aiContent) return null;

    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.is_duplicate) {
      return null;
    }

    const matchIndex = parsed.duplicate_of_index;
    const matchedArticle = matchIndex && matchIndex > 0 && matchIndex <= recentArticles.length
      ? recentArticles[matchIndex - 1]
      : null;

    return {
      isDuplicate: true,
      existingNewsId: matchedArticle?.id,
      existingTitle: matchedArticle?.title,
      score: parsed.confidence ?? 0.7,
      method: 'ai',
      reason: parsed.reason || 'AI detected semantic duplicate'
    };
  } catch (err) {
    console.error('AI dedup error:', err);
    return null;
  }
}

// ============================================================
// Fetch recent article titles for AI context
// ============================================================

export async function fetchRecentTitles(
  supabase: SupabaseClient,
  daysBack: number = 7,
  limit: number = 20
): Promise<{ id: string; title: string }[]> {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const { data, error } = await supabase
    .from('news')
    .select('id, original_title')
    .neq('pre_moderation_status', 'rejected')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.warn('⚠️ Failed to fetch recent titles:', error?.message);
    return [];
  }

  return data
    .filter((n: { original_title: string | null }) => n.original_title)
    .map((n: { id: string; original_title: string }) => ({
      id: n.id,
      title: n.original_title
    }));
}

// ============================================================
// Format duplicate warning for Telegram message
// ============================================================

export function formatDuplicateWarning(duplicates: DuplicateResult[]): string {
  if (duplicates.length === 0) return '';

  const topMatch = duplicates[0];
  const scorePercent = topMatch.score ? `${(topMatch.score * 100).toFixed(0)}%` : '?';
  const methodLabel = topMatch.method === 'trigram' ? 'title match' : 'AI detected';

  let warning = `\n⚠️ <b>POTENTIAL DUPLICATE</b>\n`;
  warning += `Similar to: "<i>${escapeHtml(topMatch.existingTitle || 'Unknown')}</i>"\n`;
  warning += `Match: ${scorePercent} (${methodLabel})`;

  if (topMatch.sourceName) {
    warning += ` | Source: ${escapeHtml(topMatch.sourceName)}`;
  }

  if (topMatch.createdAt) {
    const hoursAgo = Math.round((Date.now() - new Date(topMatch.createdAt).getTime()) / 3600000);
    warning += ` | ${hoursAgo}h ago`;
  }

  warning += '\n';
  return warning;
}

// ============================================================
// Utility
// ============================================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
