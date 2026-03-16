/**
 * Daily Video Bot — Edge Function
 *
 * Two modes:
 *   A. AUTO (cron): auto_digest → LLM ranks articles + writes script → moderator approves → scenario → images → render
 *   B. MANUAL: initiate_digest → moderator picks articles → generate_script → scenario → images → render
 *
 * Actions:
 *   - auto_digest       — LLM selects top-10 + writes script (skips manual selection)
 *   - initiate_digest   — fetch news, send digest to Telegram (manual mode)
 *   - generate_script   — AI writes per-article Norwegian scripts
 *   - apply_edit        — user edited script text via reply
 *   - generate_scenario — AI plans visual scenario
 *   - prepare_images    — send article images to Telegram for approval
 *   - trigger_render    — dispatch GitHub Actions for Remotion render
 *
 * Called by: telegram-webhook (callback handlers), cron workflow, manual
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { triggerDailyVideoRender } from "../_shared/github-actions.ts";

const VERSION = "2026-03-15-v26-media-preview";
const MAX_DETAILED = 10;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID")!;

const AZURE_ENDPOINT = Deno.env.get("AZURE_OPENAI_ENDPOINT") || "";
const AZURE_KEY = Deno.env.get("AZURE_OPENAI_API_KEY") || "";
const AZURE_DEPLOYMENT = Deno.env.get("AZURE_OPENAI_DEPLOYMENT") || "Jobbot-gpt-4.1-mini";
const GEMINI_API_KEY = Deno.env.get("GOOGLE_API_KEY") || "";
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";

// LLM provider override (set via query param or api_settings)
let LLM_PROVIDER = "azure"; // default

// ── Telegram Helpers ──

async function sendMessage(
  chatId: string | number,
  text: string,
  options: { reply_markup?: any; parse_mode?: string; disable_web_page_preview?: boolean } = {},
): Promise<number> {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: options.parse_mode || "HTML",
    disable_web_page_preview: options.disable_web_page_preview ?? true,
    ...(options.reply_markup ? { reply_markup: options.reply_markup } : {}),
  };
  const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!data.ok) {
    console.error(`❌ Telegram sendMessage failed: ${data.description || JSON.stringify(data)} (text length: ${text.length})`);
  }
  return data.result?.message_id || 0;
}

async function editMessage(
  chatId: string | number,
  messageId: number,
  text: string,
  options: { reply_markup?: any } = {},
): Promise<void> {
  const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(options.reply_markup ? { reply_markup: options.reply_markup } : {}),
    }),
  });
  const data = await resp.json();
  if (!data.ok) {
    console.error(`❌ Telegram editMessage failed: ${data.description || JSON.stringify(data)} (text length: ${text.length})`);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── Date Helpers ──

function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function formatDateNorwegian(dateStr: string): string {
  const months = [
    "januar", "februar", "mars", "april", "mai", "juni",
    "juli", "august", "september", "oktober", "november", "desember",
  ];
  const d = new Date(dateStr);
  return `${d.getUTCDate()}. ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// ── Azure OpenAI Helper ──

async function callAI(systemPrompt: string, userPrompt: string, maxTokens = 4000): Promise<string> {
  if (LLM_PROVIDER === "gemini" && GEMINI_API_KEY) {
    console.log("🤖 Using Gemini 2.5 Flash Lite");
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: maxTokens,
            responseMimeType: "application/json",
          },
        }),
      }
    );
    if (!resp.ok) throw new Error(`Gemini: ${resp.status} ${await resp.text()}`);
    const data = await resp.json();
    // Gemini may return multiple parts (thinking + response), get the last text part
    const parts = data.candidates?.[0]?.content?.parts || [];
    let text = "";
    for (const part of parts) {
      if (part.text) text = part.text.trim();
    }
    console.log(`🤖 Gemini response: ${text.substring(0, 100)}...`);
    // Strip markdown code block if present
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
    }
    return text;
  }

  if (LLM_PROVIDER === "groq" && GROQ_API_KEY) {
    console.log("🤖 Using Groq (Llama 4 Scout)");
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
      }),
    });
    if (!resp.ok) throw new Error(`Groq: ${resp.status} ${await resp.text()}`);
    const data = await resp.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  }

  // Default: Azure OpenAI
  console.log("🤖 Using Azure OpenAI");
  const url = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=2024-08-01-preview`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": AZURE_KEY },
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });
  if (!resp.ok) throw new Error(`Azure OpenAI: ${resp.status} ${await resp.text()}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

// ── Digest Helpers ──

function buildDigestMessage(
  headlines: any[],
  excludedIds: string[],
  date: string,
): string {
  const displayDate = formatDateNorwegian(date);
  const excludedSet = new Set(excludedIds);
  const selectedCount = headlines.filter((h: any) => !excludedSet.has(h.id)).length;
  // Compact mode for large digests (Telegram 4096 char limit)
  const compact = headlines.length > 15;

  let msg = `📺 <b>Щоденне відео — ${displayDate}</b>\n\n`;
  msg += `Знайдено <b>${headlines.length}</b> статей (обрано: <b>${selectedCount}</b>):\n\n`;

  headlines.forEach((h: any, i: number) => {
    const isExcluded = excludedSet.has(h.id);
    const marker = isExcluded ? "⬜" : "✅";
    // Truncate title before escaping (avoid cutting HTML entities like &amp;)
    const rawTitle = compact && h.title.length > 60 ? h.title.substring(0, 60) + "…" : h.title;
    const titleText = escapeHtml(rawTitle);
    msg += `${i + 1}. ${marker} <b>${titleText}</b>\n`;
    // Show descriptions only in non-compact mode for selected articles
    if (!compact && h.description && !isExcluded) {
      msg += `   <i>${escapeHtml(h.description.substring(0, 80))}${h.description.length > 80 ? "..." : ""}</i>\n`;
    }
  });

  msg += "\n";
  if (selectedCount > MAX_DETAILED) {
    msg += `⚠️ Перші ${MAX_DETAILED} детально, решта ${selectedCount - MAX_DETAILED} як згадка.\n\n`;
  }
  msg += `Створити відео з <b>${selectedCount}</b> статей?`;
  return msg;
}

function buildDigestKeyboard(
  headlines: any[],
  excludedIds: string[],
  date: string,
): { inline_keyboard: any[][] } {
  const excludedSet = new Set(excludedIds);
  const selectedCount = headlines.filter((h: any) => !excludedSet.has(h.id)).length;

  // Toggle buttons: 4 per row
  const toggleRows: any[][] = [];
  let currentRow: any[] = [];
  headlines.forEach((_h: any, i: number) => {
    const idx = i + 1;
    const isExcluded = excludedSet.has(_h.id);
    const icon = isExcluded ? "⬜" : "✅";
    currentRow.push({
      text: `${icon}${idx}`,
      callback_data: `dv_t_${idx}_${date}`,
    });
    if (currentRow.length === 4) {
      toggleRows.push(currentRow);
      currentRow = [];
    }
  });
  if (currentRow.length > 0) toggleRows.push(currentRow);

  // Action row
  const actionRow = [
    { text: `✅ Підтвердити (${selectedCount})`, callback_data: `dv_ok_${date}` },
    { text: "❌ Пропустити", callback_data: `dv_skip_${date}` },
  ];

  return { inline_keyboard: [...toggleRows, actionRow] };
}

// ══════════════════════════════════════════════════════════════
// STEP 1: Initiate Digest
// ══════════════════════════════════════════════════════════════

async function initiateDigest(targetDate?: string): Promise<Response> {
  const date = targetDate || getYesterdayDate();
  console.log(`📅 Initiating digest for ${date}`);

  // Skip if digest already sent (idempotency for dual cron)
  const { data: existingDraft } = await supabase
    .from("daily_video_drafts")
    .select("status")
    .eq("target_date", date)
    .single();

  if (existingDraft && existingDraft.status !== "pending_digest") {
    console.log(`⏭ Draft for ${date} already exists with status: ${existingDraft.status}, skipping`);
    return json({ ok: true, message: `Already in progress: ${existingDraft.status}` });
  }

  const start = `${date}T00:00:00Z`;
  const end = `${date}T23:59:59.999Z`;

  // Fetch published news by published_at (not created_at — articles are scraped one day, published the next)
  const { data: articles, error } = await supabase
    .from("news")
    .select("id, title_ua, title_no, title_en, original_title, description_ua, description_no, description_en, image_url, processed_image_url, tags, slug_en")
    .eq("is_published", true)
    .gte("published_at", start)
    .lte("published_at", end)
    .order("published_at", { ascending: true });

  if (error) throw new Error(`DB error: ${error.message}`);
  if (!articles || articles.length === 0) {
    console.log("No articles found for this date");
    return json({ ok: true, message: "No articles found" });
  }

  if (articles.length < 2) {
    console.log("Only 1 article — need at least 2");
    return json({ ok: true, message: "Only 1 article, need 2+" });
  }

  // Create or update draft
  const headlines = articles.map((a: any) => ({
    id: a.id,
    title: a.title_no || a.title_en || a.original_title || "",
    description: a.description_no || a.description_en || "",
    hasImage: !!(a.processed_image_url || a.image_url),
    tags: a.tags || [],
    slug_en: a.slug_en || "",
  }));

  const { data: draft, error: upsertError } = await supabase
    .from("daily_video_drafts")
    .upsert({
      target_date: date,
      status: "pending_digest",
      article_ids: articles.map((a: any) => a.id),
      article_headlines: headlines,
      excluded_article_ids: [],
      telegram_chat_id: Number(TELEGRAM_CHAT_ID),
    }, { onConflict: "target_date" })
    .select()
    .single();

  if (upsertError) throw new Error(`Draft upsert: ${upsertError.message}`);

  // Send digest to Telegram with toggle buttons
  const msg = buildDigestMessage(headlines, [], date);
  const keyboard = buildDigestKeyboard(headlines, [], date);

  const msgId = await sendMessage(TELEGRAM_CHAT_ID, msg, { reply_markup: keyboard });

  // Save message ID
  await supabase
    .from("daily_video_drafts")
    .update({ telegram_message_ids: [msgId] })
    .eq("id", draft.id);

  console.log(`✅ Digest sent (${articles.length} articles)`);
  return json({ ok: true, draftId: draft.id, articles: articles.length });
}

// ══════════════════════════════════════════════════════════════
// STEP 1-AUTO: Auto Digest (LLM ranks + writes script in one step)
// ══════════════════════════════════════════════════════════════

async function autoDigest(targetDate?: string, youtubePrivacy = "public"): Promise<Response> {
  const date = targetDate || getYesterdayDate();
  console.log(`🤖 Auto digest for ${date}`);

  // Skip if already in progress
  const { data: existingDraft } = await supabase
    .from("daily_video_drafts")
    .select("status")
    .eq("target_date", date)
    .single();

  if (existingDraft && existingDraft.status !== "pending_digest") {
    console.log(`⏭ Draft for ${date} already exists: ${existingDraft.status}`);
    return json({ ok: true, message: `Already in progress: ${existingDraft.status}` });
  }

  const start = `${date}T00:00:00Z`;
  const end = `${date}T23:59:59.999Z`;

  // Fetch ALL published articles with rss_analysis
  const { data: articles, error } = await supabase
    .from("news")
    .select("id, title_ua, title_no, title_en, original_title, description_ua, description_no, description_en, content_no, content_en, original_content, image_url, processed_image_url, images, video_url, original_video_url, tags, slug_en, rss_analysis, source_link")
    .eq("is_published", true)
    .gte("published_at", start)
    .lte("published_at", end)
    .order("published_at", { ascending: true });

  if (error) throw new Error(`DB error: ${error.message}`);
  if (!articles || articles.length === 0) {
    console.log("No articles found for this date");
    await sendMessage(TELEGRAM_CHAT_ID, `📺 <b>Дайджест за ${formatDateNorwegian(date)}</b>\n\n❌ Статей не знайдено.`);
    return json({ ok: true, message: "No articles found" });
  }

  if (articles.length < 2) {
    console.log("Only 1 article — need at least 2");
    await sendMessage(TELEGRAM_CHAT_ID, `📺 <b>Дайджест за ${formatDateNorwegian(date)}</b>\n\n⚠️ Лише 1 стаття — потрібно мінімум 2.`);
    return json({ ok: true, message: "Only 1 article, need 2+" });
  }

  // Notify moderator that auto-digest is starting
  await sendMessage(TELEGRAM_CHAT_ID, `🤖 <b>Авто-дайджест за ${formatDateNorwegian(date)}</b>\n\n📰 Знайдено <b>${articles.length}</b> статей\n⏳ LLM аналізує та обирає топ-${Math.min(MAX_DETAILED, articles.length)}...\n\nЦе може зайняти 30-60 секунд.`);

  const displayDate = formatDateNorwegian(date);

  // Build article summaries for LLM with scoring data
  const articleData = articles.map((a: any, i: number) => {
    const analysis = a.rss_analysis || {};
    const title = a.title_no || a.title_en || a.original_title || "";
    const description = a.description_no || a.description_en || "";
    const content = a.content_no || a.content_en || a.original_content || "";
    const linkedinScore = analysis.linkedin_score || 0;
    const relevanceScore = analysis.relevance_score || 0;
    const trendingKeywords = analysis.trending_keywords || [];

    // Trending data
    const trendingData = analysis.trending_data || {};
    const hnPosts = trendingData.hacker_news?.posts || 0;
    const hnMaxScore = trendingData.hacker_news?.max_score || 0;
    const gtMatches = trendingData.google_trends?.matches || [];
    const totalBonus = trendingData.total_bonus || 0;

    return `ARTICLE ${i + 1} [id: ${a.id}]:
Title: ${title}
Description: ${description}
Content: ${content.substring(0, 400)}
LinkedIn Score: ${linkedinScore}/10
Relevance Score: ${relevanceScore}/10
Trending Bonus: +${totalBonus}
HackerNews: ${hnPosts} posts (max score: ${hnMaxScore})
Google Trends: ${gtMatches.length > 0 ? gtMatches.join(", ") : "none"}
Trending Keywords: ${trendingKeywords.join(", ") || "none"}
Tags: ${(a.tags || []).join(", ")}`;
  }).join("\n\n---\n\n");

  const topN = Math.min(MAX_DETAILED, articles.length);
  const targetDuration = topN * 15 + 12;
  const wordTarget = Math.round(targetDuration * 2);
  const wordsPerArticle = Math.round(wordTarget / (topN + 2));

  // Single LLM call: rank + select top-N + write script
  const systemPrompt = `You are a professional news editor AND Norwegian news anchor for a daily tech news video.

TASK: From ${articles.length} articles, select the TOP ${topN} most newsworthy stories and write the voiceover script.

TARGET AUDIENCE: Business professionals, tech entrepreneurs, startup founders, AI/e-commerce/marketing specialists.
The channel "vitalii.no" covers BUSINESS & TECH news — NOT general world news.

RANKING CRITERIA (all three matter equally):
1. linkedin_score — editorial quality and professional relevance (already rated 1-10)
2. trending_data — HackerNews activity (posts/score) and Google Trends matches indicate viral potential
3. Your own analysis — business impact, innovation, relevance to tech/startup/AI/marketing audience

CONTENT FILTER (CRITICAL):
- PRIORITIZE: tech innovations, AI/ML breakthroughs, startup funding/launches, e-commerce trends, marketing strategies, SaaS products, fintech, business strategy, digital transformation, developer tools
- DEPRIORITIZE: wars, military conflicts, geopolitics, elections, crime, natural disasters, celebrity gossip, sports — even if they have high trending scores
- Exception: political/regulatory news DIRECTLY affecting tech/business (e.g., AI regulation, antitrust, data privacy laws) IS relevant
- If an article about war/politics has high scores but low business relevance, SKIP IT in favor of a lower-scoring business article

SCRIPT REQUIREMENTS:
- Target duration: ~${targetDuration} seconds
- Write SEPARATE scripts for each part in Norwegian Bokmål:
  1. "introScript" — news digest opening (~4-5s, ~${wordsPerArticle} words). MUST start with "Velkommen til dagens nyhetsdigest fra Vitalii Berbeha." then mention today's news count.
  2. "segmentScripts" — one narration per selected article (~12-18s each, ~${wordsPerArticle * 2} words). 3-5 clear sentences each.
  3. "outroScript" — closing with CTA (~4-5s). MUST include "Abonner på kanalen og trykk liker-knappen!"

LANGUAGE QUALITY:
- Clean Norwegian Bokmål (NOT Nynorsk). Avoid English loanwords when Norwegian exists.
- "kunstig intelligens" not "AI", "programvare" not "software", "nettside" not "website"
- Technical terms with no Norwegian equivalent (blockchain, API, GPU) may stay in English.
- Text will be read by TTS — write phonetically clear, natural-sounding Norwegian.
- Short, clear sentences. No complex compounds.

Also provide English translations for moderator review.

RULES:
- selectedArticleIds.length MUST equal ${topN}
- segmentScripts.length MUST equal ${topN}
- segmentTranslationsEn.length MUST equal ${topN}
- Each segmentScript stands alone (no cross-references)
- Order articles by importance (most impactful first)
- Be engaging, professional, conversational

Return JSON:
{
  "selectedArticleIds": ["uuid1", "uuid2", ...],
  "rankingReasoning": "Brief explanation of why these ${topN} were chosen and why others were excluded",
  "introScript": "Velkommen til dagens nyhetsdigest fra Vitalii Berbeha...",
  "segmentScripts": ["...", "...", ...],
  "outroScript": "Det var alt for i dag...",
  "introTranslationEn": "Welcome to today's news digest from Vitalii Berbeha...",
  "segmentTranslationsEn": ["...", "...", ...],
  "outroTranslationEn": "That's all for today..."
}`;

  let aiResponse = await callAI(systemPrompt, `Rank and write script for ${displayDate}:\n\n${articleData}`, 8000);
  let plan: any;
  try {
    plan = JSON.parse(aiResponse);
  } catch {
    // Fallback: extract JSON from markdown code blocks or mixed text
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        plan = JSON.parse(jsonMatch[0]);
        console.log("✅ Extracted JSON from mixed response");
      } catch {
        console.error(`❌ AI returned invalid JSON: ${aiResponse.substring(0, 300)}`);
        await sendMessage(TELEGRAM_CHAT_ID, `❌ <b>Помилка авто-дайджесту:</b> AI повернув невалідний JSON.\n\nСпробуйте ще раз або використайте ручний режим.`);
        return json({ error: "Invalid AI JSON response" }, 500);
      }
    } else {
      console.error(`❌ No JSON found in AI response: ${aiResponse.substring(0, 300)}`);
      await sendMessage(TELEGRAM_CHAT_ID, `❌ <b>Помилка авто-дайджесту:</b> AI повернув невалідний JSON.\n\nСпробуйте ще раз або використайте ручний режим.`);
      return json({ error: "Invalid AI JSON response" }, 500);
    }
  }

  if (!plan.selectedArticleIds || plan.selectedArticleIds.length === 0 || !plan.segmentScripts || plan.segmentScripts.length === 0) {
    console.error("❌ AI returned empty selection or scripts");
    await sendMessage(TELEGRAM_CHAT_ID, `❌ <b>Помилка:</b> AI не обрав жодної статті.`);
    return json({ error: "AI returned empty selection" }, 500);
  }

  // Validate selected IDs exist in our articles
  const articleMap = new Map(articles.map((a: any) => [a.id, a]));
  let validSelectedIds = plan.selectedArticleIds.filter((id: string) => articleMap.has(id));
  if (validSelectedIds.length === 0) {
    console.error("❌ None of the selected IDs match our articles");
    await sendMessage(TELEGRAM_CHAT_ID, `❌ <b>Помилка:</b> AI обрав невідомі ID статей.`);
    return json({ error: "Invalid article IDs from AI" }, 500);
  }

  // ── Media Pre-Check: search INTERNET for real news images per article ──
  // Priority: 1) DB images, 2) Source article scraping, 3) Google Image Search (real news images),
  // 4) Pexels fallback (stock). Article needs ≥3 images. If not enough — replace from pool.
  const MIN_IMAGES = 3;
  const GOOGLE_KEY = Deno.env.get("GOOGLE_API_KEY") || "";
  const GOOGLE_CSE_ID = Deno.env.get("GOOGLE_CSE_ID") || "";
  const PEXELS_KEY = Deno.env.get("PEXELS_API_KEY") || "";

  // Sorted remaining articles by relevance for replacements
  const selectedSet = new Set(validSelectedIds);
  const remainingIds = articles
    .map((a: any) => a.id)
    .filter((id: string) => !selectedSet.has(id));

  const searchEngines: string[] = [];
  if (GOOGLE_KEY && GOOGLE_CSE_ID) searchEngines.push("Google Images");
  if (PEXELS_KEY) searchEngines.push("Pexels (fallback)");
  await sendMessage(TELEGRAM_CHAT_ID, `🔍 <b>Пошук зображень в інтернеті...</b>\nМінімум ${MIN_IMAGES} зображень на новину.\n🔎 ${searchEngines.length > 0 ? searchEngines.join(" + ") : "Тільки source scraping (немає API ключів)"}`);

  // ── Helper: Google Custom Search Image API (finds REAL news images) ──
  // Uses combo query: "original title" + source domain + dateRestrict=d7
  async function searchGoogleImages(query: string, count = 5, sourceDomain = ""): Promise<string[]> {
    if (!GOOGLE_KEY || !GOOGLE_CSE_ID) return [];
    try {
      // Build combo query: quoted title + source domain for relevance
      let searchQ = `"${query}"`;
      if (sourceDomain) searchQ += ` ${sourceDomain}`;
      const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(searchQ)}&searchType=image&num=${Math.min(count, 10)}&imgSize=large&safe=active&dateRestrict=d7`;
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        console.log(`  ⚠️ Google Images API ${res.status}: ${await res.text().catch(() => "")}`);
        // Fallback: retry without quotes and domain (broader search)
        if (sourceDomain || query.length > 60) {
          return searchGoogleImages(query.substring(0, 60), count, "");
        }
        return [];
      }
      const data = await res.json();
      const results = (data.items || [])
        .map((item: any) => item.link)
        .filter((link: string) => link && link.startsWith("http") && /\.(jpg|jpeg|png|webp)/i.test(link))
        .slice(0, count);
      // If quoted search found nothing, retry without quotes
      if (results.length === 0 && (sourceDomain || query.includes('"'))) {
        console.log(`  🔄 No results with quotes, retrying broader...`);
        const broaderUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}&searchType=image&num=${Math.min(count, 10)}&imgSize=large&safe=active&dateRestrict=d14`;
        const res2 = await fetch(broaderUrl, { signal: AbortSignal.timeout(8000) });
        if (res2.ok) {
          const data2 = await res2.json();
          return (data2.items || [])
            .map((item: any) => item.link)
            .filter((link: string) => link && link.startsWith("http") && /\.(jpg|jpeg|png|webp)/i.test(link))
            .slice(0, count);
        }
      }
      return results;
    } catch (e: any) {
      console.log(`  ⚠️ Google Images error: ${e.message}`);
      return [];
    }
  }

  // ── Helper: search Pexels (stock fallback) ──
  async function searchPexels(query: string, count = 5): Promise<string[]> {
    if (!PEXELS_KEY) return [];
    try {
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count * 2}&orientation=landscape&size=large`;
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { Authorization: PEXELS_KEY },
      });
      clearTimeout(timeout);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.photos || [])
        .filter((p: any) => p.width > p.height)
        .slice(0, count)
        .map((p: any) => p.src?.large2x || p.src?.large || p.src?.original)
        .filter(Boolean);
    } catch { return []; }
  }

  // ── Helper: scrape source page for images ──
  async function scrapeSourceImages(sourceLink: string): Promise<string[]> {
    if (!sourceLink) return [];
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(sourceLink, {
        signal: ctrl.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)" },
        redirect: "follow",
      });
      clearTimeout(timeout);
      if (!res.ok) return [];
      const html = await res.text();
      const found: string[] = [];
      // og:image + twitter:image
      for (const m of (html.match(/(?:property|name)="(?:og:image|twitter:image)"\s+content="([^"]+)"/gi) || [])) {
        const urlMatch = m.match(/content="([^"]+)"/);
        if (urlMatch?.[1] && !found.includes(urlMatch[1])) found.push(urlMatch[1]);
      }
      // <img> tags with jpg/png/webp
      for (const m of (html.match(/<img[^>]+src="(https?:\/\/[^"]+\.(jpg|jpeg|png|webp))[^"]*"/gi) || []).slice(0, 15)) {
        const srcMatch = m.match(/src="([^"]+)"/);
        if (srcMatch?.[1] && !found.includes(srcMatch[1])) found.push(srcMatch[1]);
      }
      return found;
    } catch { return []; }
  }

  // ── Helper: collect all images for an article ──
  // Priority: DB → source page → Google Images (real) → Pexels (stock fallback)
  async function collectArticleImages(a: any): Promise<{ images: string[]; sources: string }> {
    const images: string[] = [];
    const srcInfo: string[] = [];

    // 1. DB images
    if (a.images && Array.isArray(a.images)) {
      for (const img of a.images) {
        if (img && typeof img === "string" && img.startsWith("http")) images.push(img);
      }
    }
    if (a.processed_image_url) images.push(a.processed_image_url);
    if (a.image_url && !images.includes(a.image_url)) images.push(a.image_url);
    if (images.length > 0) srcInfo.push(`DB:${images.length}`);

    // 2. Video counts as 3 images
    if (a.video_url || a.original_video_url) {
      srcInfo.push("Video:+3");
    }

    // 3. Scrape source article page
    const sourceImages = await scrapeSourceImages(a.source_link);
    for (const img of sourceImages) {
      if (!images.includes(img)) images.push(img);
    }
    if (sourceImages.length > 0) srcInfo.push(`Src:${sourceImages.length}`);

    // 4. Google Image Search — find DIVERSE images using multiple queries
    const title = a.original_title || a.title_en || a.title_no || "";
    let sourceDomain = "";
    try { if (a.source_link) sourceDomain = new URL(a.source_link).hostname.replace("www.", ""); } catch { /* */ }
    if (title && images.length < MIN_IMAGES + 2) {
      // Query 1: exact title + source (finds the article's main image)
      const googleImages1 = await searchGoogleImages(title, 2, sourceDomain);
      for (const img of googleImages1) {
        if (!images.includes(img)) images.push(img);
      }

      // Query 2: extract key entities/topics for broader visual diversity
      const tags = (a.tags || []).slice(0, 3).join(" ");
      const shortTitle = title.split(/[:.!?\-–—]/).slice(0, 2).join(" ").trim().substring(0, 40);
      if (images.length < MIN_IMAGES + 2) {
        const googleImages2 = await searchGoogleImages(`${shortTitle} ${tags}`, 3, "");
        for (const img of googleImages2) {
          if (!images.includes(img)) images.push(img);
        }
      }
      const totalGoogle = googleImages1.length + (images.length >= MIN_IMAGES + 2 ? 0 : 3);
      if (totalGoogle > 0) srcInfo.push(`Google:${totalGoogle}`);
    }

    // 5. Pexels fallback — only if still not enough after Google
    if (title && images.length < MIN_IMAGES) {
      // Use tags for Pexels to get visually diverse stock images
      const tags = (a.tags || []).slice(0, 2).join(" ");
      const pexelsQuery = tags || title.substring(0, 40);
      const pexelsImages = await searchPexels(pexelsQuery, 5);
      for (const img of pexelsImages) {
        if (!images.includes(img)) images.push(img);
      }
      if (pexelsImages.length > 0) srcInfo.push(`Pexels:${pexelsImages.length}`);
    }

    return { images, sources: srcInfo.join(" ") };
  }

  // ── Run media check for all selected articles ──
  type MediaResult = { id: string; imageCount: number; passed: boolean; title: string; images: string[]; sources: string };
  const mediaCheckResults: MediaResult[] = [];
  const finalSelectedIds: string[] = [];
  const articleImageMap: Record<string, string[]> = {}; // store found images per article

  for (const id of validSelectedIds) {
    const a = articleMap.get(id)!;
    const title = a.title_no || a.title_en || a.original_title || "";
    const { images, sources } = await collectArticleImages(a);
    const imageCount = (a.video_url || a.original_video_url) ? images.length + 3 : images.length;
    const passed = imageCount >= MIN_IMAGES;

    mediaCheckResults.push({ id, imageCount, passed, title: title.substring(0, 40), images, sources });
    articleImageMap[id] = images;

    if (passed) {
      finalSelectedIds.push(id);
      console.log(`  ✅ "${title.substring(0, 40)}" — ${imageCount} images (${sources})`);
    } else {
      console.log(`  ❌ "${title.substring(0, 40)}" — only ${imageCount} images (${sources}), need ${MIN_IMAGES}`);
    }

    // Small delay to respect Pexels rate limits
    await new Promise((r) => setTimeout(r, 300));
  }

  // ── Replace rejected articles with next from pool (also search internet) ──
  let replacementIdx = 0;
  const rejectedCount = validSelectedIds.length - finalSelectedIds.length;
  if (rejectedCount > 0 && remainingIds.length > 0) {
    console.log(`  🔄 Replacing ${rejectedCount} articles — searching internet for replacements...`);
    let replacementsNeeded = rejectedCount;

    while (replacementsNeeded > 0 && replacementIdx < remainingIds.length) {
      const replId = remainingIds[replacementIdx++];
      const replA = articleMap.get(replId)!;
      const replTitle = replA.title_no || replA.title_en || replA.original_title || "";

      // Full internet search for replacement too!
      const { images, sources } = await collectArticleImages(replA);
      const replCount = (replA.video_url || replA.original_video_url) ? images.length + 3 : images.length;

      if (replCount >= MIN_IMAGES) {
        finalSelectedIds.push(replId);
        articleImageMap[replId] = images;
        replacementsNeeded--;
        console.log(`  ✅ Replacement: "${replTitle.substring(0, 40)}" — ${replCount} images (${sources})`);
      } else {
        console.log(`  ⏭ Skip replacement "${replTitle.substring(0, 40)}" — only ${replCount} images`);
      }

      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // ── Media check report to Telegram ──
  let mediaReport = `📸 <b>Медіа-чеклист (інтернет-пошук):</b>\n\n`;
  for (const r of mediaCheckResults) {
    const icon = r.passed ? "✅" : "❌";
    mediaReport += `${icon} ${r.imageCount} зобр. (${r.sources}) — ${escapeHtml(r.title)}\n`;
  }
  if (rejectedCount > 0) {
    const replaced = finalSelectedIds.length - mediaCheckResults.filter(r => r.passed).length;
    mediaReport += `\n🔄 Відхилено ${rejectedCount}, замінено ${replaced}`;
  }
  mediaReport += `\n\n✅ <b>Фінальний пул: ${finalSelectedIds.length} новин з медіа</b>`;
  await sendMessage(TELEGRAM_CHAT_ID, mediaReport);

  // Use final selection (or original if media check somehow rejected all)
  if (finalSelectedIds.length === 0) {
    console.log(`⚠️ Media check rejected ALL articles even after internet search — using original selection`);
    await sendMessage(TELEGRAM_CHAT_ID, `⚠️ <b>Жодна новина не пройшла медіа-чек навіть після пошуку.</b>\nВикористовую оригінальний вибір.`);
  } else {
    validSelectedIds = finalSelectedIds;
  }

  // Regenerate scripts for replaced articles if needed
  if (rejectedCount > 0 && finalSelectedIds.length > 0 && finalSelectedIds.length !== mediaCheckResults.length) {
    const newScripts: string[] = [];
    const newTranslations: string[] = [];
    for (const id of validSelectedIds) {
      const origIdx = plan.selectedArticleIds.indexOf(id);
      if (origIdx >= 0 && plan.segmentScripts[origIdx]) {
        newScripts.push(plan.segmentScripts[origIdx]);
        newTranslations.push(plan.segmentTranslationsEn?.[origIdx] || "");
      } else {
        // New article needs a script — generate placeholder
        const a = articleMap.get(id)!;
        const title = a.title_no || a.title_en || a.original_title || "";
        newScripts.push(`${title}. ${(a.description_no || a.description_en || "").substring(0, 200)}`);
        newTranslations.push(a.title_en || title);
      }
    }
    plan.segmentScripts = newScripts;
    plan.segmentTranslationsEn = newTranslations;
    plan.selectedArticleIds = validSelectedIds;
  }

  // Build headlines from selected articles
  const selectedArticles = validSelectedIds.map((id: string) => articleMap.get(id));
  const headlines = selectedArticles.map((a: any) => ({
    id: a.id,
    title: a.title_no || a.title_en || a.original_title || "",
    description: a.description_no || a.description_en || "",
    hasImage: !!(a.processed_image_url || a.image_url),
    tags: a.tags || [],
    slug_en: a.slug_en || "",
  }));

  // Build web images map: articleId → array of image URLs found via internet search
  const webImagesPerArticle: Record<string, string[]> = {};
  for (const id of validSelectedIds) {
    webImagesPerArticle[id] = articleImageMap[id] || [];
  }

  // Create draft with pending_script status (skip pending_digest)
  const { data: draft, error: upsertError } = await supabase
    .from("daily_video_drafts")
    .upsert({
      target_date: date,
      status: "pending_script",
      article_ids: validSelectedIds,
      article_headlines: headlines,
      excluded_article_ids: [],
      telegram_chat_id: Number(TELEGRAM_CHAT_ID),
      intro_script: plan.introScript,
      segment_scripts: validSelectedIds.map((id: string, i: number) => ({
        articleId: id,
        scriptNo: plan.segmentScripts[i] || "",
        scriptUa: "", // We use English translations now
        scriptEn: plan.segmentTranslationsEn?.[i] || "",
        webImages: webImagesPerArticle[id] || [],
      })),
      outro_script: plan.outroScript,
      llm_provider: LLM_PROVIDER,
      youtube_privacy: youtubePrivacy || "public",
    }, { onConflict: "target_date" })
    .select()
    .single();

  if (upsertError) throw new Error(`Draft upsert: ${upsertError.message}`);

  // ── Send to Telegram: article titles + images preview (compact, no scripts) ──
  let msg = `📺 <b>Дайджест — ${displayDate}</b>\n`;
  msg += `📊 Обрано <b>${validSelectedIds.length}</b> з ${articles.length} статей\n\n`;

  for (let i = 0; i < validSelectedIds.length; i++) {
    const a = selectedArticles[i];
    const title = a?.title_no || a?.title_en || a?.original_title || `Sak ${i + 1}`;
    const imgCount = (webImagesPerArticle[validSelectedIds[i]] || []).length;
    const hasVideo = !!(a?.video_url || a?.original_video_url);
    const mediaIcon = hasVideo ? "🎥" : imgCount >= MIN_IMAGES ? "✅" : imgCount > 0 ? "⚠️" : "❌";
    msg += `${mediaIcon} <b>${i + 1}.</b> ${escapeHtml(title.substring(0, 80))}\n`;
    msg += `   📸 ${imgCount} зобр.${hasVideo ? " + відео" : ""}\n`;
  }

  msg += `\n🖼️ Зображення знайдено через: ${searchEngines.join(", ") || "source scraping"}`;

  if (msg.length > 4000) {
    const cutIdx = msg.lastIndexOf("\n", 3900);
    msg = msg.substring(0, cutIdx > 0 ? cutIdx : 3900) + "\n<i>... (скорочено)</i>";
  }

  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ Погоджую", callback_data: `dv_sok_${date}` },
        { text: "🔍 Знайти інші картинки", callback_data: `dv_rsi_${date}` },
      ],
    ],
  };

  const previewMsgId = await sendMessage(TELEGRAM_CHAT_ID, msg, { reply_markup: keyboard });

  // Save message ID
  await supabase
    .from("daily_video_drafts")
    .update({ telegram_message_ids: [previewMsgId] })
    .eq("id", draft.id);

  console.log(`✅ Auto digest: selected ${validSelectedIds.length}/${articles.length} articles, media preview sent`);
  return json({ ok: true, draftId: draft.id, selected: validSelectedIds.length, total: articles.length });
}

