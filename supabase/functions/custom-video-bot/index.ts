/**
 * Custom Video Bot — Edge Function
 *
 * Generates on-demand videos from Telegram /video command (voice or text).
 * Supports portfolio showcase and freeform topics.
 *
 * Actions:
 *   - analyze_prompt    — parse user request, detect language, match portfolio features
 *   - generate_script   — AI writes video script using portfolio data
 *   - apply_edit        — user edited script text via reply
 *   - generate_scenario — AI plans visual scenario + search images + select music
 *   - prepare_images    — send image albums to Telegram for review
 *   - trigger_render    — dispatch GitHub Actions for Remotion render
 *   - notify_complete   — send YouTube link to Telegram
 *
 * Called by: telegram-webhook (callback handlers), manual trigger
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { triggerCustomVideoRender } from "../_shared/github-actions.ts";
import { HUMANIZER_VIDEO, VOICE_SPOKEN } from "../_shared/humanizer-prompt.ts";
import { collectImages, searchSerperImages, searchPexelsImages } from "../_shared/image-search.ts";
import { findBestMusic, mapContentToMood, getLocalTrackFilename } from "../_shared/music-search.ts";

const VERSION = "2026-04-10-v1";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID")!;
const GEMINI_API_KEY = Deno.env.get("GOOGLE_API_KEY") || "";
const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY") || "";

// Profile bio context (hardcoded from translations.ts)
const PROFILE_BIO = `Vitalii Berbeha — Marketing & Analytics Expert, Creator of Elvarika.
Based in Norway. 20+ years experience. Entrepreneur who builds with code.
Tech: React, TypeScript, Next.js, Supabase, AI (Claude, Gemini, GPT), Telegram API, Deno, Remotion.
Languages: Ukrainian, English, Norwegian (fluent).
Portfolio: https://vitalii.no`;

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
    console.error(`❌ Telegram sendMessage failed: ${data.description || JSON.stringify(data)} (len=${text.length})`);
  }
  return data.result?.message_id || 0;
}

async function editMessage(
  chatId: string | number,
  messageId: number,
  text: string,
  options: { reply_markup?: any } = {},
): Promise<void> {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
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
}

async function sendMediaGroup(chatId: string | number, media: any[]): Promise<void> {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, media }),
  });
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── LLM Helper ──

async function callAI(systemPrompt: string, userPrompt: string, maxTokens = 4000): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("GOOGLE_API_KEY not configured");

  const model = "gemini-2.5-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
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
      });

      if (res.status === 429 || res.status === 503) {
        const delay = Math.pow(2, attempt) * 3000;
        console.log(`  ⏳ Rate limited (${res.status}), retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = await res.json();
      const text = (data.candidates?.[0]?.content?.parts || [])
        .map((p: any) => p.text || "")
        .join("")
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/gi, "")
        .trim();

      return text;
    } catch (e: any) {
      if (attempt === 2) throw e;
      console.log(`  ⚠️ Attempt ${attempt + 1} failed: ${e.message}`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw new Error("LLM call exhausted retries");
}

// Call AI without JSON mode (for plain text responses)
async function callAIText(systemPrompt: string, userPrompt: string, maxTokens = 4000): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("GOOGLE_API_KEY not configured");

  const model = "gemini-2.5-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts || [])
    .map((p: any) => p.text || "")
    .join("")
    .trim();
}

// ── JSON Helper ──

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── Language Detection ──

function detectLanguage(text: string): string {
  const cyrillic = (text.match(/[\u0400-\u04FF]/g) || []).length;
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  const norwegian = /[æøåÆØÅ]/.test(text);

  if (norwegian) return "no";
  if (cyrillic > latin) {
    // Distinguish Ukrainian from Russian
    const ukrSpecific = (text.match(/[іїєґІЇЄҐ]/g) || []).length;
    return ukrSpecific > 0 ? "ua" : "ua"; // Default to UA for Cyrillic
  }
  return "en";
}

// ── URL Detection ──

function extractUrls(text: string): string[] {
  // Match explicit URLs
  const urlRegex = /https?:\/\/[^\s<>"')\]]+/gi;
  const explicit = text.match(urlRegex) || [];

  // Match domain-like patterns without protocol (e.g., "vitalii.no/projects")
  const domainRegex = /(?:^|\s)((?:[a-zA-Z0-9-]+\.)+(?:no|com|org|io|dev|net|ua|eu|co|app|ai)(?:\/[^\s<>"')\]]*)?)/gi;
  const domains: string[] = [];
  let m;
  while ((m = domainRegex.exec(text)) !== null) {
    const domain = m[1].trim();
    if (!explicit.some(u => u.includes(domain))) {
      domains.push(`https://${domain}`);
    }
  }

  return [...explicit, ...domains];
}

// ── Web Page Content Scraper ──

async function scrapePageContent(url: string): Promise<{
  title: string;
  text: string;
  description: string;
  images: string[];
  success: boolean;
}> {
  console.log(`  🌐 Scraping: ${url}`);
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9,uk;q=0.8,no;q=0.7",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.log(`  ⚠️ Fetch failed: ${res.status} ${res.statusText}`);
      return { title: "", text: "", description: "", images: [], success: false };
    }

    const html = await res.text();
    console.log(`  📄 HTML size: ${(html.length / 1024).toFixed(1)}KB`);

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const ogTitle = html.match(/property="og:title"\s+content="([^"]+)"/i);
    const title = ogTitle?.[1] || titleMatch?.[1] || "";

    // Extract description
    const ogDesc = html.match(/property="og:description"\s+content="([^"]+)"/i);
    const metaDesc = html.match(/name="description"\s+content="([^"]+)"/i);
    const description = ogDesc?.[1] || metaDesc?.[1] || "";

    // Extract images
    const images: string[] = [];
    const ogImage = html.match(/property="og:image"\s+content="([^"]+)"/i);
    if (ogImage?.[1]) images.push(ogImage[1]);
    for (const imgMatch of (html.match(/<img[^>]+src="(https?:\/\/[^"]+)"/gi) || []).slice(0, 10)) {
      const src = imgMatch.match(/src="([^"]+)"/)?.[1];
      if (src && !images.includes(src)) images.push(src);
    }

    // Extract text content — strip HTML tags, scripts, styles
    let textContent = html
      // Remove scripts, styles, nav, header, footer
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<aside[\s\S]*?<\/aside>/gi, " ");

    // Try to extract from semantic containers first
    const articleMatch = textContent.match(/<(?:article|main)[^>]*>([\s\S]*?)<\/(?:article|main)>/i);
    const contentMatch = textContent.match(/<div[^>]*(?:class|id)="[^"]*(?:content|main|article|page)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

    const contentHtml = articleMatch?.[1] || contentMatch?.[1] || textContent;

    // Strip remaining HTML tags and decode entities
    const cleanText = contentHtml
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();

    // Limit to ~4000 chars for LLM context
    const text = cleanText.slice(0, 4000);

    console.log(`  ✅ Scraped: title="${title.slice(0, 60)}", text=${text.length} chars, images=${images.length}`);
    return { title, text, description, images, success: text.length > 50 };
  } catch (e: any) {
    console.log(`  ❌ Scrape error: ${e.message}`);
    return { title: "", text: "", description: "", images: [], success: false };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ACTION: analyze_prompt
// ═════════════════════════════════════════════════════════════════════════════

async function analyzePrompt(
  userPrompt: string,
  chatId: string | number,
): Promise<Response> {
  console.log(`\n📋 analyze_prompt v${VERSION}`);
  console.log(`   Prompt: "${userPrompt.slice(0, 100)}..."`);

  const language = detectLanguage(userPrompt);
  console.log(`   Detected language: ${language}`);

  // Send initial status
  const statusMsgId = await sendMessage(chatId, "🔍 Аналізую запит...");

  try {
    // 0. Detect and scrape URLs from the prompt
    const detectedUrls = extractUrls(userPrompt);
    let scrapedContent = "";
    let scrapedImages: string[] = [];
    let scrapedTitle = "";

    if (detectedUrls.length > 0) {
      await editMessage(chatId, statusMsgId, `🌐 Скрейплю ${detectedUrls.length} URL(s)...`);

      for (const url of detectedUrls.slice(0, 3)) {
        const scraped = await scrapePageContent(url);
        if (scraped.success) {
          scrapedTitle = scraped.title || scrapedTitle;
          scrapedContent += `\n\nCONTENT FROM ${url}:\nTitle: ${scraped.title}\nDescription: ${scraped.description}\n${scraped.text}`;
          scrapedImages.push(...scraped.images);
          console.log(`  ✅ Scraped ${url}: ${scraped.text.length} chars`);
        } else {
          console.log(`  ⚠️ Failed to scrape ${url}, will use Serper fallback`);
          // Serper fallback: search for this URL's content
          if (SERPER_API_KEY) {
            try {
              const sRes = await fetch("https://google.serper.dev/search", {
                method: "POST",
                headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
                body: JSON.stringify({ q: `site:${new URL(url).hostname} ${userPrompt.replace(url, "").trim()}`, num: 5 }),
              });
              if (sRes.ok) {
                const sData = await sRes.json();
                const snippets = (sData.organic || []).slice(0, 3)
                  .map((r: any) => `- ${r.title}: ${r.snippet}`)
                  .join("\n");
                if (snippets) scrapedContent += `\n\nSEARCH RESULTS FOR ${url}:\n${snippets}`;
              }
            } catch { /* skip */ }
          }
        }
      }

      await editMessage(chatId, statusMsgId, "🔍 Аналізую контент...");
    }

    // 1. Fetch portfolio features for matching
    const { data: features } = await supabase
      .from("portfolio_features")
      .select("feature_key, category, title_en, title_no, title_ua, short_description_en, short_description_no, short_description_ua, tech_stack")
      .eq("is_active", true);

    // 2. AI analysis: classify content type, match features, plan video
    const featureList = (features || []).map((f, i) =>
      `${i + 1}. [${f.feature_key}] ${f.category}: ${f[`title_${language}`] || f.title_en} — ${f[`short_description_${language}`] || f.short_description_en}`
    ).join("\n");

    const analysisPrompt = `You are a video content planner for Vitalii Berbeha's portfolio (vitalii.no).

Analyze the user's request and plan a video:

USER REQUEST: "${userPrompt}"
${scrapedContent ? `\nSCRAPED WEB CONTENT:\n${scrapedContent.slice(0, 3000)}` : ""}

AVAILABLE PORTFOLIO FEATURES:
${featureList}

Return JSON:
{
  "contentType": "portfolio" | "freeform" | "mixed",
  "topics": ["topic1", "topic2"],
  "matchedFeatureKeys": ["p01", "p05", ...],
  "videoStyle": "showcase" | "case_study" | "overview" | "explainer",
  "suggestedDuration": 60-300,
  "mood": "energetic" | "corporate" | "cinematic" | "ambient" | "electronic" | "inspiring",
  "language": "${language}",
  "briefSummary": "2-sentence description IN UKRAINIAN of what the video will cover"
}

Rules:
- ALWAYS write briefSummary in Ukrainian regardless of input language
- If user mentions portfolio features, projects, or personal work → contentType="portfolio", match feature keys
- If user asks about general topics (trends, tutorials) → contentType="freeform"
- If mixed → contentType="mixed"
- suggestedDuration: short showcase=60-90, case study=120-180, overview=180-300
- Select 3-8 most relevant features (fewer for short videos)
- If the user prompt is very short or unclear (like just a greeting), set contentType="unclear" and briefSummary explaining you need more details`;

    const analysisRaw = await callAI(analysisPrompt, `Analyze this request: ${userPrompt}`, 2000);
    const analysis = JSON.parse(analysisRaw);

    // 3. Create draft record
    const { data: draft, error: insertError } = await supabase
      .from("custom_video_drafts")
      .insert({
        user_prompt: userPrompt,
        user_chat_id: chatId,
        language: analysis.language || language,
        video_style: analysis.videoStyle || "showcase",
        content_type: scrapedContent ? "web_scrape" : (analysis.contentType || "portfolio"),
        target_duration_seconds: analysis.suggestedDuration || 90,
        relevant_features: analysis.matchedFeatureKeys || [],
        web_research: scrapedContent ? [{ urls: detectedUrls, content: scrapedContent.slice(0, 8000), images: scrapedImages }] : [],
        content_brief: analysis,
        status: "pending_script",
        telegram_message_ids: [statusMsgId],
      })
      .select()
      .single();

    if (insertError || !draft) {
      throw new Error(`DB insert failed: ${insertError?.message}`);
    }

    // 4. Handle unclear requests
    if (analysis.contentType === "unclear") {
      await editMessage(chatId, statusMsgId, [
        `⚠️ <b>Запит не зрозумілий</b>`,
        ``,
        `${escapeHtml(analysis.briefSummary || "Потрібно більше деталей.")}`,
        ``,
        `💡 Приклади запитів:`,
        `• "Зроби відео про мій проект Elvarika з vitalii.no"`,
        `• "Покажи мої AI-фічі з портфоліо"`,
        `• "Відео-огляд моїх останніх проектів"`,
      ].join("\n"));
      return json({ ok: true, unclear: true });
    }

    // 5. Send analysis to Telegram
    const langEmoji = { en: "🇬🇧", no: "🇳🇴", ua: "🇺🇦" }[analysis.language] || "🌐";
    const featureCount = (analysis.matchedFeatureKeys || []).length;
    const contentLabels: Record<string, string> = {
      portfolio: "портфоліо",
      freeform: "довільна тема",
      mixed: "портфоліо + тема",
      web_scrape: "аналіз веб-сторінки",
    };
    const contentLabel = contentLabels[analysis.contentType] || analysis.contentType;

    const styleLabels: Record<string, string> = {
      showcase: "демонстрація",
      case_study: "кейс-стаді",
      overview: "огляд",
      explainer: "пояснення",
    };
    const moodLabels: Record<string, string> = {
      energetic: "енергійний",
      corporate: "діловий",
      cinematic: "кінематографічний",
      ambient: "атмосферний",
      electronic: "електронний",
      inspiring: "надихаючий",
      serious: "серйозний",
      lighthearted: "легкий",
    };

    const briefText = [
      `📋 <b>Аналіз запиту:</b>`,
      ``,
      `<b>Тема:</b> ${escapeHtml(analysis.briefSummary || userPrompt.slice(0, 100))}`,
      `<b>Тип:</b> ${contentLabel}${featureCount > 0 ? ` (${featureCount} фіч)` : ""}`,
      `<b>Мова:</b> ${langEmoji} | <b>Тривалість:</b> ~${analysis.suggestedDuration}с | <b>Стиль:</b> ${styleLabels[analysis.videoStyle] || analysis.videoStyle}`,
      `<b>Настрій:</b> ${moodLabels[analysis.mood] || analysis.mood}`,
    ].join("\n");

    const draftId = draft.id;

    await editMessage(chatId, statusMsgId, briefText, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Генерувати скрипт", callback_data: `cv_sok_${draftId}` },
          ],
          [
            { text: "⏱ Тривалість", callback_data: `cv_dur_${draftId}` },
            { text: "📐 Формат", callback_data: `cv_fmt_${draftId}` },
          ],
          [
            { text: "❌ Скасувати", callback_data: `cv_skip_${draftId}` },
          ],
        ],
      },
    });

    return json({ ok: true, draftId, analysis });
  } catch (e: any) {
    console.error(`❌ analyze_prompt error: ${e.message}`);
    await editMessage(chatId, statusMsgId, `❌ Помилка аналізу: ${escapeHtml(e.message)}`);
    return json({ error: e.message }, 500);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ACTION: generate_script
// ═════════════════════════════════════════════════════════════════════════════

async function generateScript(
  draftId: string,
  chatId: string | number,
): Promise<Response> {
  console.log(`\n📝 generate_script v${VERSION}`);
  console.log(`   Draft: ${draftId}`);

  const statusMsgId = await sendMessage(chatId, "✍️ Генерую сценарій відео...");

  try {
    // 1. Load draft
    const { data: draft } = await supabase
      .from("custom_video_drafts")
      .select("*")
      .eq("id", draftId)
      .single();

    if (!draft) throw new Error("Draft not found");

    // 2. Load portfolio features if needed
    let featureContent = "";
    if (draft.content_type !== "freeform" && draft.relevant_features?.length > 0) {
      const { data: features } = await supabase
        .from("portfolio_features")
        .select("*")
        .in("feature_key", draft.relevant_features)
        .eq("is_active", true);

      if (features && features.length > 0) {
        const lang = draft.language || "en";
        featureContent = features.map((f, i) => {
          const title = f[`title_${lang}`] || f.title_en;
          const problem = f[`problem_${lang}`] || f.problem_en;
          const solution = f[`solution_${lang}`] || f.solution_en;
          const result = f[`result_${lang}`] || f.result_en;
          return `FEATURE ${i + 1}: ${title}\n  Problem: ${problem}\n  Solution: ${solution}\n  Result: ${result}\n  Tech: ${(f.tech_stack || []).join(", ")}`;
        }).join("\n\n");
      }
    }

    // 3. Web research — scraped content from URLs or Serper search
    let webContext = "";

    // 3a. Use pre-scraped content from analyze_prompt step
    const webResearch = draft.web_research || [];
    if (webResearch.length > 0 && webResearch[0]?.content) {
      webContext = `\n\nSCRAPED WEB CONTENT:\n${webResearch[0].content.slice(0, 4000)}`;
      console.log(`  📄 Using scraped content: ${webResearch[0].content.length} chars`);
    }

    // 3b. Serper fallback for freeform topics without scraped content
    if (!webContext && (draft.content_type === "freeform" || draft.content_type === "mixed")) {
      const topics = draft.content_brief?.topics || [draft.user_prompt];
      const searchResults: string[] = [];

      for (const topic of topics.slice(0, 3)) {
        try {
          if (!SERPER_API_KEY) continue;
          const res = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ q: topic, num: 5 }),
          });
          if (res.ok) {
            const data = await res.json();
            const snippets = (data.organic || []).slice(0, 3)
              .map((r: any) => `- ${r.title}: ${r.snippet}`)
              .join("\n");
            if (snippets) searchResults.push(`TOPIC "${topic}":\n${snippets}`);
          }
        } catch { /* skip */ }
      }

      if (searchResults.length > 0) {
        webContext = `\n\nWEB RESEARCH:\n${searchResults.join("\n\n")}`;
      }
    }

    // 4. Generate script via AI
    const duration = draft.target_duration_seconds || 90;
    const wordsTotal = Math.round(duration * 2.5); // ~2.5 words/sec for spoken audio
    const segmentCount = Math.min(Math.max(Math.round(duration / 20), 2), 8);
    const wordsPerSegment = Math.round(wordsTotal / (segmentCount + 2)); // +2 for intro/outro

    const langName = { en: "English", no: "Norwegian Bokmål", ua: "Ukrainian" }[draft.language] || "English";

    const scriptPrompt = `You are a professional video scriptwriter writing for Vitalii Berbeha's video channel.
This script will be read by a Ukrainian TTS engine that CANNOT pronounce English words correctly.

PRESENTER: ${PROFILE_BIO}

VIDEO REQUEST: "${draft.user_prompt}"
LANGUAGE: ${langName}
DURATION: ~${duration} seconds
SEGMENTS: ${segmentCount} content segments + intro + outro
WORDS PER SEGMENT: ~${wordsPerSegment} words
STYLE: ${draft.video_style}

${featureContent ? `PORTFOLIO FEATURES TO COVER:\n${featureContent}` : ""}
${webContext}

${HUMANIZER_VIDEO}
${VOICE_SPOKEN}

Write a video script in ${langName}. Return ONLY valid JSON:
{
  "intro": "Opening text (2-3 sentences, ~${wordsPerSegment} words)",
  "segments": [
    {
      "topic": "Short topic title in Ukrainian",
      "text": "Segment narration (~${wordsPerSegment} words)",
      "featureKey": "p01 or null if freeform"
    }
  ],
  "outro": "Closing call-to-action (~${wordsPerSegment} words, mention vitalii.no)",
  "youtubeTitle": "Catchy title under 80 chars in Ukrainian",
  "youtubeDescription": "3-sentence description with vitalii.no link",
  "youtubeTags": ["tag1", "tag2", "tag3"]
}

CRITICAL TTS RULES (Ukrainian voice engine):
- ALL English tech terms MUST be transliterated to Ukrainian phonetics:
  React → Ріект, TypeScript → Тайпскріпт, Next.js → Некст Джей Ес,
  Supabase → Супабейс, Remotion → Ремоушн, Azure → Ажур,
  Gemini → Джеміні, LinkedIn → Лінкедін, Instagram → Інстаграм,
  Edge Functions → Едж Фанкшнз, API → АПІ, AI → ЕйАй,
  RSS → Ер Ес Ес, TTS → Ті Ті Ес, LLM → Ел Ел Ем,
  YouTube → Ютюб, Telegram → Телеграм, GitHub → Гітхаб,
  Pexels → Пексельз, Deno → Діно, Node.js → Ноуд Джей Ес
- ANY English word not in the list above — transliterate it phonetically to Cyrillic
- NEVER leave English words in Latin script in the text field

SCRIPT STRUCTURE RULES:
- Write for the EAR (spoken audio), not the eye
- Keep sentences SHORT (max 12 words)
- Each segment MUST have a complete thought with proper conclusion
- NEVER end a segment mid-sentence or mid-thought
- Last sentence of each segment should feel like a natural pause point
- First person: "Я створив", "моя система", "ми досягли"
- NO AI-speak: no "delve", "landscape", "groundbreaking", "testament"
- Each segment = one clear topic with beginning-middle-END
- Segment transitions should flow naturally: end of segment N should connect to start of segment N+1
- Intro greets: "Привіт, я Віталій..."
- Outro: subscribe CTA + mention "віталій крапка но" (vitalii.no spoken)`;

    const scriptRaw = await callAI(scriptPrompt, `Generate script for: ${draft.user_prompt}`, 8000);
    const script = JSON.parse(scriptRaw);

    // 5. Validate
    if (!script.intro || !script.segments || script.segments.length === 0) {
      throw new Error("AI returned incomplete script");
    }

    // 6. Update draft
    await supabase
      .from("custom_video_drafts")
      .update({
        intro_script: script.intro,
        segment_scripts: script.segments,
        outro_script: script.outro,
        youtube_title: script.youtubeTitle,
        youtube_description: script.youtubeDescription,
        youtube_tags: script.youtubeTags || [],
        status: "pending_scenario",
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftId);

    // 7. Send script preview to Telegram
    const segmentsText = script.segments.map((s: any, i: number) =>
      `<b>${i + 1}. ${escapeHtml(s.topic)}</b>\n${escapeHtml(s.text)}`
    ).join("\n\n");

    const scriptPreview = [
      `📝 <b>Сценарій відео</b> (${script.segments.length} сегментів, ~${duration}с)`,
      ``,
      `<b>🎬 Інтро:</b>`,
      escapeHtml(script.intro),
      ``,
      segmentsText,
      ``,
      `<b>🔚 Аутро:</b>`,
      escapeHtml(script.outro),
      ``,
      `🎥 <b>YouTube:</b> ${escapeHtml(script.youtubeTitle || "")}`,
    ].join("\n");

    // Truncate if over Telegram limit
    const maxLen = 4000;
    const finalText = scriptPreview.length > maxLen
      ? scriptPreview.slice(0, maxLen - 20) + "\n\n[...]"
      : scriptPreview;

    await editMessage(chatId, statusMsgId, finalText, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Затвердити", callback_data: `cv_ren_${draftId}` },
            { text: "🔄 Перегенерувати", callback_data: `cv_srg_${draftId}` },
          ],
          [
            { text: "❌ Скасувати", callback_data: `cv_skip_${draftId}` },
          ],
        ],
      },
    });

    // Note about editing
    await sendMessage(chatId, `💡 Для правок — відповідайте на повідомлення зі скриптом\n<code>cv_edit_${draftId}</code>`, {
      disable_web_page_preview: true,
    });

    return json({ ok: true, draftId, segmentCount: script.segments.length });
  } catch (e: any) {
    console.error(`❌ generate_script error: ${e.message}`);
    await editMessage(chatId, statusMsgId, `❌ Помилка генерації скрипту: ${escapeHtml(e.message)}`);

    await supabase
      .from("custom_video_drafts")
      .update({ error_message: e.message, status: "failed" })
      .eq("id", draftId);

    return json({ error: e.message }, 500);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ACTION: apply_edit
// ═════════════════════════════════════════════════════════════════════════════

async function applyEdit(
  draftId: string,
  editedText: string,
  chatId: string | number,
): Promise<Response> {
  console.log(`\n✏️ apply_edit v${VERSION}`);

  try {
    // Save edit as a note and regenerate
    const { data: draft } = await supabase
      .from("custom_video_drafts")
      .select("user_prompt, segment_scripts")
      .eq("id", draftId)
      .single();

    if (!draft) throw new Error("Draft not found");

    // Append edit instruction to user prompt for regeneration
    await supabase
      .from("custom_video_drafts")
      .update({
        user_prompt: `${draft.user_prompt}\n\nEDIT REQUEST: ${editedText}`,
        status: "pending_script",
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftId);

    await sendMessage(chatId, "✅ Правки збережені. Перегенеровую скрипт...");

    // Regenerate
    return await generateScript(draftId, chatId);
  } catch (e: any) {
    console.error(`❌ apply_edit error: ${e.message}`);
    await sendMessage(chatId, `❌ Помилка: ${escapeHtml(e.message)}`);
    return json({ error: e.message }, 500);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ACTION: generate_scenario
// ═════════════════════════════════════════════════════════════════════════════

async function generateScenario(
  draftId: string,
  chatId: string | number,
): Promise<Response> {
  console.log(`\n🎨 generate_scenario v${VERSION}`);

  const statusMsgId = await sendMessage(chatId, "🎨 Створюю візуальний сценарій + шукаю зображення та музику...");

  try {
    // 1. Load draft
    const { data: draft } = await supabase
      .from("custom_video_drafts")
      .select("*")
      .eq("id", draftId)
      .single();

    if (!draft) throw new Error("Draft not found");

    const segments = draft.segment_scripts || [];

    // 2. AI visual scenario planning
    const scenarioPrompt = `You are a video visual director. Plan the visual composition for each segment of a custom video.

VIDEO: ${draft.youtube_title || draft.user_prompt}
STYLE: ${draft.video_style}
LANGUAGE: ${draft.language}

SEGMENTS:
${segments.map((s: any, i: number) => `${i + 1}. [${s.topic}]: ${s.text?.slice(0, 150)}...`).join("\n")}

For each segment, return JSON:
{
  "segments": [
    {
      "headline": "5-10 word punchy title",
      "category": "tech|business|ai|startup|portfolio|science|news",
      "accentColor": "#hex (category-appropriate)",
      "keyQuote": "Most impactful sentence from script",
      "mood": "energetic|corporate|cinematic|ambient|electronic|inspiring|serious|lighthearted",
      "transition": "fade|wipeLeft|wipeRight|slideUp|zoomIn",
      "textReveal": "default|typewriter|splitFade|splitScale",
      "imageSearchQueries": ["specific search query 1", "query 2", "query 3"],
      "facts": [{"value": "70%", "label": "spam filtered"}]
    }
  ]
}

RULES for imageSearchQueries:
- Use REAL names: "Supabase Edge Functions dashboard", "Remotion video rendering", "Next.js 15 app router"
- Each query = different visual aspect
- 3-4 queries per segment
- NO generic stock phrases`;

    const scenarioRaw = await callAI(scenarioPrompt, "Plan the visual scenario", 6000);
    const scenario = JSON.parse(scenarioRaw);

    // 3. Search images for each segment (parallel)
    // Include pre-scraped images from URLs
    const webResearchImages: string[] = [];
    if (draft.web_research?.length > 0 && draft.web_research[0]?.images) {
      webResearchImages.push(...draft.web_research[0].images);
      console.log(`  🖼 ${webResearchImages.length} images from scraped URLs`);
    }

    const imageSourcesMap: Record<string, string[]> = {};
    const imagePromises = (scenario.segments || []).map(async (seg: any, idx: number) => {
      const queries = seg.imageSearchQueries || [];
      const allImages: string[] = [];

      // Add scraped images first (distribute across segments)
      const scrapedForSegment = webResearchImages.slice(
        Math.floor(idx * webResearchImages.length / segments.length),
        Math.floor((idx + 1) * webResearchImages.length / segments.length),
      );
      allImages.push(...scrapedForSegment);

      // Search via Serper for each query
      for (const q of queries.slice(0, 3)) {
        const imgs = await searchSerperImages(q, 3);
        for (const img of imgs) {
          if (!allImages.includes(img)) allImages.push(img);
        }
        await new Promise(r => setTimeout(r, 300)); // Rate limit
      }

      // Pexels fallback if not enough
      if (allImages.length < 4) {
        const topic = segments[idx]?.topic || seg.headline || "";
        const pexels = await searchPexelsImages(topic, 4 - allImages.length);
        for (const img of pexels) {
          if (!allImages.includes(img)) allImages.push(img);
        }
      }

      imageSourcesMap[String(idx)] = allImages;
      console.log(`   Segment ${idx + 1}: ${allImages.length} images found`);
    });

    await Promise.all(imagePromises);

    // 4. Search background music
    const mood = draft.content_brief?.mood || mapContentToMood(
      draft.content_type || "portfolio",
      draft.video_style || "showcase",
    );
    const { track, localFile } = await findBestMusic(mood, draft.target_duration_seconds || 90);

    // 5. Update draft
    await supabase
      .from("custom_video_drafts")
      .update({
        visual_scenario: scenario,
        image_sources: imageSourcesMap,
        bgm_url: track.source === "pixabay" ? track.url : "",
        bgm_mood: mood,
        bgm_local_file: localFile || getLocalTrackFilename(mood),
        status: "pending_images",
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftId);

    // 6. Send scenario summary + image previews to Telegram
    const scenarioSummary = (scenario.segments || []).map((seg: any, i: number) => {
      const imgCount = (imageSourcesMap[String(i)] || []).length;
      return `${i + 1}. <b>${escapeHtml(seg.headline || "")}</b>\n   ${seg.category} | ${seg.mood} | 🖼 ${imgCount} images`;
    }).join("\n");

    const musicInfo = track.source === "pixabay"
      ? `🎵 Музика: ${escapeHtml(track.title)} (${track.duration}с, Pixabay)`
      : `🎵 Музика: ${localFile || "local fallback"}`;

    await editMessage(chatId, statusMsgId, [
      `🎨 <b>Візуальний сценарій:</b>`,
      ``,
      scenarioSummary,
      ``,
      musicInfo,
      ``,
      `Загалом: ${Object.values(imageSourcesMap).flat().length} зображень`,
    ].join("\n"), {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🖼 Переглянути зображення", callback_data: `cv_img_${draftId}` },
          ],
          [
            { text: "✅ Рендерити відразу", callback_data: `cv_rok_${draftId}` },
            { text: "🔄 Перегенерувати", callback_data: `cv_vrg_${draftId}` },
          ],
          [
            { text: "❌ Скасувати", callback_data: `cv_skip_${draftId}` },
          ],
        ],
      },
    });

    return json({ ok: true, draftId, imageCount: Object.values(imageSourcesMap).flat().length });
  } catch (e: any) {
    console.error(`❌ generate_scenario error: ${e.message}`);
    await editMessage(chatId, statusMsgId, `❌ Помилка сценарію: ${escapeHtml(e.message)}`);

    await supabase
      .from("custom_video_drafts")
      .update({ error_message: e.message, status: "failed" })
      .eq("id", draftId);

    return json({ error: e.message }, 500);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ACTION: prepare_images
// ═════════════════════════════════════════════════════════════════════════════

async function prepareImages(
  draftId: string,
  chatId: string | number,
): Promise<Response> {
  console.log(`\n🖼 prepare_images v${VERSION}`);

  try {
    const { data: draft } = await supabase
      .from("custom_video_drafts")
      .select("*")
      .eq("id", draftId)
      .single();

    if (!draft) throw new Error("Draft not found");

    const segments = draft.segment_scripts || [];
    const scenario = draft.visual_scenario?.segments || [];
    const imageSources = draft.image_sources || {};

    // Send image albums per segment
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const vis = scenario[i] || {};
      const imgs = (imageSources[String(i)] || []).slice(0, 10); // Telegram max 10 per group

      if (imgs.length === 0) {
        await sendMessage(chatId, `🖼 Сегмент ${i + 1}: <b>${escapeHtml(seg.topic || "")}</b>\n⚠️ Зображень не знайдено`);
        continue;
      }

      // Send media group
      const media = imgs.slice(0, 10).map((url: string, j: number) => ({
        type: "photo",
        media: url,
        ...(j === 0 ? {
          caption: `🖼 Сегмент ${i + 1}: ${seg.topic || ""}\n${vis.category || ""} | ${vis.mood || ""} | ${vis.accentColor || ""}`,
          parse_mode: "HTML",
        } : {}),
      }));

      try {
        await sendMediaGroup(chatId, media);
      } catch {
        // Fallback: send individually
        for (const m of media.slice(0, 4)) {
          try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                photo: m.media,
                caption: m.caption,
                parse_mode: "HTML",
              }),
            });
          } catch { /* skip broken images */ }
        }
      }

      await new Promise(r => setTimeout(r, 500)); // Telegram rate limit
    }

    // Summary with render button
    const totalImages = Object.values(imageSources).flat().length;
    await sendMessage(chatId, [
      `📊 <b>Підсумок:</b>`,
      `Сегментів: ${segments.length}`,
      `Зображень: ${totalImages}`,
      `Музика: ${draft.bgm_mood || "corporate"}`,
      `Тривалість: ~${draft.target_duration_seconds}с`,
      `Формат: ${draft.format}`,
    ].join("\n"), {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Рендерити", callback_data: `cv_rok_${draftId}` },
            { text: "🔄 Перешукати", callback_data: `cv_vrg_${draftId}` },
          ],
          [
            { text: "❌ Скасувати", callback_data: `cv_skip_${draftId}` },
          ],
        ],
      },
    });

    return json({ ok: true, totalImages });
  } catch (e: any) {
    console.error(`❌ prepare_images error: ${e.message}`);
    await sendMessage(chatId, `❌ Помилка: ${escapeHtml(e.message)}`);
    return json({ error: e.message }, 500);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ACTION: trigger_render
// ═════════════════════════════════════════════════════════════════════════════

async function triggerRender(
  draftId: string,
  chatId: string | number,
): Promise<Response> {
  console.log(`\n🎬 trigger_render v${VERSION}`);

  try {
    const { data: draft } = await supabase
      .from("custom_video_drafts")
      .select("format, language, youtube_privacy")
      .eq("id", draftId)
      .single();

    if (!draft) throw new Error("Draft not found");

    // Dispatch GitHub Actions
    const result = await triggerCustomVideoRender({
      draftId,
      format: (draft.format as any) || "horizontal",
      language: draft.language || "en",
      youtubePrivacy: (draft.youtube_privacy as any) || "unlisted",
    });

    if (!result.success) {
      throw new Error(result.error || "GitHub Actions trigger failed");
    }

    // Update status
    await supabase
      .from("custom_video_drafts")
      .update({
        status: "rendering",
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftId);

    await sendMessage(chatId, [
      `🎬 <b>Рендеринг запущено!</b>`,
      ``,
      `⏱ Очікуваний час: 10-20 хвилин`,
      `📐 Формат: ${draft.format}`,
      `🌐 Мова: ${draft.language}`,
      ``,
      `Повідомлю коли відео буде готове.`,
    ].join("\n"));

    return json({ ok: true, draftId });
  } catch (e: any) {
    console.error(`❌ trigger_render error: ${e.message}`);
    await sendMessage(chatId, `❌ Помилка запуску рендерингу: ${escapeHtml(e.message)}`);

    await supabase
      .from("custom_video_drafts")
      .update({ error_message: e.message, status: "failed" })
      .eq("id", draftId);

    return json({ error: e.message }, 500);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ACTION: notify_complete
// ═════════════════════════════════════════════════════════════════════════════

async function notifyComplete(
  draftId: string,
  youtubeVideoId: string,
  youtubeUrl: string,
): Promise<Response> {
  console.log(`\n✅ notify_complete v${VERSION}`);

  try {
    const { data: draft } = await supabase
      .from("custom_video_drafts")
      .select("user_chat_id, youtube_title")
      .eq("id", draftId)
      .single();

    if (!draft) throw new Error("Draft not found");

    // Only mark completed if we have a real YouTube URL
    if (!youtubeVideoId || !youtubeUrl) {
      console.log("⚠️ notify_complete called without YouTube data — skipping");
      return json({ ok: false, error: "No YouTube URL provided" });
    }

    // Update DB
    await supabase
      .from("custom_video_drafts")
      .update({
        youtube_video_id: youtubeVideoId,
        youtube_url: youtubeUrl,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftId);

    // Notify in Telegram
    await sendMessage(draft.user_chat_id, [
      `✅ <b>Відео опубліковано!</b>`,
      ``,
      `🎥 ${escapeHtml(draft.youtube_title || "Custom Video")}`,
      ``,
      `▶️ ${youtubeUrl}`,
      ``,
      `📋 ID: <code>${youtubeVideoId}</code>`,
    ].join("\n"));

    return json({ ok: true });
  } catch (e: any) {
    console.error(`❌ notify_complete error: ${e.message}`);
    return json({ error: e.message }, 500);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ACTION: toggle_format / toggle_duration
// ═════════════════════════════════════════════════════════════════════════════

async function toggleFormat(draftId: string, chatId: string | number): Promise<Response> {
  const { data: draft } = await supabase
    .from("custom_video_drafts")
    .select("format")
    .eq("id", draftId)
    .single();

  const newFormat = draft?.format === "horizontal" ? "vertical" : "horizontal";

  await supabase
    .from("custom_video_drafts")
    .update({ format: newFormat, updated_at: new Date().toISOString() })
    .eq("id", draftId);

  await sendMessage(chatId, `📐 Формат змінено на: <b>${newFormat}</b>`);
  return json({ ok: true, format: newFormat });
}

async function toggleDuration(draftId: string, chatId: string | number): Promise<Response> {
  const { data: draft } = await supabase
    .from("custom_video_drafts")
    .select("target_duration_seconds")
    .eq("id", draftId)
    .single();

  const durations = [60, 90, 120, 180, 300];
  const current = draft?.target_duration_seconds || 90;
  const idx = durations.indexOf(current);
  const next = durations[(idx + 1) % durations.length];

  await supabase
    .from("custom_video_drafts")
    .update({ target_duration_seconds: next, updated_at: new Date().toISOString() })
    .eq("id", draftId);

  await sendMessage(chatId, `⏱ Тривалість змінена на: <b>~${next}с</b>`);
  return json({ ok: true, duration: next });
}

async function cancelDraft(draftId: string, chatId: string | number): Promise<Response> {
  await supabase
    .from("custom_video_drafts")
    .update({ status: "failed", error_message: "Cancelled by user", updated_at: new Date().toISOString() })
    .eq("id", draftId);

  await sendMessage(chatId, "❌ Відео скасовано.");
  return json({ ok: true });
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═════════════════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  console.log(`\n🎬 custom-video-bot v${VERSION}`);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "";

    let body: any = {};
    if (req.method === "POST") {
      try { body = await req.json(); } catch { /* empty body ok */ }
    }

    const chatId = body.chatId || body.chat_id || TELEGRAM_CHAT_ID;
    const draftId = body.draftId || body.draft_id || "";

    console.log(`   Action: ${action}`);
    console.log(`   Chat: ${chatId}`);
    if (draftId) console.log(`   Draft: ${draftId}`);

    switch (action) {
      case "analyze_prompt":
        return await analyzePrompt(body.prompt || body.text || "", chatId);

      case "generate_script":
        return await generateScript(draftId, chatId);

      case "regenerate_script":
        return await generateScript(draftId, chatId);

      case "apply_edit":
        return await applyEdit(draftId, body.editedText || body.text || "", chatId);

      case "generate_scenario":
        return await generateScenario(draftId, chatId);

      case "prepare_images":
        return await prepareImages(draftId, chatId);

      case "trigger_render":
        return await triggerRender(draftId, chatId);

      case "notify_complete":
        return await notifyComplete(
          draftId,
          body.youtubeVideoId || body.youtube_video_id || "",
          body.youtubeUrl || body.youtube_url || "",
        );

      case "toggle_format":
        return await toggleFormat(draftId, chatId);

      case "toggle_duration":
        return await toggleDuration(draftId, chatId);

      case "cancel":
        return await cancelDraft(draftId, chatId);

      default:
        return json({ error: `Unknown action: ${action}`, version: VERSION }, 400);
    }
  } catch (e: any) {
    console.error(`❌ Unhandled error: ${e.message}`);
    return json({ error: e.message }, 500);
  }
});