// ══════════════════════════════════════════════════════════════
// STEP 1.5: Toggle Article (exclude/include)
// ══════════════════════════════════════════════════════════════

async function toggleArticle(
  targetDate: string,
  articleIndex: number,
  chatId: number,
  messageId: number,
): Promise<Response> {
  console.log(`🔀 Toggle article ${articleIndex} for ${targetDate}`);

  const { data: draft, error } = await supabase
    .from("daily_video_drafts")
    .select("article_ids, article_headlines, excluded_article_ids")
    .eq("target_date", targetDate)
    .single();

  if (error || !draft) throw new Error(`Draft not found for ${targetDate}`);

  const articleIds: string[] = draft.article_ids || [];
  const headlines: any[] = draft.article_headlines || [];
  const excluded: string[] = draft.excluded_article_ids || [];

  // 1-based index
  if (articleIndex < 1 || articleIndex > articleIds.length) {
    return json({ ok: false, error: "Invalid article index" }, 400);
  }

  const articleId = articleIds[articleIndex - 1];
  const excludedSet = new Set(excluded);

  if (excludedSet.has(articleId)) {
    // Re-include
    excludedSet.delete(articleId);
  } else {
    // Exclude — but guard minimum 2 selected
    const currentSelected = articleIds.filter((id) => !excludedSet.has(id)).length;
    if (currentSelected <= 2) {
      // Answer with alert
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: "", // will be handled by webhook
          text: "⚠️ Мінімум 2 статті!",
          show_alert: true,
        }),
      }).catch(() => {});
      return json({ ok: false, error: "Minimum 2 articles required" });
    }
    excludedSet.add(articleId);
  }

  const newExcluded = Array.from(excludedSet);

  // Update DB
  await supabase
    .from("daily_video_drafts")
    .update({ excluded_article_ids: newExcluded })
    .eq("target_date", targetDate);

  // Update message
  const msg = buildDigestMessage(headlines, newExcluded, targetDate);
  const keyboard = buildDigestKeyboard(headlines, newExcluded, targetDate);

  await editMessage(chatId, messageId, msg, { reply_markup: keyboard });

  const selectedCount = articleIds.length - newExcluded.length;
  console.log(`✅ Toggled article ${articleIndex}, selected: ${selectedCount}/${articleIds.length}`);
  return json({ ok: true, selected: selectedCount, total: articleIds.length });
}

// ══════════════════════════════════════════════════════════════
// STEP 2: Generate Script
// ══════════════════════════════════════════════════════════════

async function generateScript(targetDate: string, chatId?: number, messageId?: number): Promise<Response> {
  console.log(`📝 Generating script for ${targetDate}`);

  // Update status
  await supabase
    .from("daily_video_drafts")
    .update({ status: "pending_script" })
    .eq("target_date", targetDate);

  // Notify user
  if (chatId && messageId) {
    await editMessage(chatId, messageId, `⏳ <b>Генерую сценарій озвучки...</b>\n\nЦе може зайняти 15-30 секунд.`);
  }

  // Fetch draft with article data
  const { data: draft, error } = await supabase
    .from("daily_video_drafts")
    .select("*")
    .eq("target_date", targetDate)
    .single();

  if (error || !draft) throw new Error(`Draft not found for ${targetDate}`);

  // Filter out excluded articles before script generation
  const excluded = new Set(draft.excluded_article_ids || []);
  if (excluded.size > 0) {
    const filteredIds = draft.article_ids.filter((id: string) => !excluded.has(id));
    const filteredHeadlines = (draft.article_headlines || []).filter((h: any) => !excluded.has(h.id));
    await supabase
      .from("daily_video_drafts")
      .update({
        article_ids: filteredIds,
        article_headlines: filteredHeadlines,
        excluded_article_ids: [],
      })
      .eq("target_date", targetDate);
    draft.article_ids = filteredIds;
    draft.article_headlines = filteredHeadlines;
    console.log(`🔀 Filtered ${excluded.size} excluded articles, ${filteredIds.length} remaining`);
  }

  // Fetch full articles
  const { data: articles, error: artError } = await supabase
    .from("news")
    .select("id, title_no, title_en, original_title, content_no, content_en, original_content, description_no, description_en")
    .in("id", draft.article_ids);

  if (artError || !articles || articles.length === 0) throw new Error("No articles found");

  // Order articles to match draft.article_ids
  const orderedArticles = draft.article_ids.map((id: string) =>
    articles.find((a: any) => a.id === id)
  ).filter(Boolean);

  const displayDate = formatDateNorwegian(targetDate);

  const hasOverflow = orderedArticles.length > MAX_DETAILED;
  const detailedCount = Math.min(orderedArticles.length, MAX_DETAILED);
  const overflowCount = hasOverflow ? orderedArticles.length - MAX_DETAILED : 0;

  // Build AI prompt
  const articleSummaries = orderedArticles.map((a: any, i: number) => {
    const title = a.title_no || a.title_en || a.original_title || "";
    const content = a.content_no || a.content_en || a.original_content || "";
    const marker = i >= MAX_DETAILED ? " [OVERFLOW]" : "";
    return `ARTICLE ${i + 1}${marker}:\nTitle: ${title}\nContent: ${content.substring(0, 500)}`;
  }).join("\n\n");

  const targetDuration = detailedCount * 30 + 20 + (hasOverflow ? 25 : 0);
  const wordTarget = Math.round(targetDuration * 2.5);
  const wordsPerArticle = Math.round(wordTarget / (detailedCount + 2));

  const roundupPromptBlock = hasOverflow ? `
2. "roundupScript" — quick teaser listing ALL ${orderedArticles.length} headlines (~20s). Format: "I dag dekker vi ${orderedArticles.length} nyheter. Blant annet: [topic 1], [topic 2], ..." Name each story in 3-5 words. Fast-paced cold open.
2b. "roundupTranslation" — Ukrainian translation of roundupScript` : "";

  const overflowPromptBlock = hasOverflow ? `
5. "overflowScript" — brief CTA mentioning ${overflowCount} more stories on the website (~4s).
5b. "overflowTranslation" — Ukrainian translation` : "";

  const systemPrompt = `You are a professional Norwegian news anchor writing a daily news summary video script.

The video is a compilation of ${orderedArticles.length} news stories from ${displayDate}.${hasOverflow ? ` Only the first ${detailedCount} get detailed coverage.` : ""}
Target duration: ~${targetDuration} seconds. There is NO maximum length — take the time needed for each story.

Write SEPARATE scripts for each part:
1. "introScript" — news digest opening (~8-12s, ~25-30 words). MUST start with "Velkommen til dagens nyhetsdigest fra Vitalii Berbeha. Her er de viktigste teknologinyhetene." Then mention article count (${orderedArticles.length} saker i dag).${roundupPromptBlock}
${hasOverflow ? "3" : "2"}. "segmentScripts" — one narration for each of the ${detailedCount} detailed articles (~25-35s each, ~${wordsPerArticle * 2} words each). 5-8 sentences each. Include CONTEXT: why this matters, who is affected, key numbers/facts, brief background. Make each segment substantive — the viewer should understand the story fully from the narration alone.
${hasOverflow ? "4" : "3"}. "outroScript" — closing with subscribe CTA (~4-5s, ~${wordsPerArticle} words). MUST include "Abonner på kanalen og trykk liker-knappen!"${overflowPromptBlock}
- "segmentTranslations" — Ukrainian translations of each segmentScript (for moderator review)

Write at a calm, natural pace — ikke hastverk. Use natural pauses between sentences.

LANGUAGE QUALITY:
- Write in clean Norwegian Bokmål (NOT Nynorsk). AVOID English loanwords when a Norwegian equivalent exists.
- Use "kunstig intelligens" not "AI", "programvare" not "software", "nettside" not "website", "bruker" not "user", "oppdatering" not "update", "selskap" not "company" (when contextually appropriate).
- Technical terms with no established Norwegian equivalent (like "blockchain", "API", "GPU") may remain in English.
- The text will be read aloud by TTS — write phonetically clear Norwegian that sounds natural when spoken.
- Avoid complex compound sentences. Use short, clear sentences.

RULES:
- Each segmentScript stands alone (no references to other segments)
- segmentScripts.length MUST equal ${detailedCount}
- segmentTranslations.length MUST equal ${detailedCount}
- Be engaging, professional, conversational

Return JSON:
{
  "introScript": "Velkommen til dagens nyhetsdigest fra Vitalii Berbeha...",${hasOverflow ? '\n  "roundupScript": "I dag dekker vi N nyheter...",' : ""}${hasOverflow ? '\n  "roundupTranslation": "Сьогодні ми розглянемо...",' : ""}
  "segmentScripts": ["...", ...],
  "outroScript": "Det var alt for i dag. Abonner på kanalen...",${hasOverflow ? '\n  "overflowScript": "Du finner N flere nyheter på vitalii punkt no.",' : ""}${hasOverflow ? '\n  "overflowTranslation": "Ще N новин читайте на...",' : ""}
  "segmentTranslations": ["Почнімо з...", ...],
  "introTranslation": "Привіт, я Віталій...",
  "outroTranslation": "На сьогодні все..."
}`;

  const aiResponse = await callAI(systemPrompt, `Write the script for ${displayDate}:\n\n${articleSummaries}`);
  let plan: any;
  try {
    plan = JSON.parse(aiResponse);
  } catch {
    console.error(`❌ AI returned invalid JSON: ${aiResponse.substring(0, 200)}`);
    await supabase.from("daily_video_drafts").update({ status: "failed", error_message: "AI returned invalid JSON for script" }).eq("target_date", targetDate);
    if (chatId) await sendMessage(chatId, `❌ <b>Помилка:</b> AI повернув невалідний JSON. Спробуйте перегенерувати.`);
    return json({ error: "Invalid AI JSON response" }, 500);
  }

  if (!plan.segmentScripts || plan.segmentScripts.length === 0) {
    throw new Error("AI returned no segment scripts");
  }

  // Save to draft
  await supabase
    .from("daily_video_drafts")
    .update({
      intro_script: plan.introScript,
      roundup_script: plan.roundupScript || null,
      segment_scripts: plan.segmentScripts.map((script: string, i: number) => ({
        articleId: draft.article_ids[i],
        scriptNo: script,
        scriptUa: plan.segmentTranslations?.[i] || "",
      })),
      overflow_script: plan.overflowScript || null,
      outro_script: plan.outroScript,
      status: "pending_script",
    })
    .eq("target_date", targetDate);

  // Send script to Telegram in 2 messages: Norwegian + Ukrainian
  const headlines = draft.article_headlines || [];
  const theChatId = chatId || TELEGRAM_CHAT_ID;

  // ── Message 1: Norwegian script ──
  let msgNo = `🇳🇴 <b>Сценарій озвучки — ${displayDate}</b>\n`;
  if (hasOverflow) {
    msgNo += `📋 ${orderedArticles.length} статей: ${detailedCount} детально + ${overflowCount} згадка\n`;
  }
  msgNo += "\n";

  msgNo += `🎬 <b>Intro:</b>\n<i>${escapeHtml(plan.introScript || "")}</i>\n\n`;

  if (plan.roundupScript) {
    msgNo += `📋 <b>Roundup:</b>\n<i>${escapeHtml(plan.roundupScript)}</i>\n\n`;
  }

  plan.segmentScripts.forEach((script: string, i: number) => {
    const title = headlines[i]?.title || `Sak ${i + 1}`;
    msgNo += `📰 <b>${i + 1}. ${escapeHtml(title)}</b>\n<i>${escapeHtml(script)}</i>\n\n`;
  });

  if (plan.overflowScript) {
    msgNo += `🔗 <b>Overflow:</b>\n<i>${escapeHtml(plan.overflowScript)}</i>\n\n`;
  }

  msgNo += `🎬 <b>Outro:</b>\n<i>${escapeHtml(plan.outroScript || "")}</i>`;

  // Guard: truncate at last complete segment if over Telegram limit
  if (msgNo.length > 4000) {
    const cutIdx = msgNo.lastIndexOf("\n\n", 3900);
    msgNo = msgNo.substring(0, cutIdx > 0 ? cutIdx : 3900) + "\n\n<i>... (скорочено)</i>";
  }

  await sendMessage(theChatId, msgNo);

  // ── Message 2: Ukrainian translation + approval buttons ──
  let msgUa = `🇺🇦 <b>Переклад — ${displayDate}</b>\n\n`;

  if (plan.introTranslation) {
    msgUa += `🎬 <b>Інтро:</b>\n${escapeHtml(plan.introTranslation)}\n\n`;
  }

  if (plan.roundupTranslation) {
    msgUa += `📋 <b>Огляд:</b>\n${escapeHtml(plan.roundupTranslation)}\n\n`;
  }

  plan.segmentScripts.forEach((_: string, i: number) => {
    const title = headlines[i]?.title || `Стаття ${i + 1}`;
    const ua = plan.segmentTranslations?.[i] || "";
    if (ua) {
      msgUa += `📰 <b>${i + 1}. ${escapeHtml(title)}</b>\n${escapeHtml(ua)}\n\n`;
    }
  });

  if (plan.overflowTranslation) {
    msgUa += `🔗 <b>Overflow:</b>\n${escapeHtml(plan.overflowTranslation)}\n\n`;
  }

  if (plan.outroTranslation) {
    msgUa += `🎬 <b>Аутро:</b>\n${escapeHtml(plan.outroTranslation)}\n\n`;
  }

  msgUa += `💡 <i>Щоб відредагувати — відповідай reply з виправленим текстом.</i>`;

  // Guard: truncate at last complete segment if over Telegram limit
  if (msgUa.length > 4000) {
    const cutIdx = msgUa.lastIndexOf("\n\n", 3900);
    msgUa = msgUa.substring(0, cutIdx > 0 ? cutIdx : 3900) + "\n\n<i>... (скорочено)</i>";
  }

  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ Підтвердити скрипт", callback_data: `dv_sok_${targetDate}` },
        { text: "✏️ Перегенерувати", callback_data: `dv_srg_${targetDate}` },
      ],
    ],
  };

  const scriptMsgId = await sendMessage(theChatId, msgUa, { reply_markup: keyboard });

  // Save message ID
  const existingMsgIds = draft.telegram_message_ids || [];
  await supabase
    .from("daily_video_drafts")
    .update({ telegram_message_ids: [...existingMsgIds, scriptMsgId] })
    .eq("target_date", targetDate);

  console.log(`✅ Script sent for approval`);
  return json({ ok: true, segmentCount: plan.segmentScripts.length });
}

// ══════════════════════════════════════════════════════════════
// STEP 2.5: Apply Edit (user replied with corrections)
// ══════════════════════════════════════════════════════════════

async function applyEdit(targetDate: string, editedText: string, chatId: number): Promise<Response> {
  console.log(`✏️ Applying edit for ${targetDate}`);

  // The user sends the corrected full script as a reply.
  // We replace segment_scripts with the edited content.
  // For simplicity: if the edit contains numbered segments, parse them.
  // Otherwise, treat as a general note and regenerate.

  const { data: draft, error } = await supabase
    .from("daily_video_drafts")
    .select("*")
    .eq("target_date", targetDate)
    .single();

  if (error || !draft) throw new Error(`Draft not found for ${targetDate}`);

  // Save edited text as a note and regenerate
  await sendMessage(chatId, `✅ Правки збережено! Перегенеровую скрипт з урахуванням...\n\n<i>${escapeHtml(editedText.substring(0, 200))}${editedText.length > 200 ? "..." : ""}</i>`);

  // TODO: Could parse edits more granularly. For now, regenerate with user notes as context.
  // The regeneration path (dv_srg) handles this.

  return json({ ok: true, message: "Edit noted, regenerating" });
}

// ══════════════════════════════════════════════════════════════
// STEP 3: Generate Visual Scenario
// ══════════════════════════════════════════════════════════════

async function generateScenario(targetDate: string, chatId?: number, messageId?: number): Promise<Response> {
  console.log(`🎨 Generating visual scenario for ${targetDate}`);

  // Update status
  await supabase
    .from("daily_video_drafts")
    .update({ status: "pending_scenario" })
    .eq("target_date", targetDate);

  if (chatId && messageId) {
    await editMessage(chatId, messageId, `⏳ <b>Генерую візуальний сценарій...</b>\n\nЦе може зайняти 15-30 секунд.`);
  }

  const { data: draft, error } = await supabase
    .from("daily_video_drafts")
    .select("*")
    .eq("target_date", targetDate)
    .single();

  if (error || !draft) throw new Error(`Draft not found for ${targetDate}`);

  // Restore LLM provider from draft (so scenario uses same provider as script)
  if (draft.llm_provider) LLM_PROVIDER = draft.llm_provider;
  console.log(`🤖 Scenario LLM: ${LLM_PROVIDER} (from draft)`);

  const headlines = draft.article_headlines || [];
  const scripts = draft.segment_scripts || [];
  const displayDate = formatDateNorwegian(targetDate);

  // Only generate visuals for detailed segments (max MAX_DETAILED)
  const detailedScripts = scripts.slice(0, MAX_DETAILED);
  const detailedHeadlines = headlines.slice(0, MAX_DETAILED);

  // AI generates visual scenario
  const articleInfo = detailedScripts.map((s: any, i: number) => {
    const h = detailedHeadlines[i] || {};
    return `Article ${i + 1}: "${h.title || ""}"\nScript: ${s.scriptNo || ""}\nTags: ${(h.tags || []).join(", ")}`;
  }).join("\n\n");

  const systemPrompt = `You are a professional video director creating a detailed visual scenario for a daily news show.
The show uses Remotion with these components: ShowIntro, SegmentDivider, HeadlineScene (with text reveal effects), ContentScene (image + Ken Burns + quote overlay + CategoryBadge + LowerThird), StatsScene (counters/bars/list), Outro.

For each article segment, specify ALL of these fields:
- headline: Norwegian headline (5-10 words, compelling and concise)
- summary: Short Norwegian description of the story (1-2 sentences, what the viewer will learn)
- category: tech|business|ai|startup|science|politics|crypto|health|news
- accentColor: hex color matching category mood (#FF7A00 tech, #FF8C42 startup, #FF6B35 business, #e74c3c politics, #9b59b6 ai, #2ecc71 growth, #4ecdc4 science)
- keyQuote: most impactful sentence from the script (Norwegian, shown as large overlay on screen)
- facts: optional array of {value, label, numericValue?, suffix?} for stats scene (max 3). Use numericValue for animated counters.
- mood: emotional tone that controls animation speed and intensity:
  * "urgent" — breaking news, crises → fast snappy animations, aggressive zoom
  * "energetic" — startups, launches, achievements → quick & lively
  * "positive" — good news, growth → balanced pace
  * "analytical" — research, data, reports → measured & steady
  * "serious" — politics, regulation → formal pacing
  * "contemplative" — opinion, human interest → slow & thoughtful
  * "lighthearted" — entertainment, culture → playful bounce
  * "cautionary" — warnings, risks → measured tension
- transition: how the segment ENTERS the screen:
  * "fade" — calm default
  * "wipeLeft" — forward momentum (launches, growth)
  * "wipeRight" — alternative direction
  * "slideUp" — data/stats pieces rising up
  * "zoomIn" — breaking news, urgent, dramatic reveal
  * "slideDown" — soft introduction
- textReveal: how the headline text appears:
  * "default" — word-by-word spring punch (most stories)
  * "typewriter" — character-by-character (building tension, breaking news)
  * "splitFade" — words fade up one by one (analytical, thoughtful)
  * "splitScale" — words scale in (energetic, startup news)
- statsVisualType: how stats are displayed (only if facts present):
  * "list" — simple dot + value + label
  * "counters" — animated tick-up numbers (for impressive stats like funding, users)
  * "bars" — horizontal bar chart (for comparisons, percentages)
- imageSearchQueries: array of 3-4 English search queries for finding DIVERSE stock photos on Pexels.
  CRITICAL RULES:
  1. Each query must show a DIFFERENT VISUAL ASPECT of the story — NOT variations of the same image!
  2. Think about: WHO (people involved), WHERE (location/setting), WHAT (objects/technology), IMPACT (consequences/results)
  3. Mix close-ups, wide shots, abstract concepts, and concrete objects

  BAD (all similar): ["tired woman laptop", "exhausted office worker", "stressed person computer"]
  GOOD (diverse aspects): ["brain scan neural activity", "corporate office panoramic", "coffee cup desk morning", "person walking park break"]

  BAD (all similar): ["oil rig ocean", "oil platform sea", "oil refinery"]
  GOOD (diverse aspects): ["oil tanker ship aerial", "stock market trading floor", "gas station price display", "middle east city skyline"]

  Each image in the video should tell a DIFFERENT part of the story!

VISUAL DIRECTION RULES:
- Headlines and keyQuotes in clean Norwegian Bokmål — avoid unnecessary anglicisms
- Match mood to story content (don't use "urgent" for lifestyle stories)
- Vary transitions — don't use the same one for every segment
- Use "typewriter" textReveal sparingly (1-2 per show max, for most dramatic stories)
- Use "counters" statsVisualType when there are impressive numbers (funding rounds, user counts)
- Use "bars" when comparing multiple values
- Each segment should feel visually distinct from its neighbors

Also provide a DETAILED Ukrainian description of the complete visual flow for moderator review. Describe for each segment: what the viewer sees, what animations play, what mood the scene conveys, not just the headline text.

Return JSON:
{
  "segments": [
    {
      "headline": "...",
      "summary": "...",
      "category": "...",
      "accentColor": "#...",
      "keyQuote": "...",
      "facts": [],
      "mood": "...",
      "transition": "...",
      "textReveal": "...",
      "statsVisualType": "list",
      "imageSearchQueries": ["concrete visual query 1", "concrete visual query 2"]
    }
  ],
  "scenarioDescription": "Детальний покроковий опис візуального сценарію українською з описом анімацій, настрою та ефектів кожного сегменту..."
}`;

  const aiResponse = await callAI(
    systemPrompt,
    `Create visual scenario for ${displayDate} (${detailedScripts.length} detailed articles):\n\n${articleInfo}`,
  );
  let scenario: any;
  try {
    scenario = JSON.parse(aiResponse);
  } catch {
    console.error(`❌ AI returned invalid JSON for scenario: ${aiResponse.substring(0, 200)}`);
    await supabase.from("daily_video_drafts").update({ status: "failed", error_message: "AI returned invalid JSON for scenario" }).eq("target_date", targetDate);
    const errChatId = chatId || TELEGRAM_CHAT_ID;
    await sendMessage(errChatId, `❌ <b>Помилка:</b> AI повернув невалідний JSON для сценарію. Спробуйте перегенерувати.`);
    return json({ error: "Invalid AI JSON response" }, 500);
  }

  if (!scenario.segments || scenario.segments.length === 0) {
    throw new Error("AI returned no visual segments");
  }

  // Save base scenario first
  await supabase
    .from("daily_video_drafts")
    .update({
      visual_scenario: scenario.segments,
      visual_scenario_text: scenario.scenarioDescription || "",
      status: "pending_scenario",
    })
    .eq("target_date", targetDate);

  const targetChatId = chatId || TELEGRAM_CHAT_ID;

  // ── Deep Infographic Overlay Generation (per-segment AI calls) ──
  // This is a separate step that analyzes each script individually
  // for data visualization opportunities (charts, tables, key figures).
  const enrichedSegments = await generateDataOverlays(
    scenario.segments,
    detailedScripts,
    detailedHeadlines,
    targetChatId,
  );

  // Save enriched scenario with overlays
  await supabase
    .from("daily_video_drafts")
    .update({ visual_scenario: enrichedSegments })
    .eq("target_date", targetDate);

  // Send scenario to Telegram — split into 2 messages to avoid 4096 char limit

  // Message 1: Segment details (no buttons)
  let segmentsMsg = `🎨 <b>Візуальний сценарій — ${displayDate}</b>\n\n`;

  enrichedSegments.forEach((seg: any, i: number) => {
    const catEmoji: Record<string, string> = {
      tech: "💻", business: "💼", ai: "🤖", startup: "🚀",
      science: "🔬", politics: "🏛", crypto: "₿", health: "🏥", news: "📰",
    };
    const emoji = catEmoji[seg.category] || "📰";
    segmentsMsg += `${i + 1}. ${emoji} <b>${escapeHtml(seg.headline || "")}</b>\n`;
    if (seg.summary) {
      segmentsMsg += `   📝 ${escapeHtml(seg.summary)}\n`;
    }
    segmentsMsg += `   ${seg.category} | ${seg.accentColor} | ${seg.mood || "positive"} | ${seg.transition || "fade"}\n`;
    if (seg.keyQuote) {
      segmentsMsg += `   💬 <i>"${escapeHtml(seg.keyQuote)}"</i>\n`;
    }
    if (seg.facts && seg.facts.length > 0) {
      const statsType = seg.statsVisualType ? ` [${seg.statsVisualType}]` : "";
      segmentsMsg += `   📊${statsType} ${seg.facts.map((f: any) => `${f.value} (${f.label})`).join(", ")}\n`;
    }
    // Show infographic overlays
    if (seg.dataOverlays && seg.dataOverlays.length > 0) {
      const overlayTypes: Record<string, string> = {
        keyFigure: "🔢", barChart: "📊", bulletList: "📋", miniTable: "📑", comparison: "⚖️",
      };
      const overlayDesc = seg.dataOverlays.map((o: any) => {
        const icon = overlayTypes[o.type] || "📌";
        const label = o.type === "keyFigure" ? o.data?.value : o.type === "barChart" ? `${o.data?.items?.length || 0} bars` : o.type === "bulletList" ? `${o.data?.items?.length || 0} pts` : o.type === "miniTable" ? `${o.data?.rows?.length || 0} rows` : "vs";
        return `${icon}${label}`;
      }).join(" ");
      segmentsMsg += `   🎨 Інфографіка: ${overlayDesc}\n`;
    }
    segmentsMsg += "\n";
  });

  // Trim segments message if still too long
  if (segmentsMsg.length > 4000) {
    // Cut at last complete segment (find last double newline before 4000)
    const cutIdx = segmentsMsg.lastIndexOf("\n\n", 3900);
    if (cutIdx > 0) {
      segmentsMsg = segmentsMsg.substring(0, cutIdx) + "\n\n<i>... (скорочено)</i>";
    }
  }

  await sendMessage(targetChatId, segmentsMsg);

  // Message 2: Description + approval buttons
  let descMsg = "";
  if (scenario.scenarioDescription) {
    descMsg = `📋 <b>Візуальний опис:</b>\n\n${escapeHtml(scenario.scenarioDescription)}`;
    if (descMsg.length > 3800) {
      // Cut at last paragraph before 3800
      const cutIdx = descMsg.lastIndexOf("\n", 3700);
      descMsg = descMsg.substring(0, cutIdx > 0 ? cutIdx : 3700) + "\n\n<i>... (скорочено)</i>";
    }
  } else {
    descMsg = `📋 <b>Сценарій готовий — ${scenario.segments.length} сегментів</b>`;
  }

  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ Рендерити", callback_data: `dv_ren_${targetDate}` },
        { text: "🔄 Перегенерувати", callback_data: `dv_vrg_${targetDate}` },
      ],
    ],
  };

  const scenarioMsgId = await sendMessage(targetChatId, descMsg, { reply_markup: keyboard });

  const existingMsgIds = draft.telegram_message_ids || [];
  await supabase
    .from("daily_video_drafts")
    .update({ telegram_message_ids: [...existingMsgIds, scenarioMsgId] })
    .eq("target_date", targetDate);

  console.log(`✅ Visual scenario sent for approval`);
  return json({ ok: true, segments: scenario.segments.length });
}

// ══════════════════════════════════════════════════════════════
// STEP 3a-2: Deep Infographic Overlays (per-segment AI analysis)
// ══════════════════════════════════════════════════════════════

/**
 * For each segment, make a dedicated AI call to analyze the script text
 * and generate precise infographic overlays (charts, tables, key figures).
 *
 * This produces much higher quality overlays than embedding them in the
 * main scenario prompt, because the AI can focus entirely on data extraction
 * and visualization design for one article at a time.
 */
async function generateDataOverlays(
  segments: any[],
  scripts: any[],
  headlines: any[],
  chatId?: string | number,
): Promise<any[]> {
  console.log(`📊 Generating deep infographic overlays for ${segments.length} segments...`);

  if (chatId) {
    await sendMessage(chatId, `📊 <b>Аналізую кожну новину для інфографіки...</b>\n0/${segments.length} сегментів`);
  }

  const overlaySystemPrompt = `You are a data visualization expert for a news video. Your ONLY task: analyze the narrator's script and design animated infographic overlays.

STEP-BY-STEP PROCESS:
1. Read the script word by word.
2. Find EVERY number, statistic, percentage, monetary value, comparison, list, or key fact.
3. For each found data point, decide the best visualization type.
4. Calculate WHEN in the script this data point is mentioned (as a fraction 0.0-1.0 of total text length).
5. Design the overlay data with Norwegian labels.

AVAILABLE OVERLAY TYPES:

1. "keyFigure" — ONE big animated number with label and trend arrow.
   Best for: funding amounts, percentages, counts, prices, ratings.
   Data: { "value": "€5,5M", "label": "Investering", "trend": "up", "icon": "💰" }
   trend: "up" (green arrow), "down" (red arrow), or omit.
   icon: relevant emoji (💰💶📈📉🏆⚡🔬💻🚀👥🏢📊).

2. "barChart" — Horizontal animated bar chart (2-5 items).
   Best for: market share, rankings, comparisons between entities, benchmark scores.
   Data: { "title": "Benchmark-resultater", "items": [{ "label": "KGMON", "value": 87 }, { "label": "GPT-4", "value": 72 }] }

3. "bulletList" — Animated bullet points appearing one by one.
   Best for: features, capabilities, key takeaways, steps, consequences.
   Data: { "title": "Hovedfunksjoner", "items": ["Punkt 1", "Punkt 2", "Punkt 3"] }
   Max 5 items. Each item max 6 words.

4. "miniTable" — Compact table with header row and data rows.
   Best for: structured comparisons (company+value, before+after, entity+metric).
   Data: { "headers": ["Selskap", "Beløp"], "rows": [["Tower", "€5,5M"], ["Zalaris", "2,2 mrd"]] }
   Max 2-3 columns, max 4 rows.

5. "comparison" — Side-by-side before/after or versus comparison.
   Best for: changes over time, old vs new, two competing values.
   Data: { "title": "Endring", "left": { "label": "Før", "value": "150" }, "right": { "label": "Nå", "value": "2200" } }

TIMING RULES:
- showAt: fraction (0.0-1.0) of when the overlay should appear. Calculate based on WHERE in the script text the data point is mentioned. If a number appears at word 15 of 50, showAt ≈ 0.3.
- hideAt: overlay should stay visible for 25-40% of the scene. So hideAt = showAt + 0.25 to 0.40.
- NEVER overlap two overlays. If overlay 1 ends at 0.5, overlay 2 starts at 0.5 or later.
- First overlay should start at 0.05-0.15 (not immediately).

POSITION RULES:
- "right" is default. Use "left" for variety if there are 2+ overlays in one segment.
- Alternate positions between overlays within a segment.

QUALITY RULES:
- Generate 1-4 overlays per segment depending on how data-rich the script is.
- EVERY segment MUST have at least 1 overlay. Even opinion pieces have key takeaways (use bulletList).
- All text labels in Norwegian Bokmål.
- Values should be formatted nicely: "2,2 mrd NOK" not "2200000000", "43%" not "0.43".
- For keyFigure: choose the single MOST impressive number from the segment.
- For barChart: extract real numbers from the script, don't invent data.
- For bulletList: extract actual points from the script, max 6 words each.

Return JSON:
{
  "dataOverlays": [
    { "type": "...", "showAt": 0.1, "hideAt": 0.45, "position": "right", "data": {...} }
  ],
  "reasoning": "Brief explanation of what data you found and why you chose these visualizations"
}`;

  const enrichedSegments = [...segments];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const script = scripts[i];
    const headline = headlines[i];

    // Build the script text — use Norwegian version
    const scriptText = typeof script === "string" ? script : (script?.scriptNo || script?.scriptEn || "");

    if (!scriptText) {
      console.log(`  ⚠️ Segment ${i}: no script text, skipping overlay generation`);
      enrichedSegments[i] = { ...seg, dataOverlays: [] };
      continue;
    }

    const userPrompt = `Segment ${i + 1}: "${seg.headline || headline?.title || ""}"
Category: ${seg.category || "news"}
Mood: ${seg.mood || "positive"}

NARRATOR SCRIPT (this is what the narrator reads aloud):
"""
${scriptText}
"""

Analyze this script. Find all numbers, statistics, facts, lists, and comparisons.
Design the optimal infographic overlays for this segment.`;

    try {
      const response = await callAI(overlaySystemPrompt, userPrompt, 2000);
      const parsed = JSON.parse(response);
      const overlays = parsed.dataOverlays || parsed.overlays || [];

      // Validate overlay structure
      const validOverlays = overlays.filter((o: any) =>
        o.type && o.showAt != null && o.hideAt != null && o.data &&
        ["keyFigure", "barChart", "bulletList", "miniTable", "comparison"].includes(o.type) &&
        o.showAt >= 0 && o.showAt < 1 && o.hideAt > o.showAt && o.hideAt <= 1
      );

      enrichedSegments[i] = { ...seg, dataOverlays: validOverlays };
      console.log(`  📊 Segment ${i} "${(seg.headline || "").substring(0, 30)}": ${validOverlays.length} overlays (${validOverlays.map((o: any) => o.type).join(", ")})`);
      if (parsed.reasoning) {
        console.log(`     💡 ${parsed.reasoning.substring(0, 120)}`);
      }
    } catch (err: any) {
      console.error(`  ❌ Segment ${i} overlay generation failed: ${err.message}`);
      enrichedSegments[i] = { ...seg, dataOverlays: [] };
    }

    // Small delay between API calls to stay within rate limits
    if (i < segments.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  const totalOverlays = enrichedSegments.reduce((n: number, s: any) => n + (s.dataOverlays?.length || 0), 0);
  console.log(`✅ Deep overlays complete: ${totalOverlays} overlays across ${segments.length} segments`);

  if (chatId) {
    await sendMessage(chatId, `✅ <b>Інфографіка готова:</b> ${totalOverlays} елементів для ${segments.length} сегментів`);
  }

  return enrichedSegments;
}

// ══════════════════════════════════════════════════════════════
// STEP 3b: Video Sequence Preview (before render)
// ══════════════════════════════════════════════════════════════

const CAT_EMOJI: Record<string, string> = {
  tech: "💻", business: "💼", ai: "🤖", startup: "🚀",
  science: "🔬", politics: "🏛", crypto: "₿", health: "🏥", news: "📰",
};
const MOOD_EMOJI: Record<string, string> = {
  urgent: "🔴", energetic: "⚡", positive: "🟢", analytical: "🔍",
  serious: "⚫", contemplative: "💭", lighthearted: "😊", cautionary: "⚠️",
};
const TRANSITION_EMOJI: Record<string, string> = {
  fade: "🌫", wipeLeft: "👈", wipeRight: "👉", slideUp: "⬆️",
  zoomIn: "🔎", slideDown: "⬇️",
};

// ══════════════════════════════════════════════════════════════
// STEP 2.5: Re-search images for specific article
// ══════════════════════════════════════════════════════════════

async function showResearchOptions(targetDate: string, chatId?: number, messageId?: number): Promise<Response> {
  const { data: draft, error } = await supabase
    .from("daily_video_drafts")
    .select("article_ids, article_headlines, segment_scripts")
    .eq("target_date", targetDate)
    .single();

  if (error || !draft) throw new Error(`Draft not found for ${targetDate}`);

  const targetChatId = chatId || TELEGRAM_CHAT_ID;
  const articleIds: string[] = draft.article_ids || [];
  const headlines: any[] = draft.article_headlines || [];

  if (messageId && chatId) {
    await editMessage(chatId, messageId, `🔍 <b>Оберіть новину для пошуку нових зображень:</b>`);
  }

  // Build buttons — one per article
  const buttons: any[][] = [];
  for (let i = 0; i < articleIds.length; i++) {
    const title = headlines[i]?.title || `Новина ${i + 1}`;
    const scripts: any[] = draft.segment_scripts || [];
    const imgCount = (scripts[i]?.webImages || []).length;
    buttons.push([
      { text: `${i + 1}. ${title.substring(0, 35)}… (${imgCount} 📸)`, callback_data: `dv_rsa_${i}_${targetDate}` },
    ]);
  }
  buttons.push([
    { text: "⬅️ Назад", callback_data: `dv_sok_${targetDate}` },
  ]);

  await sendMessage(targetChatId, `🔍 <b>Оберіть новину для перепошуку зображень:</b>`, {
    reply_markup: { inline_keyboard: buttons },
  });

  return json({ ok: true });
}

async function researchArticleImages(targetDate: string, articleIndex: number, chatId?: number, messageId?: number): Promise<Response> {
  console.log(`🔍 Re-searching images for article #${articleIndex} on ${targetDate}`);

  const { data: draft, error } = await supabase
    .from("daily_video_drafts")
    .select("*")
    .eq("target_date", targetDate)
    .single();

  if (error || !draft) throw new Error(`Draft not found for ${targetDate}`);

  const articleIds: string[] = draft.article_ids || [];
  if (articleIndex < 0 || articleIndex >= articleIds.length) throw new Error(`Invalid article index: ${articleIndex}`);

  const articleId = articleIds[articleIndex];
  const targetChatId = chatId || TELEGRAM_CHAT_ID;

  if (messageId && chatId) {
    await editMessage(chatId, messageId, `🔍 <b>Шукаю нові зображення для новини #${articleIndex + 1}...</b>`);
  }

  // Fetch article
  const { data: article } = await supabase
    .from("news")
    .select("id, original_title, title_en, title_no, image_url, processed_image_url, images, source_link, video_url, original_video_url")
    .eq("id", articleId)
    .single();

  if (!article) throw new Error(`Article not found: ${articleId}`);

  // Re-run Google Image Search with different query variations
  const GOOGLE_KEY = Deno.env.get("GOOGLE_API_KEY") || "";
  const GOOGLE_CSE_ID = Deno.env.get("GOOGLE_CSE_ID") || "";
  const PEXELS_KEY = Deno.env.get("PEXELS_API_KEY") || "";

  const title = article.original_title || article.title_en || article.title_no || "";
  let sourceDomain = "";
  try { if (article.source_link) sourceDomain = new URL(article.source_link).hostname.replace("www.", ""); } catch { /* */ }

  const allImages: string[] = [];

  // 1. Google with original title + domain
  if (GOOGLE_KEY && GOOGLE_CSE_ID) {
    const q1 = sourceDomain ? `"${title}" ${sourceDomain}` : `"${title}"`;
    try {
      const url1 = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(q1)}&searchType=image&num=10&imgSize=large&safe=active&dateRestrict=d14`;
      const r1 = await fetch(url1);
      if (r1.ok) {
        const d1 = await r1.json();
        for (const item of (d1.items || [])) {
          if (item.link && item.link.startsWith("http") && /\.(jpg|jpeg|png|webp)/i.test(item.link) && !allImages.includes(item.link)) {
            allImages.push(item.link);
          }
        }
      }
    } catch { /* */ }

    // 2. Google without quotes (broader)
    if (allImages.length < 5) {
      try {
        const url2 = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(title)}&searchType=image&num=10&imgSize=large&safe=active`;
        const r2 = await fetch(url2);
        if (r2.ok) {
          const d2 = await r2.json();
          for (const item of (d2.items || [])) {
            if (item.link && item.link.startsWith("http") && /\.(jpg|jpeg|png|webp)/i.test(item.link) && !allImages.includes(item.link)) {
              allImages.push(item.link);
            }
          }
        }
      } catch { /* */ }
    }
  }

  // 3. Source scraping
  if (article.source_link) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(article.source_link, {
        signal: ctrl.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)" },
        redirect: "follow",
      });
      clearTimeout(timeout);
      if (res.ok) {
        const html = await res.text();
        for (const m of (html.match(/(?:property|name)="(?:og:image|twitter:image)"\s+content="([^"]+)"/gi) || [])) {
          const urlMatch = m.match(/content="([^"]+)"/);
          if (urlMatch?.[1] && !allImages.includes(urlMatch[1])) allImages.push(urlMatch[1]);
        }
        for (const m of (html.match(/<img[^>]+src="(https?:\/\/[^"]+\.(jpg|jpeg|png|webp))[^"]*"/gi) || []).slice(0, 15)) {
          const srcMatch = m.match(/src="([^"]+)"/);
          if (srcMatch?.[1] && !allImages.includes(srcMatch[1])) allImages.push(srcMatch[1]);
        }
      }
    } catch { /* */ }
  }

  // 4. Pexels fallback
  if (PEXELS_KEY && allImages.length < 3) {
    try {
      const pUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(title)}&per_page=10&orientation=landscape&size=large`;
      const pRes = await fetch(pUrl, { headers: { Authorization: PEXELS_KEY } });
      if (pRes.ok) {
        const pData = await pRes.json();
        for (const p of (pData.photos || [])) {
          const imgUrl = p.src?.large2x || p.src?.large || p.src?.original;
          if (imgUrl && !allImages.includes(imgUrl)) allImages.push(imgUrl);
        }
      }
    } catch { /* */ }
  }

  console.log(`  🔍 Found ${allImages.length} images for article #${articleIndex + 1}`);

  // Send top images as photo album (max 5)
  const topImages = allImages.slice(0, 5);
  if (topImages.length > 0) {
    // Send as individual photos with index
    for (let j = 0; j < topImages.length; j++) {
      try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: targetChatId,
            photo: topImages[j],
            caption: j === 0 ? `🔍 Нові зображення для: <b>${escapeHtml(title.substring(0, 80))}</b>\n📸 ${j + 1}/${topImages.length}` : `📸 ${j + 1}/${topImages.length}`,
            parse_mode: "HTML",
          }),
        });
      } catch { /* skip failed image */ }
    }
  }

  // Update draft with new images
  const scripts: any[] = draft.segment_scripts || [];
  if (scripts[articleIndex]) {
    scripts[articleIndex].webImages = allImages;
  }
  await supabase
    .from("daily_video_drafts")
    .update({ segment_scripts: scripts })
    .eq("target_date", targetDate);

  // Confirmation buttons
  const confirmKeyboard = {
    inline_keyboard: [
      [
        { text: "✅ Погоджую ці зображення", callback_data: `dv_sok_${targetDate}` },
        { text: "🔍 Шукати для іншої", callback_data: `dv_rsi_${targetDate}` },
      ],
    ],
  };

  await sendMessage(targetChatId, `📸 Знайдено <b>${allImages.length}</b> зображень для новини #${articleIndex + 1}.\n\nОберіть дію:`, {
    reply_markup: confirmKeyboard,
  });

  return json({ ok: true, found: allImages.length });
}

async function prepareImages(targetDate: string, chatId?: number, messageId?: number): Promise<Response> {
  console.log(`🎬 Preparing video sequence preview for ${targetDate}`);

  const { data: draft, error } = await supabase
    .from("daily_video_drafts")
    .select("*")
    .eq("target_date", targetDate)
    .single();

  if (error || !draft) throw new Error(`Draft not found for ${targetDate}`);

  const articleIds: string[] = draft.article_ids || [];
  if (articleIds.length === 0) throw new Error("No articles in draft");

  const { data: articles } = await supabase
    .from("news")
    .select("id, original_title, title_en, title_no, image_url, processed_image_url, images, original_url, video_url, video_type, original_video_url")
    .in("id", articleIds);

  if (!articles || articles.length === 0) throw new Error("No articles found");

  const articleMap = new Map(articles.map((a: any) => [a.id, a]));
  const ordered = articleIds.map((id: string) => articleMap.get(id)).filter(Boolean);
  const scenario: any[] = draft.visual_scenario || [];
  const scripts: any[] = draft.segment_scripts || [];

  const targetChatId = chatId || TELEGRAM_CHAT_ID;

  if (messageId && chatId) {
    await editMessage(chatId, messageId, `🎬 <b>Готую превʼю відеоряду...</b>`);
  }

  await supabase
    .from("daily_video_drafts")
    .update({ status: "pending_images" })
    .eq("target_date", targetDate);

  const displayDate = new Date(targetDate + "T12:00:00Z").toLocaleDateString("uk-UA", {
    day: "numeric", month: "long",
  });

  // ── INTRO ──
  let introText = `🎬 <b>Відеоряд дайджесту — ${displayDate}</b>\n`;
  introText += `📊 ${ordered.length} сегментів`;
  if (draft.intro_script) {
    const introWords = (draft.intro_script as string).split(/\s+/).length;
    introText += ` | Intro: ~${Math.round(introWords / 2.5)}с`;
  }
  if (draft.roundup_script) {
    const roWords = (draft.roundup_script as string).split(/\s+/).length;
    introText += ` | Roundup: ~${Math.round(roWords / 2.5)}с`;
  }
  introText += `\n\n━━━ 🎥 INTRO ━━━`;
  if (draft.intro_script) {
    introText += `\n🗣️ <i>${escapeHtml((draft.intro_script as string).substring(0, 200))}...</i>`;
  }
  await sendMessage(targetChatId, introText);

  // ── EACH SEGMENT ──
  let totalEstDuration = 15; // intro ~15s
  let noImageCount = 0;

  for (let i = 0; i < ordered.length; i++) {
    const article = ordered[i] as any;
    const seg = scenario[i] || {} as any;
    const script = scripts[i] || {} as any;

    const headline = seg.headline || article.title_no || article.title_en || article.original_title || "";
    const category = seg.category || "news";
    const mood = seg.mood || "positive";
    const transition = seg.transition || "fade";
    const textReveal = seg.textReveal || "default";
    const accentColor = seg.accentColor || "#FF7A00";
    const keyQuote = seg.keyQuote || "";
    const facts: any[] = seg.facts || [];

    // Determine media source (DB images + web images from media pre-check)
    const hasVideo = !!(article.original_video_url || (article.video_url && article.video_type === "direct_url"));
    const imageUrl = article.processed_image_url || article.image_url;
    const extraImages: string[] = (article.images || []).filter((u: string) => u && u !== imageUrl);
    const webImages: string[] = (script.webImages || []).filter(Boolean);
    const allImages = [...new Set([imageUrl, ...extraImages, ...webImages].filter(Boolean))];

    let sourceHost = "";
    if (article.original_url) {
      try { sourceHost = new URL(article.original_url).hostname.replace("www.", ""); } catch { /* */ }
    }

    // Estimate segment duration from script word count
    const scriptText = script.scriptNo || script.scriptEn || "";
    const wordCount = scriptText.split(/\s+/).filter(Boolean).length;
    const estDuration = Math.max(8, Math.round(wordCount / 2.5));
    totalEstDuration += estDuration + 3.5; // + divider

    // Build caption with full visual info
    let caption = `━━━ Сегмент ${i + 1}/${ordered.length} ━━━\n`;
    caption += `${CAT_EMOJI[category] || "📰"} <b>${escapeHtml(headline.substring(0, 120))}</b>\n\n`;

    // Visual metadata line
    caption += `🎨 ${accentColor} | ${MOOD_EMOJI[mood] || ""} ${mood} | ${TRANSITION_EMOJI[transition] || ""} ${transition} | ${textReveal}\n`;

    // Media source
    if (hasVideo) {
      caption += `🎥 <b>ВІДЕО</b> (фоном, muted, Ken Burns)\n`;
    } else if (allImages.length > 0) {
      const dbCount = [imageUrl, ...extraImages].filter(Boolean).length;
      const webCount = webImages.length;
      caption += `🖼️ ${allImages.length} зображ. (DB:${dbCount} + Web:${webCount}, Ken Burns)\n`;
      if (sourceHost) {
        caption += `📸 Джерело: ${sourceHost}\n`;
      }
    } else {
      caption += `⚠️ Без зображень → Pexels stock + скрапінг\n`;
      noImageCount++;
    }

    // Key quote
    if (keyQuote) {
      caption += `💬 <i>"${escapeHtml(keyQuote.substring(0, 120))}"</i>\n`;
    }

    // Facts
    if (facts.length > 0) {
      const statsType = seg.statsVisualType || "list";
      caption += `📊 [${statsType}] ${facts.map((f: any) => `${f.value} (${f.label})`).join(" · ")}\n`;
    }

    // Duration & script preview
    caption += `⏱️ ~${estDuration}с | ${wordCount} слів`;

    // Send photo with caption, or text-only if no image
    const bestImage = allImages[0]; // DB image or first web image
    if (bestImage) {
      try {
        const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: targetChatId,
            photo: bestImage,
            caption,
            parse_mode: "HTML",
          }),
        });
        const result = await resp.json();
        if (!result.ok) {
          // Try next image if first fails
          const fallbackImg = allImages[1];
          if (fallbackImg) {
            const r2 = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: targetChatId, photo: fallbackImg, caption, parse_mode: "HTML" }),
            });
            const r2j = await r2.json();
            if (!r2j.ok) await sendMessage(targetChatId, caption);
          } else {
            await sendMessage(targetChatId, caption);
          }
        }
      } catch {
        await sendMessage(targetChatId, `${caption}\n\n⚠️ Зображення не відправлено`);
      }
    } else {
      await sendMessage(targetChatId, caption);
    }
  }

  // ── OUTRO ──
  totalEstDuration += 10; // outro ~10s

  // ── SUMMARY ──
  const summaryKeyboard = {
    inline_keyboard: [
      [
        { text: "🎬 Рендерити", callback_data: `dv_rok_${targetDate}` },
        { text: "🔄 Сценарій", callback_data: `dv_vrg_${targetDate}` },
      ],
    ],
  };

  let summary = `━━━ 📋 ПІДСУМОК ━━━\n\n`;
  summary += `📊 <b>${ordered.length} сегментів</b> · ~${Math.round(totalEstDuration / 60)}:${String(totalEstDuration % 60).padStart(2, "0")} хв\n`;

  const withVideo = ordered.filter((a: any) => !!(a as any).original_video_url || ((a as any).video_url && (a as any).video_type === "direct_url")).length;
  const withDbImage = ordered.filter((a: any) => !!(a as any).processed_image_url || !!(a as any).image_url).length;
  const withWebImage = scripts.filter((s: any) => (s.webImages || []).length > 0).length;
  const totalWithMedia = ordered.length - noImageCount;

  summary += `🎥 Відео: ${withVideo} | 🖼️ DB: ${withDbImage} | 🌐 Web: ${withWebImage} | ⚠️ Без медіа: ${noImageCount}\n`;
  summary += `✅ <b>${totalWithMedia}/${ordered.length}</b> сегментів з зображеннями\n\n`;

  summary += `<b>Під час рендеру:</b>\n`;
  summary += `1. TTS озвучка (Финн + Пернилла, NO)\n`;
  summary += `2. Web-зображення з медіа-чеку\n`;
  summary += `3. Додатковий скрапінг з оригінальних статей\n`;
  summary += `4. Remotion рендер → YouTube upload`;

  await sendMessage(targetChatId, summary, { reply_markup: summaryKeyboard });

  console.log(`✅ Video sequence preview sent: ${ordered.length} segments, ~${totalEstDuration}s`);
  return json({ ok: true, articles: ordered.length, estDuration: totalEstDuration });
}

// ══════════════════════════════════════════════════════════════
// STEP 4: Trigger Render
// ══════════════════════════════════════════════════════════════

async function triggerRender(targetDate: string, chatId?: number, messageId?: number, youtubePrivacy = "public"): Promise<Response> {
  console.log(`🚀 Triggering render for ${targetDate}`);

  const { data: draft, error } = await supabase
    .from("daily_video_drafts")
    .select("*")
    .eq("target_date", targetDate)
    .single();

  if (error || !draft) throw new Error(`Draft not found for ${targetDate}`);

  // Read settings from draft (saved during auto_digest)
  const draftPrivacy = draft.youtube_privacy || youtubePrivacy || "public";
  console.log(`🎬 YouTube privacy: ${draftPrivacy} (from draft)`);

  // Update status
  await supabase
    .from("daily_video_drafts")
    .update({ status: "rendering" })
    .eq("target_date", targetDate);

  if (chatId && messageId) {
    await editMessage(chatId, messageId, `🎬 <b>Запускаю рендеринг відео...</b>\n\nGitHub Actions зараз рендерить відео. Це займе 5-15 хвилин.\nЯ повідомлю коли буде готово! 📺`);
  }

  // Trigger GitHub Actions
  const result = await triggerDailyVideoRender({
    draftId: draft.id,
    targetDate,
    format: (draft.format || "horizontal") as "horizontal" | "vertical",
    language: draft.language || "no",
    youtubePrivacy: draftPrivacy as "public" | "unlisted" | "private",
  });

  if (!result.success) {
    await supabase
      .from("daily_video_drafts")
      .update({ status: "failed", error_message: result.error })
      .eq("target_date", targetDate);

    if (chatId) {
      await sendMessage(chatId, `❌ <b>Помилка запуску рендеру:</b>\n${escapeHtml(result.error || "Unknown error")}`);
    }

    return json({ ok: false, error: result.error });
  }

  console.log(`✅ Render triggered`);
  return json({ ok: true });
}

// ══════════════════════════════════════════════════════════════
// THUMBNAIL GENERATION + SELECTION (4 variants via Gemini)
// ══════════════════════════════════════════════════════════════

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY") || "";
const GEMINI_MODELS = ["gemini-3-pro-image-preview", "gemini-2.5-pro-image", "gemini-2.5-flash-image"];
const GEMINI_TIMEOUT = 45_000;
const TOTAL_THUMBNAIL_TIMEOUT = 120_000; // 2 min max for all variants combined

// 4 overlay styles applied on top of real article images
const THUMBNAIL_STYLES = [
  {
    id: "dark_overlay",
    name: "Темне затемнення",
    emoji: "🌑",
    prompt: `Darken the entire image to approximately 35-40% of its original brightness. Apply a smooth dark gradient overlay that is darkest on the left side (for text readability) and slightly lighter on the right. Keep the main subject of the original photo still recognizable through the overlay.`,
  },
  {
    id: "blur_glass",
    name: "Blur + Glass",
    emoji: "🔳",
    prompt: `Apply a moderate Gaussian blur to the entire image. Then add a semi-transparent frosted glass panel (dark, 70% opacity) covering the left 60% of the image where text will be placed. The right 40% should show the blurred photo more clearly. The glass panel should have a subtle border glow in orange (#FF7A00).`,
  },
  {
    id: "zoom_vignette",
    name: "Zoom + Vignette",
    emoji: "🔍",
    prompt: `Crop and zoom into the most visually interesting part of the image to fill the entire 1280x720 frame. Apply a strong vignette effect — dark corners fading to near-black at the edges. The center-right should remain the brightest area. Add a slight warm color grading shift.`,
  },
  {
    id: "split_layout",
    name: "Split Layout",
    emoji: "⬛",
    prompt: `Create a split composition: the LEFT half should be a solid dark navy (#0a1628) to dark purple (#1a0a3e) gradient (this is where text will go). The RIGHT half should show the original image, slightly darkened with a cinematic color grade. Add a bright orange (#FF7A00) diagonal line (3px wide with glow) as the divider between the two halves, angled at about 80 degrees.`,
  },
];

// ── Image helpers ──

async function downloadImageAsBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!resp.ok) return null;
    const buffer = await resp.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  } catch {
    return null;
  }
}

function getPngDimensions(data: Uint8Array): { width: number; height: number } | null {
  // PNG header: bytes 0-7 = signature, bytes 16-23 = IHDR width(4) + height(4)
  if (data.length < 24 || data[0] !== 137 || data[1] !== 80) return null;
  const width = (data[16] << 24) | (data[17] << 16) | (data[18] << 8) | data[19];
  const height = (data[20] << 24) | (data[21] << 16) | (data[22] << 8) | data[23];
  return { width, height };
}

async function resizeImage(buffer: Uint8Array, targetW: number, targetH: number): Promise<Uint8Array> {
  // Detect format
  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8;
  if (isJpeg) {
    // JPEG: can't resize in Deno Deploy without heavy deps, YouTube handles resize
    console.log(`📐 JPEG ${(buffer.length / 1024).toFixed(0)} KB — YouTube will resize to ${targetW}×${targetH}`);
    return buffer;
  }

  // PNG: check if already correct size
  const dims = getPngDimensions(buffer);
  if (!dims || (dims.width === targetW && dims.height === targetH)) return buffer;

  console.log(`🔧 Resizing PNG ${dims.width}×${dims.height} → ${targetW}×${targetH}...`);
  try {
    const UPNG = (await import("https://esm.sh/upng-js@2.1.0")).default;
    const decoded = UPNG.decode(buffer.buffer);
    const rgba = new Uint8Array(UPNG.toRGBA8(decoded)[0]);
    const srcW = decoded.width;
    const srcH = decoded.height;

    // Bilinear interpolation resize
    const dst = new Uint8Array(targetW * targetH * 4);
    const xRatio = (srcW - 1) / (targetW - 1);
    const yRatio = (srcH - 1) / (targetH - 1);

    for (let y = 0; y < targetH; y++) {
      const srcY = y * yRatio;
      const y0 = Math.floor(srcY);
      const y1 = Math.min(y0 + 1, srcH - 1);
      const yF = srcY - y0;

      for (let x = 0; x < targetW; x++) {
        const srcX = x * xRatio;
        const x0 = Math.floor(srcX);
        const x1 = Math.min(x0 + 1, srcW - 1);
        const xF = srcX - x0;

        const di = (y * targetW + x) * 4;
        for (let c = 0; c < 4; c++) {
          const tl = rgba[(y0 * srcW + x0) * 4 + c];
          const tr = rgba[(y0 * srcW + x1) * 4 + c];
          const bl = rgba[(y1 * srcW + x0) * 4 + c];
          const br = rgba[(y1 * srcW + x1) * 4 + c];
          dst[di + c] = Math.round(tl + (tr - tl) * xF + (bl + (br - bl) * xF - (tl + (tr - tl) * xF)) * yF);
        }
      }
    }

    const encoded = UPNG.encode([dst.buffer], targetW, targetH, 0);
    const result = new Uint8Array(encoded);
    console.log(`✅ Resized to ${targetW}×${targetH} (${(result.length / 1024).toFixed(0)} KB)`);
    return result;
  } catch (err: any) {
    console.warn(`⚠️ Resize failed: ${err.message}, using ${dims.width}×${dims.height}`);
    return buffer;
  }
}

async function convertToJpegViaGemini(pngBuffer: Uint8Array): Promise<Uint8Array | null> {
  try {
    let binary = "";
    for (let i = 0; i < pngBuffer.length; i++) binary += String.fromCharCode(pngBuffer[i]);
    const base64 = btoa(binary);

    const requestBody = {
      contents: [{
        parts: [
          { text: "Convert this image to JPEG format. Output the exact same image without any modifications — same content, same dimensions. Just change the format to JPEG." },
          { inline_data: { mime_type: "image/png", data: base64 } },
        ],
      }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: "16:9", imageSize: "1K" },
      },
    };

    for (const model of GEMINI_MODELS) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": GOOGLE_API_KEY },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30_000),
      });
      if (!resp.ok) continue;
      const result = await resp.json();
      const part = result.candidates?.[0]?.content?.parts?.find(
        (p: any) => (p.inline_data || p.inlineData)?.data,
      );
      const imgData = part?.inline_data || part?.inlineData;
      if (imgData?.data) {
        const bStr = atob(imgData.data);
        const bytes = new Uint8Array(bStr.length);
        for (let j = 0; j < bStr.length; j++) bytes[j] = bStr.charCodeAt(j);
        return bytes;
      }
    }
  } catch (err: any) {
    console.error(`❌ JPEG conversion error: ${err.message}`);
  }
  return null;
}

async function callGeminiImage(prompt: string, inputImageBase64?: string): Promise<Uint8Array | null> {
  const parts: any[] = [{ text: prompt }];
  if (inputImageBase64) {
    parts.push({
      inline_data: {
        mime_type: "image/jpeg",
        data: inputImageBase64,
      },
    });
  }

  const requestBody = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio: "16:9",
        imageSize: "1K",
      },
    },
  };

  for (const model of GEMINI_MODELS) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": GOOGLE_API_KEY },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        clearTimeout(timeout);
        console.error(`❌ ${model}: ${response.status}`);
        continue;
      }

      const result = await response.json();
      const candidate = result.candidates?.[0];
      if (candidate?.finishReason === "IMAGE_OTHER") {
        clearTimeout(timeout);
        continue;
      }

      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          const imageData = part.inline_data || part.inlineData;
          if (imageData?.data) {
            clearTimeout(timeout);
            const binaryStr = atob(imageData.data);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

            // Check dimensions (PNG or JPEG)
            const isPng = bytes[0] === 137 && bytes[1] === 80;
            const isJpg = bytes[0] === 0xFF && bytes[1] === 0xD8;
            if (isPng) {
              const dims = getPngDimensions(bytes);
              if (dims) console.log(`📐 PNG output: ${dims.width}×${dims.height}`);
            } else if (isJpg) {
              console.log(`📐 JPEG output (${(bytes.length / 1024).toFixed(0)} KB)`);
            }

            return bytes;
          }
        }
      }
      clearTimeout(timeout);
    } catch (err: any) {
      clearTimeout(timeout);
      console.error(`❌ ${model}: ${err.message}`);
    }
  }
  return null;
}

// Generate a punchy 2-4 word headline for thumbnail overlay via Azure OpenAI
async function generateThumbnailHeadline(articles: any[]): Promise<string> {
  if (!AZURE_ENDPOINT || !AZURE_KEY) return "";

  const headlines = articles
    .slice(0, 6)
    .map((a: any) => a.title_no || a.title_en || a.original_title || "")
    .filter(Boolean)
    .join("\n- ");

  const url = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=2024-08-01-preview`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": AZURE_KEY },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `Du er en YouTube-thumbnail-tekstforfatter for en norsk tech-nyhetskanal.

OPPGAVE: Lag EN kort, slagkraftig overskrift for thumbnail (2-4 ord).

REGLER:
- Maks 4 ord, helst 2-3
- STORE BOKSTAVER (UPPERCASE)
- Norsk bokmal
- INGEN emojier, INGEN tall, INGEN tegnsetting
- Fokuser pa den mest sjokerende/spennende nyheten
- Bruk sterke verb og folelsesord
- Skap nysgjerrighet — la noe vare usagt

GODE EKSEMPLER:
- DETTE ENDRER ALT
- AI OVERTAR NORGE
- APPLE SJOKKER ALLE
- NY TECH REVOLUSJON
- INGEN SA DETTE KOMME
- NORSK GJENNOMBRUDD
- FREMTIDEN ER HER
- MARKEDET KOLLAPSER

DARLIGE EKSEMPLER (IKKE bruk):
- 7 TECH-NYHETER (kjedelig, med tall)
- DAGLIG OPPDATERING (generisk)
- SE DETTE (vagt)

Svar med KUN overskriften, ingenting annet.`,
          },
          {
            role: "user",
            content: `Dagens nyheter:\n- ${headlines}\n\nLag thumbnail-overskrift:`,
          },
        ],
        temperature: 0.9,
        max_tokens: 30,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!resp.ok) {
      console.warn(`⚠️ Headline generation failed: ${resp.status}`);
      return "";
    }

    const data = await resp.json();
    let headline = (data.choices?.[0]?.message?.content || "").trim();
    // Clean: remove quotes, emojis, ensure uppercase
    headline = headline.replace(/["""'']/g, "").replace(/[\u{1F000}-\u{1FFFF}]/gu, "").trim().toUpperCase();
    console.log(`📝 Thumbnail headline: "${headline}"`);
    return headline;
  } catch (err: any) {
    console.warn(`⚠️ Headline generation error: ${err.message}`);
    return "";
  }
}

function buildThumbPrompt(
  headline: string,
  displayDate: string,
  articleCount: number,
  style: typeof THUMBNAIL_STYLES[0],
  hasImage: boolean,
): string {
  const imageInstruction = hasImage
    ? `Take the provided news article image and transform it into a YouTube thumbnail.

IMAGE PROCESSING:
${style.prompt}`
    : `Generate a professional YouTube thumbnail with a dark gradient background (navy #0a1628 to purple #1a0a3e).
${style.prompt}`;

  return `${imageInstruction}

OUTPUT: 16:9 landscape image.

TEXT OVERLAYS — render these EXACTLY as specified:

1. MAIN HEADLINE (dominant element, upper-left area):
"${headline}"
- Font: Impact or Montserrat ExtraBold, 160-220px height
- Color: pure white (#FFFFFF)
- Add thick black outline (3-4px stroke) AND strong drop shadow for readability
- Maximum 2 lines, left-aligned
- This is the MOST important visual element — it must DOMINATE the thumbnail

2. ARTICLE COUNT BADGE (top-right corner):
"${articleCount}" inside an orange (#FF7A00) circle or rounded square
- Number should be large and bold (80-100px)
- White text on solid orange background

3. CHANNEL BRANDING (bottom-left, subtle):
"vitalii.no" — small white text (24-28px), semi-transparent

COMPOSITION RULES:
- Text in LEFT 60% of frame, image detail visible in RIGHT 40%
- Bottom-right corner MUST be empty (YouTube duration badge zone)
- All text within center 84% safe area
- Strong visual hierarchy: headline > badge > branding
- Maximum 3 colors: dark background, orange #FF7A00 accent, white text

TEXT LANGUAGE: Norwegian Bokmal ONLY. No emojis anywhere.
OUTPUT: Image only, no text response.`;
}

async function generateThumbnails(targetDate: string, chatId?: number): Promise<Response> {
  if (!GOOGLE_API_KEY) {
    return json({ error: "GOOGLE_API_KEY not set" }, 500);
  }

  const theChatId = chatId || Number(TELEGRAM_CHAT_ID);

  // Fetch draft + articles
  const { data: draft, error: draftErr } = await supabase
    .from("daily_video_drafts")
    .select("*")
    .eq("target_date", targetDate)
    .single();

  if (draftErr || !draft) {
    await sendMessage(theChatId, `❌ Драфт не знайдено для ${targetDate}`);
    return json({ error: "Draft not found" }, 404);
  }

  // Get articles for title generation
  const articleIds = (draft.article_ids || []).filter(
    (id: string) => !(draft.excluded_article_ids || []).includes(id),
  );

  const { data: articles } = await supabase
    .from("news")
    .select("id, title_en, title_no, original_title, tags, image_url, processed_image_url")
    .in("id", articleIds);

  const ordered = articleIds.map((id: string) => articles?.find((a: any) => a.id === id)).filter(Boolean);

  const displayDate = formatDateNorwegian(targetDate);

  // Generate punchy thumbnail headline via Azure OpenAI
  let thumbnailHeadline = await generateThumbnailHeadline(ordered);
  if (!thumbnailHeadline) {
    // Fallback: use first article's title, uppercase, no emojis
    const fallbackTitle = (ordered[0]?.title_no || ordered[0]?.title_en || "TECH-NYHETER").toUpperCase();
    thumbnailHeadline = fallbackTitle.split(/\s+/).slice(0, 3).join(" ");
  }

  // Collect article images (up to 4)
  const articleImages: { url: string; title: string }[] = [];
  for (const a of ordered) {
    const imgUrl = a.processed_image_url || a.image_url;
    if (imgUrl) {
      articleImages.push({ url: imgUrl, title: a.title_no || a.title_en || "" });
      if (articleImages.length >= 4) break;
    }
  }

  const hasImages = articleImages.length > 0;
  console.log(`📸 Found ${articleImages.length} article images`);

  await sendMessage(theChatId, `🖼️ <b>Генерую 4 варіанти превью...</b>\n\n📅 ${displayDate}\n📝 ${escapeHtml(thumbnailHeadline)}\n📸 Зображень з статей: ${articleImages.length}\n\n⏳ Це може зайняти 1-2 хвилини`);

  // Download article images as base64 (parallel)
  let imageBase64List: (string | null)[] = [];
  if (hasImages) {
    console.log("📥 Downloading article images...");
    imageBase64List = await Promise.all(
      articleImages.map((img) => downloadImageAsBase64(img.url)),
    );
    const downloadedCount = imageBase64List.filter(Boolean).length;
    console.log(`✅ Downloaded ${downloadedCount}/${articleImages.length} images`);
  }

  // Assign images to 4 variants: distribute available images, cycle if fewer than 4
  const variantImages: (string | null)[] = [];
  const validImages = imageBase64List.filter(Boolean) as string[];
  for (let i = 0; i < 4; i++) {
    variantImages.push(validImages.length > 0 ? validImages[i % validImages.length] : null);
  }

  // Generate 4 variants sequentially to avoid Gemini rate limits
  const variants: { style: typeof THUMBNAIL_STYLES[0]; buffer: Uint8Array }[] = [];
  const startTime = Date.now();

  for (let i = 0; i < THUMBNAIL_STYLES.length; i++) {
    if (Date.now() - startTime > TOTAL_THUMBNAIL_TIMEOUT) {
      console.warn(`⏱️ Total timeout reached after ${variants.length} variants (${((Date.now() - startTime) / 1000).toFixed(0)}s)`);
      break;
    }

    const style = THUMBNAIL_STYLES[i];
    const img = variantImages[i];
    const imgLabel = img ? `📸 image ${(i % validImages.length) + 1}` : "🎨 text-only";
    console.log(`🎨 Variant ${i + 1}/${THUMBNAIL_STYLES.length}: ${style.name} (${imgLabel})`);

    const prompt = buildThumbPrompt(thumbnailHeadline, displayDate, ordered.length, style, !!img);
    const buffer = await callGeminiImage(prompt, img || undefined);

    if (buffer) {
      variants.push({ style, buffer });
      console.log(`✅ Variant ${i + 1}: ${(buffer.length / 1024).toFixed(0)} KB`);
    } else {
      console.warn(`⚠️ Variant ${i + 1} (${style.name}) failed, skipping`);
    }
  }

  if (variants.length === 0) {
    await sendMessage(theChatId, "❌ Не вдалось згенерувати жоден варіант превью. Спробуйте ще раз.");
    return json({ error: "All variants failed" }, 500);
  }

  // Upload variants to Supabase Storage (JPEG if > 1.5MB to stay under YouTube 2MB limit)
  const variantData: { index: number; style: string; styleName: string; url: string }[] = [];
  const MAX_SIZE = 1_500_000; // 1.5MB threshold (leave margin for YouTube's 2MB limit)

  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    let uploadBuffer = v.buffer;
    // Detect actual format from header bytes (Gemini 3 Pro returns JPEG, others return PNG)
    const isJpeg = uploadBuffer[0] === 0xFF && uploadBuffer[1] === 0xD8;
    let mimeType = isJpeg ? "image/jpeg" : "image/png";
    let ext = isJpeg ? "jpg" : "png";

    // If PNG is too large, try re-requesting as JPEG via Gemini passthrough
    if (!isJpeg && uploadBuffer.length > MAX_SIZE) {
      console.log(`📐 Variant ${i}: ${(uploadBuffer.length / 1024 / 1024).toFixed(2)} MB > 1.5MB, requesting JPEG...`);
      const jpegBuffer = await convertToJpegViaGemini(uploadBuffer);
      if (jpegBuffer && jpegBuffer.length < uploadBuffer.length) {
        uploadBuffer = jpegBuffer;
        mimeType = "image/jpeg";
        ext = "jpg";
        console.log(`✅ Compressed: ${(uploadBuffer.length / 1024).toFixed(0)} KB`);
      } else {
        console.log(`⚠️ JPEG conversion failed, keeping PNG`);
      }
    }

    const storagePath = `thumbnails/${targetDate}/variant_${i}_${v.style.id}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("daily-videos")
      .upload(storagePath, uploadBuffer, {
        contentType: mimeType,
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadErr) {
      console.error(`❌ Storage upload failed for ${v.style.id}: ${uploadErr.message}`);
      continue;
    }

    const { data: urlData } = supabase.storage.from("daily-videos").getPublicUrl(storagePath);
    variantData.push({
      index: i,
      style: v.style.id,
      styleName: v.style.name,
      url: urlData.publicUrl,
    });
  }

  // Save variants to draft
  await supabase
    .from("daily_video_drafts")
    .update({
      thumbnail_variants: variantData,
      clickbait_title: thumbnailHeadline,
    })
    .eq("target_date", targetDate);

  // Send each variant as a photo with caption
  for (const v of variantData) {
    const style = THUMBNAIL_STYLES[v.index] || THUMBNAIL_STYLES[0];
    const caption = `${style.emoji} <b>Варіант #${v.index + 1}: ${v.styleName}</b>`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: theChatId,
        photo: v.url,
        caption,
        parse_mode: "HTML",
      }),
    });
  }

  // Send selection keyboard
  const buttons = variantData.map((v) => {
    const style = THUMBNAIL_STYLES[v.index] || THUMBNAIL_STYLES[0];
    return { text: `${style.emoji} #${v.index + 1}`, callback_data: `dv_th_${v.index}_${targetDate}` };
  });

  // 2 buttons per row
  const keyboard: any[][] = [];
  for (let i = 0; i < buttons.length; i += 2) {
    keyboard.push(buttons.slice(i, i + 2));
  }
  keyboard.push([{ text: "🔄 Перегенерувати", callback_data: `dv_thr_${targetDate}` }]);

  await sendMessage(
    theChatId,
    `🖼️ <b>Оберіть превью для ${displayDate}:</b>\n\nЗгенеровано ${variantData.length} варіантів. Натисніть щоб обрати:`,
    { reply_markup: { inline_keyboard: keyboard } },
  );

  console.log(`✅ Sent ${variantData.length} thumbnail variants to Telegram`);
  return json({ ok: true, variants: variantData.length });
}

async function selectThumbnail(targetDate: string, variantIndex: number, chatId?: number, messageId?: number): Promise<Response> {
  const theChatId = chatId || Number(TELEGRAM_CHAT_ID);

  const { data: draft } = await supabase
    .from("daily_video_drafts")
    .select("thumbnail_variants, youtube_video_id")
    .eq("target_date", targetDate)
    .single();

  if (!draft?.thumbnail_variants?.length) {
    await sendMessage(theChatId, "❌ Варіанти превью не знайдено");
    return json({ error: "No variants" }, 404);
  }

  const variant = draft.thumbnail_variants[variantIndex];
  if (!variant) {
    await sendMessage(theChatId, `❌ Варіант #${variantIndex + 1} не знайдено`);
    return json({ error: "Variant not found" }, 404);
  }

  // Update message with selection
  if (messageId) {
    await editMessage(theChatId, messageId, `✅ <b>Обрано превью #${variantIndex + 1}: ${variant.styleName}</b>\n\n⏳ Встановлюю на YouTube...`);
  }

  // Save selected URL
  await supabase
    .from("daily_video_drafts")
    .update({ selected_thumbnail_url: variant.url })
    .eq("target_date", targetDate);

  // Set on YouTube if video exists
  if (draft.youtube_video_id) {
    try {
      const { getYouTubeConfig, getYouTubeAccessToken } = await import("../_shared/youtube-helpers.ts");
      const ytConfig = getYouTubeConfig();

      if (ytConfig) {
        const accessToken = await getYouTubeAccessToken(ytConfig);

        // Download the thumbnail image and ensure exact 1280×720
        const imgResp = await fetch(variant.url);
        if (!imgResp.ok) throw new Error(`Failed to download thumbnail: ${imgResp.status}`);
        let imgBuffer = await resizeImage(new Uint8Array(await imgResp.arrayBuffer()), 1280, 720);
        let contentType = variant.url.endsWith(".jpg") ? "image/jpeg" : "image/png";

        // Safety check: if still over 2MB, try JPEG conversion on the fly
        const MAX_YT_SIZE = 2 * 1024 * 1024;
        if (imgBuffer.length > MAX_YT_SIZE) {
          console.log(`📐 Image ${(imgBuffer.length / 1024 / 1024).toFixed(2)} MB > 2MB, converting to JPEG...`);
          const jpegBuffer = await convertToJpegViaGemini(imgBuffer);
          if (jpegBuffer && jpegBuffer.length < MAX_YT_SIZE) {
            imgBuffer = jpegBuffer;
            contentType = "image/jpeg";
            console.log(`✅ Compressed to ${(imgBuffer.length / 1024).toFixed(0)} KB`);
          } else {
            console.warn(`⚠️ Could not compress below 2MB (${(imgBuffer.length / 1024).toFixed(0)} KB)`);
          }
        }

        console.log(`📤 Uploading ${(imgBuffer.length / 1024).toFixed(0)} KB to YouTube...`);

        // Upload to YouTube
        const ytResp = await fetch(
          `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${draft.youtube_video_id}&uploadType=media`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": contentType,
            },
            body: imgBuffer,
          },
        );

        if (ytResp.ok) {
          console.log(`✅ YouTube thumbnail set for ${draft.youtube_video_id}`);
          if (messageId) {
            await editMessage(theChatId, messageId, `✅ <b>Превью #${variantIndex + 1} встановлено!</b>\n\n🎨 ${variant.styleName}\n📺 youtube.com/watch?v=${draft.youtube_video_id}`);
          } else {
            await sendMessage(theChatId, `✅ <b>Превью #${variantIndex + 1} встановлено!</b>\n\n🎨 ${variant.styleName}\n📺 youtube.com/watch?v=${draft.youtube_video_id}`);
          }
          return json({ ok: true, youtube_set: true });
        } else {
          const errText = await ytResp.text();
          console.error(`❌ YouTube thumbnail failed: ${errText.substring(0, 200)}`);
          throw new Error(`YouTube API: ${ytResp.status}`);
        }
      } else {
        throw new Error("YouTube credentials not configured");
      }
    } catch (err: any) {
      console.error(`❌ YouTube thumbnail error: ${err.message}`);
      const msg = `⚠️ <b>Превью #${variantIndex + 1} обрано</b>, але не вдалось встановити на YouTube:\n${escapeHtml(err.message)}\n\n🔗 URL: ${variant.url}`;
      if (messageId) {
        await editMessage(theChatId, messageId, msg);
      } else {
        await sendMessage(theChatId, msg);
      }
      return json({ ok: true, youtube_set: false, error: err.message });
    }
  } else {
    // No YouTube video yet — just save selection
    const msg = `✅ <b>Превью #${variantIndex + 1} обрано</b>\n\n🎨 ${variant.styleName}\n💾 Буде встановлено після завантаження відео на YouTube`;
    if (messageId) {
      await editMessage(theChatId, messageId, msg);
    } else {
      await sendMessage(theChatId, msg);
    }
    return json({ ok: true, youtube_set: false, reason: "no video yet" });
  }
}

// ══════════════════════════════════════════════════════════════
// SKIP
// ══════════════════════════════════════════════════════════════

async function skipDay(targetDate: string, chatId?: number, messageId?: number): Promise<Response> {
  await supabase
    .from("daily_video_drafts")
    .update({ status: "skipped" })
    .eq("target_date", targetDate);

  if (chatId && messageId) {
    await editMessage(chatId, messageId, `⏭ <b>Пропущено ${formatDateNorwegian(targetDate)}</b>\n\nВідео за цей день не буде створено.`);
  }

  return json({ ok: true });
}

// ══════════════════════════════════════════════════════════════
// NOTIFY COMPLETE (called by daily-compilation.js after render)
// ══════════════════════════════════════════════════════════════

async function notifyComplete(targetDate: string, youtubeUrl: string): Promise<Response> {
  const { data: draft } = await supabase
    .from("daily_video_drafts")
    .select("*")
    .eq("target_date", targetDate)
    .single();

  await supabase
    .from("daily_video_drafts")
    .update({
      status: "completed",
      youtube_url: youtubeUrl,
      youtube_video_id: youtubeUrl.split("v=")[1] || "",
    })
    .eq("target_date", targetDate);

  const chatId = draft?.telegram_chat_id || TELEGRAM_CHAT_ID;
  const displayDate = formatDateNorwegian(targetDate);

  await sendMessage(chatId, `🎉 <b>Відео готове!</b>\n\n📺 ${displayDate}\n🔗 ${youtubeUrl}\n\nЩоденне відео успішно опубліковано на YouTube!`, {
    disable_web_page_preview: false,
  });

  return json({ ok: true });
}

// ── Router ──

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  console.log(`📺 Daily Video Bot ${VERSION}`);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "";

    // POST body params
    let body: any = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const targetDate = body.target_date || url.searchParams.get("target_date") || "";
    const chatId = body.chat_id ? Number(body.chat_id) : undefined;
    const messageId = body.message_id ? Number(body.message_id) : undefined;
    const youtubePrivacy = body.youtube_privacy || url.searchParams.get("youtube_privacy") || "public";

    // LLM provider override: gemini, groq, or azure (default)
    const llmParam = body.llm_provider || url.searchParams.get("llm_provider") || "";
    if (llmParam === "gemini" || llmParam === "groq") LLM_PROVIDER = llmParam;
    console.log(`🤖 LLM Provider: ${LLM_PROVIDER}, YouTube: ${youtubePrivacy}`);

    switch (action || body.action) {
      case "initiate_digest":
        return await initiateDigest(targetDate || undefined);

      case "auto_digest":
        return await autoDigest(targetDate || undefined, youtubePrivacy);

      case "toggle_article":
        if (!targetDate || !body.article_index) return json({ error: "target_date and article_index required" }, 400);
        return await toggleArticle(targetDate, Number(body.article_index), chatId || Number(TELEGRAM_CHAT_ID), messageId || 0);

      case "generate_script":
        if (!targetDate) return json({ error: "target_date required" }, 400);
        return await generateScript(targetDate, chatId, messageId);

      case "regenerate_script":
        if (!targetDate) return json({ error: "target_date required" }, 400);
        return await generateScript(targetDate, chatId, messageId);

      case "apply_edit":
        if (!targetDate || !body.text) return json({ error: "target_date and text required" }, 400);
        return await applyEdit(targetDate, body.text, chatId || Number(TELEGRAM_CHAT_ID));

      case "generate_scenario":
        if (!targetDate) return json({ error: "target_date required" }, 400);
        return await generateScenario(targetDate, chatId, messageId);

      case "regenerate_scenario":
        if (!targetDate) return json({ error: "target_date required" }, 400);
        return await generateScenario(targetDate, chatId, messageId);

      case "show_research_options":
        if (!targetDate) return json({ error: "target_date required" }, 400);
        return await showResearchOptions(targetDate, chatId, messageId);

      case "research_article":
        if (!targetDate || body.article_index === undefined) return json({ error: "target_date and article_index required" }, 400);
        return await researchArticleImages(targetDate, Number(body.article_index), chatId, messageId);

      case "prepare_images":
        if (!targetDate) return json({ error: "target_date required" }, 400);
        return await prepareImages(targetDate, chatId, messageId);

      case "trigger_render":
        if (!targetDate) return json({ error: "target_date required" }, 400);
        return await triggerRender(targetDate, chatId, messageId, youtubePrivacy);

      case "skip":
        if (!targetDate) return json({ error: "target_date required" }, 400);
        return await skipDay(targetDate, chatId, messageId);

      case "notify_complete":
        if (!targetDate || !body.youtube_url) return json({ error: "target_date and youtube_url required" }, 400);
        return await notifyComplete(targetDate, body.youtube_url);

      case "generate_thumbnails":
        if (!targetDate) return json({ error: "target_date required" }, 400);
        return await generateThumbnails(targetDate, chatId);

      case "select_thumbnail":
        if (!targetDate || body.variant_index === undefined) return json({ error: "target_date and variant_index required" }, 400);
        return await selectThumbnail(targetDate, Number(body.variant_index), chatId, messageId);

      case "regenerate_thumbnails":
        if (!targetDate) return json({ error: "target_date required" }, 400);
        return await generateThumbnails(targetDate, chatId);

      default:
        return json({ error: `Unknown action: ${action || body.action}`, version: VERSION }, 400);
    }
  } catch (err: any) {
    console.error("❌ Error:", err.message);
    return json({ error: err.message }, 500);
  }
});
