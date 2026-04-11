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

const VERSION = "2026-04-11-v2";

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

// ── i18n UI Strings ──

const UI: Record<string, Record<string, string>> = {
  analyzing: { en: "🔍 Analyzing request...", no: "🔍 Analyserer forespørselen...", ua: "🔍 Аналізую запит..." },
  scraping: { en: "🌐 Scraping URL(s)...", no: "🌐 Skraper URL(er)...", ua: "🌐 Скрейплю URL(s)..." },
  analyzing_content: { en: "🔍 Analyzing content...", no: "🔍 Analyserer innhold...", ua: "🔍 Аналізую контент..." },
  analysis_title: { en: "📋 <b>Request analysis:</b>", no: "📋 <b>Analyse av forespørsel:</b>", ua: "📋 <b>Аналіз запиту:</b>" },
  topic: { en: "Topic", no: "Tema", ua: "Тема" },
  type_label: { en: "Type", no: "Type", ua: "Тип" },
  lang_label: { en: "Language", no: "Språk", ua: "Мова" },
  duration_label: { en: "Duration", no: "Varighet", ua: "Тривалість" },
  style_label: { en: "Style", no: "Stil", ua: "Стиль" },
  mood_label: { en: "Mood", no: "Stemning", ua: "Настрій" },
  select_lang: { en: "Select video language:", no: "Velg videospråk:", ua: "Оберіть мову відео:" },
  duration_btn: { en: "⏱ Duration", no: "⏱ Varighet", ua: "⏱ Тривалість" },
  format_btn: { en: "📐 Format", no: "📐 Format", ua: "📐 Формат" },
  cancel_btn: { en: "❌ Cancel", no: "❌ Avbryt", ua: "❌ Скасувати" },
  generating_script: { en: "✍️ Generating video script...", no: "✍️ Genererer videomanus...", ua: "✍️ Генерую сценарій відео..." },
  script_title: { en: "📝 <b>Video script</b>", no: "📝 <b>Videomanus</b>", ua: "📝 <b>Сценарій відео</b>" },
  intro: { en: "🎬 Intro", no: "🎬 Intro", ua: "🎬 Інтро" },
  outro: { en: "🔚 Outro", no: "🔚 Outro", ua: "🔚 Аутро" },
  approve_btn: { en: "✅ Approve", no: "✅ Godkjenn", ua: "✅ Затвердити" },
  regenerate_btn: { en: "🔄 Regenerate", no: "🔄 Regenerer", ua: "🔄 Перегенерувати" },
  edit_hint: { en: "💡 To edit — reply to the script message", no: "💡 For å redigere — svar på manusmeldingen", ua: "💡 Для правок — відповідайте на повідомлення зі скриптом" },
  edits_saved: { en: "✅ Edits saved. Regenerating script...", no: "✅ Endringer lagret. Regenererer manus...", ua: "✅ Правки збережені. Перегенеровую скрипт..." },
  scenario_gen: { en: "🎨 Creating visual scenario + searching images & music...", no: "🎨 Lager visuelt scenario + søker bilder og musikk...", ua: "🎨 Створюю візуальний сценарій + шукаю зображення та музику..." },
  scenario_title: { en: "🎨 <b>Visual scenario:</b>", no: "🎨 <b>Visuelt scenario:</b>", ua: "🎨 <b>Візуальний сценарій:</b>" },
  view_images: { en: "🖼 View images", no: "🖼 Se bilder", ua: "🖼 Переглянути зображення" },
  render_now: { en: "✅ Render now", no: "✅ Render nå", ua: "✅ Рендерити відразу" },
  re_search: { en: "🔄 Re-search", no: "🔄 Søk på nytt", ua: "🔄 Перешукати" },
  render_started: { en: "🎬 <b>Rendering started!</b>", no: "🎬 <b>Rendering startet!</b>", ua: "🎬 <b>Рендеринг запущено!</b>" },
  render_eta: { en: "⏱ Expected time: 10-20 minutes", no: "⏱ Forventet tid: 10-20 minutter", ua: "⏱ Очікуваний час: 10-20 хвилин" },
  render_notify: { en: "Will notify when the video is ready.", no: "Varsler når videoen er klar.", ua: "Повідомлю коли відео буде готове." },
  render_failed: { en: "❌ Render error", no: "❌ Feil ved rendering", ua: "❌ Помилка запуску рендерингу" },
  retry_btn: { en: "🔄 Retry render", no: "🔄 Prøv igjen", ua: "🔄 Спробувати знову" },
  video_published: { en: "✅ <b>Video published!</b>", no: "✅ <b>Video publisert!</b>", ua: "✅ <b>Відео опубліковано!</b>" },
  video_rendered: { en: "✅ <b>Video rendered!</b>", no: "✅ <b>Video rendert!</b>", ua: "✅ <b>Відео зрендерено!</b>" },
  yt_skipped: { en: "⚠️ YouTube upload was skipped", no: "⚠️ YouTube-opplasting ble hoppet over", ua: "⚠️ Завантаження на YouTube пропущено" },
  cancelled: { en: "❌ Video cancelled.", no: "❌ Video avbrutt.", ua: "❌ Відео скасовано." },
  format_changed: { en: "📐 Format changed to", no: "📐 Format endret til", ua: "📐 Формат змінено на" },
  duration_changed: { en: "⏱ Duration changed to", no: "⏱ Varighet endret til", ua: "⏱ Тривалість змінена на" },
  script_will_regen: { en: "⚠️ Script will be regenerated with new settings", no: "⚠️ Manus regenereres med nye innstillinger", ua: "⚠️ Скрипт буде перегенеровано з новими налаштуваннями" },
  summary: { en: "📊 <b>Summary:</b>", no: "📊 <b>Oppsummering:</b>", ua: "📊 <b>Підсумок:</b>" },
  segments: { en: "Segments", no: "Segmenter", ua: "Сегментів" },
  images: { en: "Images", no: "Bilder", ua: "Зображень" },
  music: { en: "Music", no: "Musikk", ua: "Музика" },
  total_images: { en: "Total images", no: "Totalt bilder", ua: "Загалом зображень" },
  no_images: { en: "⚠️ No images found", no: "⚠️ Ingen bilder funnet", ua: "⚠️ Зображень не знайдено" },
  unclear_title: { en: "⚠️ <b>Request unclear</b>", no: "⚠️ <b>Forespørselen er uklar</b>", ua: "⚠️ <b>Запит не зрозумілий</b>" },
  unclear_examples: { en: "💡 Examples:", no: "💡 Eksempler:", ua: "💡 Приклади запитів:" },
  error_analysis: { en: "❌ Analysis error", no: "❌ Analysefeil", ua: "❌ Помилка аналізу" },
  error_script: { en: "❌ Script generation error", no: "❌ Feil ved manusgenerering", ua: "❌ Помилка генерації скрипту" },
  error_scenario: { en: "❌ Scenario error", no: "❌ Scenariefeil", ua: "❌ Помилка сценарію" },
  error_generic: { en: "❌ Error", no: "❌ Feil", ua: "❌ Помилка" },
  // Content type labels
  ct_portfolio: { en: "portfolio", no: "portefølje", ua: "портфоліо" },
  ct_freeform: { en: "freeform topic", no: "fritt tema", ua: "довільна тема" },
  ct_mixed: { en: "portfolio + topic", no: "portefølje + tema", ua: "портфоліо + тема" },
  ct_web_scrape: { en: "web page analysis", no: "nettsideanalyse", ua: "аналіз веб-сторінки" },
  ct_project_deep_dive: { en: "project deep dive", no: "prosjektdypdykk", ua: "глибокий аналіз проекту" },
  project_label: { en: "Project", no: "Prosjekt", ua: "Проект" },
  features_label: { en: "features", no: "funksjoner", ua: "фіч" },
  data_points: { en: "data points", no: "datapunkter", ua: "дата-поінтів" },
  tech_stack: { en: "Tech", no: "Teknologi", ua: "Технології" },
  deep_research: { en: "🔬 Deep research...", no: "🔬 Dyp research...", ua: "🔬 Глибоке дослідження..." },
  sources_found: { en: "sources analyzed", no: "kilder analysert", ua: "джерел проаналізовано" },
  key_facts: { en: "key facts", no: "nøkkelfakta", ua: "ключових фактів" },
  research_label: { en: "🔬 Research", no: "🔬 Forskning", ua: "🔬 Дослідження" },
  // Style labels
  st_showcase: { en: "showcase", no: "utstilling", ua: "демонстрація" },
  st_case_study: { en: "case study", no: "casestudie", ua: "кейс-стаді" },
  st_overview: { en: "overview", no: "oversikt", ua: "огляд" },
  st_explainer: { en: "explainer", no: "forklaring", ua: "пояснення" },
  // Mood labels
  md_energetic: { en: "energetic", no: "energisk", ua: "енергійний" },
  md_corporate: { en: "corporate", no: "profesjonell", ua: "діловий" },
  md_cinematic: { en: "cinematic", no: "filmatisk", ua: "кінематографічний" },
  md_ambient: { en: "ambient", no: "ambient", ua: "атмосферний" },
  md_electronic: { en: "electronic", no: "elektronisk", ua: "електронний" },
  md_inspiring: { en: "inspiring", no: "inspirerende", ua: "надихаючий" },
  md_serious: { en: "serious", no: "seriøs", ua: "серйозний" },
  md_lighthearted: { en: "lighthearted", no: "lettsindig", ua: "легкий" },
};

function t(key: string, lang: string): string {
  return UI[key]?.[lang] || UI[key]?.en || key;
}

// ── Safe JSON Parse ──

function safeJsonParse(raw: string): any {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract JSON object/array from surrounding text
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    const match = objectMatch || arrayMatch;
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    throw new Error(`Failed to parse AI JSON: ${cleaned.slice(0, 100)}...`);
  }
}

// ── URL Safety Check (SSRF prevention) ──

function isUrlSafe(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const hostname = url.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname === "[::1]") return false;
    if (hostname.endsWith(".local") || hostname.endsWith(".internal")) return false;
    // Block private IP ranges
    const parts = hostname.split(".").map(Number);
    if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
      if (parts[0] === 10) return false;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
      if (parts[0] === 192 && parts[1] === 168) return false;
      if (parts[0] === 169 && parts[1] === 254) return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ── Safe HTML Truncation ──

function safeTruncateHtml(html: string, maxLen: number): string {
  if (html.length <= maxLen) return html;
  let truncated = html.slice(0, maxLen - 20);
  // Remove partial tag at the end
  const lastOpen = truncated.lastIndexOf("<");
  const lastClose = truncated.lastIndexOf(">");
  if (lastOpen > lastClose) {
    truncated = truncated.slice(0, lastOpen);
  }
  // Close unclosed formatting tags
  const tagPairs: [string, string][] = [["<b>", "</b>"], ["<i>", "</i>"], ["<code>", "</code>"]];
  for (const [open, close] of tagPairs) {
    const opens = (truncated.match(new RegExp(open.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    const closes = (truncated.match(new RegExp(close.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    for (let j = closes; j < opens; j++) {
      truncated += close;
    }
  }
  return truncated + "\n\n[...]";
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

// ── Deep Web Research (Perplexity-style) ──

interface ResearchSource {
  url: string;
  title: string;
  content: string;
}

interface ResearchResult {
  sources: ResearchSource[];
  synthesis: string;
  keyFacts: string[];
  dataPoints: { value: string; label: string; context: string }[];
  suggestedSegments: string[];
  searchQueries: string[];
}

async function deepWebResearch(
  userPrompt: string,
  topics: string[],
  existingContent: string,
  language: string,
): Promise<ResearchResult> {
  console.log(`\n🔬 Deep Web Research for: "${userPrompt.slice(0, 80)}..."`);

  const empty: ResearchResult = {
    sources: [], synthesis: "", keyFacts: [], dataPoints: [],
    suggestedSegments: [], searchQueries: [],
  };

  // Step 1: AI generates targeted search queries (in English for best results)
  let queries: string[] = [];
  try {
    const queryPrompt = `Generate 5-8 diverse search queries for researching this video topic.
Topic: "${userPrompt}"
Additional context: ${topics.join(", ")}

Return JSON: { "queries": ["query1", "query2", ...] }

Rules:
- Write queries in ENGLISH (best search results)
- Cover different angles: facts/statistics, practical info, cultural context, costs, personal experiences
- Be specific, not generic (e.g., "Fortaleza Brazil cost of living 2025" not just "Brazil")
- Include location-specific queries if a place is mentioned
- Include queries about challenges, tips, and real experiences`;

    const queryRaw = await callAI(queryPrompt, `Generate search queries for: ${userPrompt}`, 500);
    const queryResult = safeJsonParse(queryRaw);
    queries = (queryResult.queries || []).slice(0, 8);
    console.log(`  🔍 Generated ${queries.length} search queries`);
  } catch (e: any) {
    console.warn(`  ⚠️ Query generation failed: ${e.message}`);
    // Fallback: use topics directly
    queries = topics.slice(0, 3).map((t) => `${t} guide overview`);
  }

  if (queries.length === 0) return empty;

  // Step 2: Serper search — all queries in parallel
  const allUrls: Map<string, { title: string; snippet: string }> = new Map();

  if (SERPER_API_KEY) {
    const searchResults = await Promise.allSettled(
      queries.map(async (q) => {
        const res = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ q, num: 5 }),
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.organic || []).slice(0, 3).map((r: any) => ({
          url: r.link,
          title: r.title || "",
          snippet: r.snippet || "",
        }));
      }),
    );

    for (const result of searchResults) {
      if (result.status !== "fulfilled") continue;
      for (const item of result.value) {
        if (item.url && !allUrls.has(item.url)) {
          allUrls.set(item.url, { title: item.title, snippet: item.snippet });
        }
      }
    }
  }

  console.log(`  📎 Found ${allUrls.size} unique URLs from Serper`);

  // Step 3: Jina Reader — read top 10 articles in parallel
  const urlsToRead = Array.from(allUrls.entries()).slice(0, 10);
  const sources: ResearchSource[] = [];

  if (urlsToRead.length > 0) {
    const readResults = await Promise.allSettled(
      urlsToRead.map(async ([url, meta]) => {
        try {
          const res = await fetch(`https://r.jina.ai/${url}`, {
            headers: { "Accept": "text/markdown" },
            signal: AbortSignal.timeout(10000),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const markdown = await res.text();
          // Extract meaningful content (skip navigation, truncate)
          const content = markdown
            .replace(/\[.*?\]\(.*?\)/g, (m) => m.replace(/\[|\]/g, "").replace(/\(.*?\)/, "")) // simplify links
            .slice(0, 3000);
          return { url, title: meta.title, content };
        } catch {
          // Fallback: use Serper snippet
          return { url, title: meta.title, content: meta.snippet };
        }
      }),
    );

    for (const result of readResults) {
      if (result.status === "fulfilled" && result.value.content.length > 50) {
        sources.push(result.value);
      }
    }
  }

  console.log(`  📄 Read ${sources.length}/${urlsToRead.length} articles via Jina Reader`);

  if (sources.length === 0) return { ...empty, searchQueries: queries };

  // Step 4: AI synthesis — analyze all sources
  const langName = language === "ua" ? "Ukrainian" : language === "no" ? "Norwegian" : "English";
  const sourcesContext = sources.map((s, i) =>
    `SOURCE ${i + 1} [${s.title}] (${s.url}):\n${s.content}`
  ).join("\n\n---\n\n");

  try {
    const synthesisPrompt = `You are a research analyst preparing a brief for a video about: "${userPrompt}"

Analyze these ${sources.length} sources and create a comprehensive research brief.

${sourcesContext}

${existingContent ? `ADDITIONAL CONTEXT FROM USER:\n${existingContent.slice(0, 2000)}` : ""}

Return JSON:
{
  "synthesis": "3-5 paragraph comprehensive summary of findings in ${langName}. Include specific facts, numbers, and details from the sources.",
  "keyFacts": ["5-15 specific facts with numbers/data from the sources"],
  "dataPoints": [{"value": "specific number", "label": "what it measures", "context": "source context"}],
  "suggestedSegments": ["5-8 video segment topics based on the research, ordered for storytelling flow"]
}

Rules:
- Write synthesis in ${langName}
- keyFacts: only include VERIFIED facts from the sources, not AI assumptions
- dataPoints: extract concrete numbers for infographic overlays (temperatures, costs, percentages, distances, populations)
- suggestedSegments: create a narrative arc (WHY → WHAT → HOW → CHALLENGES → CONCLUSION)
- Be specific: "Середня температура у Форталезі — 27°C" not "погода тепла"`;

    const synthesisRaw = await callAI(synthesisPrompt, `Synthesize research for: ${userPrompt}`, 4000);
    const synthesis = safeJsonParse(synthesisRaw);

    console.log(`  ✅ Synthesis: ${(synthesis.keyFacts || []).length} facts, ${(synthesis.dataPoints || []).length} data points, ${(synthesis.suggestedSegments || []).length} segments`);

    return {
      sources,
      synthesis: synthesis.synthesis || "",
      keyFacts: synthesis.keyFacts || [],
      dataPoints: synthesis.dataPoints || [],
      suggestedSegments: synthesis.suggestedSegments || [],
      searchQueries: queries,
    };
  } catch (e: any) {
    console.error(`  ❌ Synthesis failed: ${e.message}`);
    return { sources, synthesis: "", keyFacts: [], dataPoints: [], suggestedSegments: [], searchQueries: queries };
  }
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

  // Cleanup expired video_waiting entries
  try {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    await supabase
      .from("api_settings")
      .delete()
      .like("key_name", "video_waiting_%")
      .lt("key_value", thirtyMinAgo);
  } catch { /* non-critical */ }

  // Send initial status
  const statusMsgId = await sendMessage(chatId, t("analyzing", language));

  try {
    // 0. Detect and scrape URLs from the prompt
    const detectedUrls = extractUrls(userPrompt);
    let scrapedContent = "";
    let scrapedImages: string[] = [];
    let scrapedTitle = "";

    if (detectedUrls.length > 0) {
      await editMessage(chatId, statusMsgId, t("scraping", language));

      const safeUrls = detectedUrls.slice(0, 3).filter((url) => {
        if (!isUrlSafe(url)) {
          console.log(`  ⚠️ Blocked unsafe URL: ${url}`);
          return false;
        }
        return true;
      });

      // Scrape all URLs in parallel
      const scrapeResults = await Promise.allSettled(
        safeUrls.map(async (url) => {
          const scraped = await scrapePageContent(url);
          if (scraped.success) {
            return { url, scraped, type: "scraped" as const };
          }
          // Serper fallback
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
                if (snippets) return { url, snippets, type: "serper" as const };
              }
            } catch { /* skip */ }
          }
          return null;
        }),
      );

      for (const result of scrapeResults) {
        if (result.status !== "fulfilled" || !result.value) continue;
        const v = result.value;
        if (v.type === "scraped") {
          scrapedTitle = v.scraped.title || scrapedTitle;
          scrapedContent += `\n\nCONTENT FROM ${v.url}:\nTitle: ${v.scraped.title}\nDescription: ${v.scraped.description}\n${v.scraped.text}`;
          scrapedImages.push(...v.scraped.images);
          console.log(`  ✅ Scraped ${v.url}: ${v.scraped.text.length} chars`);
        } else {
          scrapedContent += `\n\nSEARCH RESULTS FOR ${v.url}:\n${v.snippets}`;
          console.log(`  ✅ Serper fallback for ${v.url}`);
        }
      }

      await editMessage(chatId, statusMsgId, t("analyzing_content", language));
    }

    // 1. Fetch projects + portfolio features for matching (parallel)
    const [{ data: projects }, { data: features }] = await Promise.all([
      supabase.from("feature_projects")
        .select("id, name_en, name_no, name_ua, description_en, description_no, description_ua, image_url, repo_url")
        .eq("is_active", true),
      supabase.from("portfolio_features")
        .select("feature_key, category, title_en, title_no, title_ua, short_description_en, short_description_no, short_description_ua, tech_stack")
        .eq("is_active", true),
    ]);

    // 2. AI analysis: classify content type, detect project, match features
    const langKey = language === "ua" ? "ua" : language === "no" ? "no" : "en";
    const langFull = language === "ua" ? "Ukrainian" : language === "no" ? "Norwegian" : "English";

    const projectList = (projects || []).map((p) =>
      `- [${p.id}] ${p[`name_${langKey}`] || p.name_en}`
    ).join("\n");

    const featureList = (features || []).map((f, i) =>
      `${i + 1}. [${f.feature_key}] ${f.category}: ${f[`title_${langKey}`] || f.title_en} — ${f[`short_description_${langKey}`] || f.short_description_en}`
    ).join("\n");

    const analysisPrompt = `You are a video content planner for Vitalii Berbeha's portfolio (vitalii.no).

Analyze the user's request and plan a video:

USER REQUEST: "${userPrompt}"
${scrapedContent ? `\nSCRAPED WEB CONTENT:\n${scrapedContent.slice(0, 3000)}` : ""}

AVAILABLE PROJECTS:
${projectList}

AVAILABLE PORTFOLIO FEATURES:
${featureList}

Return JSON:
{
  "contentType": "project_deep_dive" | "portfolio" | "freeform" | "mixed" | "unclear",
  "detectedProject": "project_id or null",
  "topics": ["topic1", "topic2"],
  "matchedFeatureKeys": ["p01", "p05", ...],
  "videoStyle": "showcase" | "case_study" | "overview" | "explainer",
  "suggestedDuration": 60-300,
  "mood": "energetic" | "corporate" | "cinematic" | "ambient" | "electronic" | "inspiring",
  "language": "${language}",
  "briefSummary": "2-sentence description in ${langFull} of what the video will cover"
}

Rules:
- If user asks about a SPECIFIC PROJECT (Elvarika, JobBot, Calendar Bot, etc.) → contentType="project_deep_dive", detectedProject=matching project ID
- If user asks about portfolio features or personal work in general → contentType="portfolio", detectedProject=null
- If user asks about general topics (trends, tutorials) → contentType="freeform"
- For project_deep_dive: match only features RELEVANT to that project (3-8 max)
- For portfolio: select 3-8 most relevant features across all projects
- suggestedDuration: short showcase=60-90, case study=120-180, deep dive=180-300
- If the user prompt is very short or unclear, set contentType="unclear"`;

    const analysisRaw = await callAI(analysisPrompt, `Analyze this request: ${userPrompt}`, 2000);
    const analysis = safeJsonParse(analysisRaw);

    // 3. Build research brief if specific project detected
    let researchBrief: any = null;
    const detectedProjectId = analysis.detectedProject;
    // project_deep_dive takes priority over web_scrape — scraped content becomes additional context
    const contentType = (analysis.contentType === "project_deep_dive" && detectedProjectId)
      ? "project_deep_dive"
      : scrapedContent ? "web_scrape" : (analysis.contentType || "portfolio");

    if (detectedProjectId && contentType === "project_deep_dive") {
      console.log(`  🔬 Building research brief for project: ${detectedProjectId}`);
      await editMessage(chatId, statusMsgId, `🔬 ${t("analyzing_content", language)} (${detectedProjectId})`);

      // Load full project description
      const project = (projects || []).find((p: any) => p.id === detectedProjectId);

      // Load project-specific features from features table (NOT portfolio_features)
      const { data: projectFeatures } = await supabase
        .from("features")
        .select("id, feature_key, category, title_en, title_no, title_ua, short_description_en, short_description_no, short_description_ua, problem_en, problem_no, problem_ua, solution_en, solution_no, solution_ua, result_en, result_no, result_ua, tech_stack, hashtags")
        .eq("project_id", detectedProjectId)
        .eq("status", "published");

      // Extract data points from feature narratives
      const dataPointsRegex = /(\d+[\.,]?\d*)\s*(%|мов|мільйонів|тисяч|секунд|хвилин|годин|каналів|статей|фіч|users|languages|seconds|minutes|hours|channels|articles|features|times|x)/gi;
      const featuresWithData = (projectFeatures || []).map((f: any) => {
        const narrative = `${f[`problem_${langKey}`] || f.problem_en || ""} ${f[`solution_${langKey}`] || f.solution_en || ""} ${f[`result_${langKey}`] || f.result_en || ""}`;
        const dataPoints: any[] = [];
        let m;
        const rx = new RegExp(dataPointsRegex.source, dataPointsRegex.flags);
        while ((m = rx.exec(narrative)) !== null) {
          dataPoints.push({ value: m[1], label: m[2], context: narrative.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30).trim() });
        }
        return {
          feature_key: f.feature_key || f.id,
          title: f[`title_${langKey}`] || f.title_en,
          problem: f[`problem_${langKey}`] || f.problem_en,
          solution: f[`solution_${langKey}`] || f.solution_en,
          result: f[`result_${langKey}`] || f.result_en,
          techStack: f.tech_stack || [],
          dataPoints,
        };
      });

      // Collect all tech stacks
      const allTech = new Set<string>();
      for (const f of featuresWithData) {
        for (const t of f.techStack) allTech.add(t);
      }

      researchBrief = {
        detectedProject: detectedProjectId,
        projectName: project?.[`name_${langKey}`] || project?.name_en || detectedProjectId,
        projectDescription: project?.[`description_${langKey}`] || project?.description_en || "",
        projectImage: project?.image_url || "",
        repoUrl: project?.repo_url || "",
        featureCount: featuresWithData.length,
        features: featuresWithData,
        techStackSummary: Array.from(allTech),
        allDataPoints: featuresWithData.flatMap((f: any) => f.dataPoints),
        availableImages: {
          cover: project?.image_url || "",
          hero: ["about.webp", "services.webp", "projects.webp", "skills.webp", "news.webp", "blog.webp"],
        },
      };

      console.log(`  ✅ Research brief: ${featuresWithData.length} features, ${researchBrief.allDataPoints.length} data points, ${allTech.size} technologies`);
    }

    // 3b. Deep web research for freeform/mixed topics
    if (!researchBrief && (contentType === "freeform" || contentType === "mixed" || contentType === "web_scrape")) {
      await editMessage(chatId, statusMsgId, t("deep_research", language));

      const webResearch = await deepWebResearch(
        userPrompt,
        analysis.topics || [userPrompt],
        scrapedContent,
        language,
      );

      if (webResearch.sources.length > 0) {
        researchBrief = {
          type: "web_research",
          sourceCount: webResearch.sources.length,
          synthesis: webResearch.synthesis,
          keyFacts: webResearch.keyFacts,
          allDataPoints: webResearch.dataPoints,
          suggestedSegments: webResearch.suggestedSegments,
          sources: webResearch.sources.map((s) => ({ url: s.url, title: s.title })),
          searchQueries: webResearch.searchQueries,
        };
        console.log(`  ✅ Web research: ${webResearch.sources.length} sources, ${webResearch.keyFacts.length} facts`);
      }
    }

    // 4. Create draft record
    const enrichedBrief = researchBrief
      ? { ...analysis, research: researchBrief }
      : analysis;

    const { data: draft, error: insertError } = await supabase
      .from("custom_video_drafts")
      .insert({
        user_prompt: userPrompt,
        user_chat_id: chatId,
        language: analysis.language || language,
        video_style: analysis.videoStyle || "showcase",
        content_type: contentType,
        target_duration_seconds: analysis.suggestedDuration || (detectedProjectId ? 180 : 90),
        relevant_features: analysis.matchedFeatureKeys || [],
        web_research: scrapedContent ? [{ urls: detectedUrls, content: scrapedContent.slice(0, 8000), images: scrapedImages }] : [],
        content_brief: enrichedBrief,
        format: "horizontal",
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
        t("unclear_title", language),
        ``,
        `${escapeHtml(analysis.briefSummary || "")}`,
        ``,
        t("unclear_examples", language),
        `• "Зроби відео про мій проект Elvarika з vitalii.no"`,
        `• "Make a video about my AI features"`,
        `• "Lag en video om mine siste prosjekter"`,
      ].join("\n"));
      return json({ ok: true, unclear: true });
    }

    // 5. Send analysis to Telegram
    const langEmoji = { en: "🇬🇧", no: "🇳🇴", ua: "🇺🇦" }[analysis.language] || "🌐";
    const featureCount = (analysis.matchedFeatureKeys || []).length;
    const contentLabel = t(`ct_${contentType}`, language) || contentType;
    const styleLabel = t(`st_${analysis.videoStyle}`, language) || analysis.videoStyle;
    const moodLabel = t(`md_${analysis.mood}`, language) || analysis.mood;

    const briefLines = [
      t("analysis_title", language),
      ``,
      `<b>${t("topic", language)}:</b> ${escapeHtml(analysis.briefSummary || userPrompt.slice(0, 100))}`,
    ];

    // Show research details
    if (researchBrief?.type === "web_research") {
      // Web research (freeform/mixed)
      briefLines.push(
        `<b>${t("type_label", language)}:</b> ${contentLabel}`,
        `<b>${t("research_label", language)}:</b> ${researchBrief.sourceCount} ${t("sources_found", language)}, ${(researchBrief.keyFacts || []).length} ${t("key_facts", language)}, ${(researchBrief.allDataPoints || []).length} ${t("data_points", language)}`,
      );
    } else if (researchBrief) {
      // Project deep dive
      briefLines.push(
        `<b>${t("project_label", language)}:</b> ${escapeHtml(researchBrief.projectName)}`,
        `<b>${t("type_label", language)}:</b> ${contentLabel} (${researchBrief.featureCount} ${t("features_label", language)}, ${(researchBrief.allDataPoints || []).length} ${t("data_points", language)})`,
        `<b>${t("tech_stack", language)}:</b> ${researchBrief.techStackSummary.slice(0, 6).join(", ")}${researchBrief.techStackSummary.length > 6 ? "..." : ""}`,
      );
    } else {
      briefLines.push(
        `<b>${t("type_label", language)}:</b> ${contentLabel}${featureCount > 0 ? ` (${featureCount})` : ""}`,
      );
    }

    briefLines.push(
      `<b>${t("lang_label", language)}:</b> ${langEmoji} | <b>${t("duration_label", language)}:</b> ~${analysis.suggestedDuration}s | <b>${t("style_label", language)}:</b> ${styleLabel}`,
      `<b>${t("mood_label", language)}:</b> ${moodLabel}`,
      ``,
      t("select_lang", language),
    );

    const briefText = briefLines.join("\n");

    const draftId = draft.id;

    await editMessage(chatId, statusMsgId, briefText, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🇺🇦 UA", callback_data: `cv_lu_${draftId}` },
            { text: "🇳🇴 NO", callback_data: `cv_ln_${draftId}` },
            { text: "🇬🇧 EN", callback_data: `cv_le_${draftId}` },
          ],
          [
            { text: t("duration_btn", language), callback_data: `cv_dur_${draftId}` },
            { text: t("format_btn", language), callback_data: `cv_fmt_${draftId}` },
          ],
          [
            { text: t("cancel_btn", language), callback_data: `cv_skip_${draftId}` },
          ],
        ],
      },
    });

    return json({ ok: true, draftId, analysis });
  } catch (e: any) {
    console.error(`❌ analyze_prompt error: ${e.message}`);
    await editMessage(chatId, statusMsgId, `${t("error_analysis", language)}: ${escapeHtml(e.message)}`);
    return json({ error: e.message }, 500);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ACTION: set_language
// ═════════════════════════════════════════════════════════════════════════════

async function setLanguage(
  draftId: string,
  language: string,
  chatId: string | number,
): Promise<Response> {
  console.log(`\n🌐 set_language v${VERSION}: ${language}`);

  await supabase
    .from("custom_video_drafts")
    .update({ language, updated_at: new Date().toISOString() })
    .eq("id", draftId);

  const langEmoji = { en: "🇬🇧", no: "🇳🇴", ua: "🇺🇦" }[language] || "🌐";
  await sendMessage(chatId, `${langEmoji} ${t("lang_label", language)}: <b>${language.toUpperCase()}</b>`);

  // Auto-proceed to script generation
  return await generateScript(draftId, chatId);
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

  let lang = "ua"; // will be overwritten from draft
  const statusMsgId = await sendMessage(chatId, t("generating_script", "ua"));

  try {
    // 1. Load draft
    const { data: draft } = await supabase
      .from("custom_video_drafts")
      .select("*")
      .eq("id", draftId)
      .single();

    if (!draft) throw new Error("Draft not found");
    lang = draft.language || "en";
    await editMessage(chatId, statusMsgId, t("generating_script", lang));

    // 2. Build feature context — use research brief for deep dive, portfolio_features otherwise
    let featureContent = "";
    let projectContext = "";
    const research = draft.content_brief?.research;

    if (research && draft.content_type === "project_deep_dive") {
      // Deep dive: use rich research brief with full narratives
      projectContext = `PROJECT: ${research.projectName}\n\nPROJECT STORY:\n${(research.projectDescription || "").slice(0, 1500)}\n`;

      if (research.techStackSummary?.length > 0) {
        projectContext += `\nTECH STACK: ${research.techStackSummary.join(", ")}\n`;
      }

      // Include full features with data points (limit to 8 most relevant)
      const rf = (research.features || []).slice(0, 8);
      featureContent = rf.map((f: any, i: number) => {
        let entry = `FEATURE ${i + 1}: ${f.title}\n  Problem: ${f.problem || ""}\n  Solution: ${f.solution || ""}\n  Result: ${f.result || ""}`;
        if (f.techStack?.length > 0) entry += `\n  Tech: ${f.techStack.join(", ")}`;
        if (f.dataPoints?.length > 0) {
          entry += `\n  DATA POINTS: ${f.dataPoints.map((d: any) => `${d.value} ${d.label}`).join(", ")}`;
        }
        return entry;
      }).join("\n\n");
    } else if (draft.content_type !== "freeform" && draft.relevant_features?.length > 0) {
      // Generic portfolio: use portfolio_features table as before
      const { data: features } = await supabase
        .from("portfolio_features")
        .select("*")
        .in("feature_key", draft.relevant_features)
        .eq("is_active", true);

      if (features && features.length > 0) {
        featureContent = features.map((f: any, i: number) => {
          const title = f[`title_${lang}`] || f.title_en;
          const problem = f[`problem_${lang}`] || f.problem_en;
          const solution = f[`solution_${lang}`] || f.solution_en;
          const result = f[`result_${lang}`] || f.result_en;
          return `FEATURE ${i + 1}: ${title}\n  Problem: ${problem}\n  Solution: ${solution}\n  Result: ${result}\n  Tech: ${(f.tech_stack || []).join(", ")}`;
        }).join("\n\n");
      }
    }

    // 2b. Web research brief (freeform/mixed with deep research)
    if (research?.type === "web_research" && research.synthesis) {
      projectContext = `RESEARCH FINDINGS:\n${research.synthesis}\n`;

      if (research.keyFacts?.length > 0) {
        projectContext += `\nKEY FACTS (use these EXACT numbers in the script):\n${research.keyFacts.map((f: string) => `- ${f}`).join("\n")}\n`;
      }

      if (research.allDataPoints?.length > 0) {
        projectContext += `\nDATA POINTS FOR INFOGRAPHICS:\n${research.allDataPoints.map((d: any) => `${d.value} ${d.label} (${d.context})`).join("\n")}\n`;
      }

      if (research.suggestedSegments?.length > 0) {
        projectContext += `\nSUGGESTED VIDEO SEGMENTS:\n${research.suggestedSegments.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}\n`;
      }

      if (research.sources?.length > 0) {
        projectContext += `\nSOURCES (${research.sources.length} articles analyzed):\n${research.sources.slice(0, 5).map((s: any) => `- ${s.title}`).join("\n")}\n`;
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

    // 3b. Serper fallback for freeform topics without scraped content (parallel)
    if (!webContext && (draft.content_type === "freeform" || draft.content_type === "mixed") && SERPER_API_KEY) {
      const topics = draft.content_brief?.topics || [draft.user_prompt];

      const searchPromises = topics.slice(0, 3).map(async (topic: string) => {
        try {
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
            if (snippets) return `TOPIC "${topic}":\n${snippets}`;
          }
        } catch { /* skip */ }
        return null;
      });

      const results = await Promise.allSettled(searchPromises);
      const searchResults = results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled" && !!r.value)
        .map((r) => r.value);

      if (searchResults.length > 0) {
        webContext = `\n\nWEB RESEARCH:\n${searchResults.join("\n\n")}`;
      }
    }

    // 4. Generate script via AI
    const duration = draft.target_duration_seconds || 90;
    const wordsTotal = Math.round(duration * 2.5); // ~2.5 words/sec for spoken audio
    const segmentCount = Math.min(Math.max(Math.round(duration / 20), 2), 8);
    const wordsPerSegment = Math.round(wordsTotal / (segmentCount + 2)); // +2 for intro/outro

    const langName = { en: "English", no: "Norwegian Bokmål", ua: "Ukrainian" }[lang] || "English";

    // Language-aware TTS rules
    const ttsRules = lang === "ua" ? `
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
- First person: "Я створив", "моя система", "ми досягли"
- Intro greets: "Привіт, я Віталій..."
- Outro: mention "віталій крапка но" (vitalii.no spoken)` : lang === "no" ? `
TTS RULES (Norwegian voice engine):
- Use standard Norwegian Bokmål
- Technical terms can stay in English (React, TypeScript, Supabase, etc.)
- Use natural Norwegian sentence structure
- First person: "Jeg har bygget", "mitt system", "vi oppnådde"
- Intro greets: "Hei, jeg er Vitalii..."
- Outro: mention "vitalii punkt no" (vitalii.no spoken)` : `
TTS RULES (English voice engine):
- Use natural conversational English
- Technical terms in standard English pronunciation
- First person: "I built", "my system", "we achieved"
- Intro greets: "Hi, I'm Vitalii..."
- Outro: mention "vitalii dot no" (vitalii.no spoken)`;

    const isDeepDive = draft.content_type === "project_deep_dive" && research;

    const storyRules = isDeepDive ? `
STORYTELLING RULES (project deep dive):
- This is a STORY about a specific project, NOT a feature list
- Start with WHY: what problem inspired this project? What pain did it solve?
- Use SPECIFIC numbers from the DATA POINTS (don't invent, use exactly as provided)
- Each segment = narrative arc: setup → insight → payoff
- Embed data naturally in speech: "8 мов — від арабської до тигрінья"
- Connect segments as chapters of one story, not independent topics
- End with IMPACT: what changed because this project exists?
- Choose 3-5 MOST COMPELLING features, don't try to cover all of them
- Add dataPoints array per segment with real numbers for visual infographics` : `
STRUCTURE RULES:
- Each segment = one clear topic with beginning-middle-END
- Select the most relevant features to cover`;

    const scriptPrompt = `You are a professional video scriptwriter writing for Vitalii Berbeha's video channel.

PRESENTER: ${PROFILE_BIO}

VIDEO REQUEST: "${draft.user_prompt}"
LANGUAGE: ${langName}
DURATION: ~${duration} seconds
SEGMENTS: ${segmentCount} content segments + intro + outro
WORDS PER SEGMENT: ~${wordsPerSegment} words
STYLE: ${draft.video_style}

${projectContext}
${featureContent ? `${isDeepDive ? "PROJECT FEATURES (choose 3-5 most compelling)" : "PORTFOLIO FEATURES TO COVER"}:\n${featureContent}` : ""}
${webContext}

${HUMANIZER_VIDEO}
${VOICE_SPOKEN}

Write a video script in ${langName}. Return ONLY valid JSON:
{
  "intro": "Opening text (2-3 sentences, ~${wordsPerSegment} words)",
  "segments": [
    {
      "topic": "Short topic title in ${langName}",
      "text": "Segment narration (~${wordsPerSegment} words)",
      "featureKey": "feature key or null if freeform",
      "dataPoints": [{"value": "8", "label": "languages", "type": "counter"}]
    }
  ],
  "outro": "Closing call-to-action (~${wordsPerSegment} words, mention vitalii.no)",
  "youtubeTitle": "Catchy title under 80 chars in ${langName}",
  "youtubeDescription": "3-sentence description in ${langName} with vitalii.no link",
  "youtubeTags": ["tag1", "tag2", "tag3"]
}
${ttsRules}
${storyRules}

SCRIPT RULES:
- Write for the EAR (spoken audio), not the eye
- Keep sentences SHORT (max 12 words)
- Each segment MUST have a complete thought with proper conclusion
- NEVER end a segment mid-sentence or mid-thought
- Last sentence of each segment should feel like a natural pause point
- NO AI-speak: no "delve", "landscape", "groundbreaking", "testament"
- Segment transitions should flow naturally: end of segment N should connect to start of segment N+1
- dataPoints: extract real numbers from the features for visual infographics (counter, keyFigure, comparison types)`;

    const scriptRaw = await callAI(scriptPrompt, `Generate script for: ${draft.user_prompt}`, 8000);
    const script = safeJsonParse(scriptRaw);

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
      `${t("script_title", lang)} (${script.segments.length} ${t("segments", lang).toLowerCase()}, ~${duration}s)`,
      ``,
      `<b>${t("intro", lang)}:</b>`,
      escapeHtml(script.intro),
      ``,
      segmentsText,
      ``,
      `<b>${t("outro", lang)}:</b>`,
      escapeHtml(script.outro),
      ``,
      `🎥 <b>YouTube:</b> ${escapeHtml(script.youtubeTitle || "")}`,
    ].join("\n");

    const finalText = safeTruncateHtml(scriptPreview, 4000);

    await editMessage(chatId, statusMsgId, finalText, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: t("approve_btn", lang), callback_data: `cv_ren_${draftId}` },
            { text: t("regenerate_btn", lang), callback_data: `cv_srg_${draftId}` },
          ],
          [
            { text: t("cancel_btn", lang), callback_data: `cv_skip_${draftId}` },
          ],
        ],
      },
    });

    // Note about editing
    await sendMessage(chatId, `${t("edit_hint", lang)}\n<code>cv_edit_${draftId}</code>`, {
      disable_web_page_preview: true,
    });

    return json({ ok: true, draftId, segmentCount: script.segments.length });
  } catch (e: any) {
    console.error(`❌ generate_script error: ${e.message}`);
    await editMessage(chatId, statusMsgId, `${t("error_script", lang)}: ${escapeHtml(e.message)}`);

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

    const lang = draft?.language || "ua";
    await sendMessage(chatId, t("edits_saved", lang));

    // Regenerate
    return await generateScript(draftId, chatId);
  } catch (e: any) {
    console.error(`❌ apply_edit error: ${e.message}`);
    await sendMessage(chatId, `${t("error_generic", "ua")}: ${escapeHtml(e.message)}`);
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

  let lang = "ua";
  const statusMsgId = await sendMessage(chatId, t("scenario_gen", "ua"));

  try {
    // 1. Load draft
    const { data: draft } = await supabase
      .from("custom_video_drafts")
      .select("*")
      .eq("id", draftId)
      .single();

    if (!draft) throw new Error("Draft not found");
    lang = draft.language || "ua";
    await editMessage(chatId, statusMsgId, t("scenario_gen", lang));

    const segments = draft.segment_scripts || [];
    const scenarioResearch = draft.content_brief?.research;
    const siteBaseUrl = "https://vitalii.no";

    // 2. Build segment info with dataPoints for AI
    const segmentInfo = segments.map((s: any, i: number) => {
      let info = `${i + 1}. [${s.topic}]: ${s.text?.slice(0, 150)}...`;
      if (s.dataPoints?.length > 0) {
        info += `\n   DATA POINTS: ${s.dataPoints.map((d: any) => `${d.value} ${d.label} (${d.type})`).join(", ")}`;
      }
      return info;
    }).join("\n");

    // Available site images
    const siteImagesList = scenarioResearch?.availableImages
      ? `\nAVAILABLE PROJECT IMAGES (prefer these over generic stock):
- Project cover: ${scenarioResearch.availableImages.cover || "none"}
- Hero images: ${(scenarioResearch.availableImages.hero || []).join(", ")}
- Use site assets for project-specific segments, external search for conceptual/technology illustrations`
      : "";

    // AI visual scenario planning
    const scenarioPrompt = `You are a video visual director. Plan the visual composition for each segment of a custom video.

VIDEO: ${draft.youtube_title || draft.user_prompt}
STYLE: ${draft.video_style}
LANGUAGE: ${draft.language}
${scenarioResearch ? `PROJECT: ${scenarioResearch.projectName}` : ""}

SEGMENTS:
${segmentInfo}
${siteImagesList}

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
- For portfolio projects: search for app screenshots, technology diagrams, architecture visuals
- Each query = different visual aspect
- 3-4 queries per segment
- NO generic stock phrases
- If segment has DATA POINTS, include them in facts array for infographic overlays`;

    const scenarioRaw = await callAI(scenarioPrompt, "Plan the visual scenario", 6000);
    const scenario = safeJsonParse(scenarioRaw);

    // 3. Collect available images: site assets first, then web scraped, then search
    const webResearchImages: string[] = [];

    // Inject site project images as high-priority sources
    if (scenarioResearch?.availableImages?.cover) {
      webResearchImages.push(`${siteBaseUrl}${scenarioResearch.availableImages.cover}`);
    }
    for (const hi of (scenarioResearch?.availableImages?.hero || [])) {
      webResearchImages.push(`${siteBaseUrl}/images/hero/${hi}`);
    }

    // Add web-scraped images
    if (draft.web_research?.length > 0 && draft.web_research[0]?.images) {
      webResearchImages.push(...draft.web_research[0].images);
    }
    if (webResearchImages.length > 0) {
      console.log(`  🖼 ${webResearchImages.length} priority images (site + scraped)`);
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

      // Search via Serper for all queries in parallel
      const queryResults = await Promise.allSettled(
        queries.slice(0, 3).map((q: string) => searchSerperImages(q, 3)),
      );
      for (const qr of queryResults) {
        if (qr.status === "fulfilled") {
          for (const img of qr.value) {
            if (!allImages.includes(img)) allImages.push(img);
          }
        } else {
          console.warn(`    ⚠️ Image search failed: ${qr.reason?.message || "unknown"}`);
        }
      }

      // Pexels fallback if not enough
      if (allImages.length < 4) {
        const topic = segments[idx]?.topic || seg.headline || "";
        try {
          const pexels = await searchPexelsImages(topic, 4 - allImages.length);
          for (const img of pexels) {
            if (!allImages.includes(img)) allImages.push(img);
          }
        } catch (e: any) {
          console.warn(`    ⚠️ Pexels fallback failed for "${topic}": ${e.message}`);
        }
      }

      imageSourcesMap[String(idx)] = allImages;
      console.log(`   Segment ${idx + 1}: ${allImages.length} images found`);
    });

    // 4. Search images + music in parallel
    const mood = draft.content_brief?.mood || mapContentToMood(
      draft.content_type || "portfolio",
      draft.video_style || "showcase",
    );

    const [imageResults, musicResult] = await Promise.all([
      Promise.allSettled(imagePromises),
      findBestMusic(mood, draft.target_duration_seconds || 90),
    ]);

    for (let i = 0; i < imageResults.length; i++) {
      if (imageResults[i].status === "rejected") {
        console.warn(`  ⚠️ Image search failed for segment ${i + 1}: ${(imageResults[i] as PromiseRejectedResult).reason?.message || "unknown"}`);
        if (!imageSourcesMap[String(i)]) imageSourcesMap[String(i)] = [];
      }
    }

    const { track, localFile } = musicResult;

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
      ? `🎵 ${t("music", lang)}: ${escapeHtml(track.title)} (${track.duration}s, Pixabay)`
      : `🎵 ${t("music", lang)}: ${localFile || "local fallback"}`;

    await editMessage(chatId, statusMsgId, [
      t("scenario_title", lang),
      ``,
      scenarioSummary,
      ``,
      musicInfo,
      ``,
      `${t("total_images", lang)}: ${Object.values(imageSourcesMap).flat().length}`,
    ].join("\n"), {
      reply_markup: {
        inline_keyboard: [
          [
            { text: t("view_images", lang), callback_data: `cv_img_${draftId}` },
          ],
          [
            { text: t("render_now", lang), callback_data: `cv_rok_${draftId}` },
            { text: t("regenerate_btn", lang), callback_data: `cv_vrg_${draftId}` },
          ],
          [
            { text: t("cancel_btn", lang), callback_data: `cv_skip_${draftId}` },
          ],
        ],
      },
    });

    return json({ ok: true, draftId, imageCount: Object.values(imageSourcesMap).flat().length });
  } catch (e: any) {
    console.error(`❌ generate_scenario error: ${e.message}`);
    await editMessage(chatId, statusMsgId, `${t("error_scenario", lang)}: ${escapeHtml(e.message)}`);

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
    const lang = draft.language || "ua";

    const segments = draft.segment_scripts || [];
    const scenario = draft.visual_scenario?.segments || [];
    const imageSources = draft.image_sources || {};

    // Send image albums per segment
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const vis = scenario[i] || {};
      const imgs = (imageSources[String(i)] || []).slice(0, 10); // Telegram max 10 per group

      if (imgs.length === 0) {
        await sendMessage(chatId, `🖼 Segment ${i + 1}: <b>${escapeHtml(seg.topic || "")}</b>\n${t("no_images", lang)}`);
        continue;
      }

      // Send media group
      const media = imgs.slice(0, 10).map((url: string, j: number) => ({
        type: "photo",
        media: url,
        ...(j === 0 ? {
          caption: `🖼 Segment ${i + 1}: ${seg.topic || ""}\n${vis.category || ""} | ${vis.mood || ""} | ${vis.accentColor || ""}`,
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
      t("summary", lang),
      `${t("segments", lang)}: ${segments.length}`,
      `${t("images", lang)}: ${totalImages}`,
      `${t("music", lang)}: ${draft.bgm_mood || "corporate"}`,
      `${t("duration_label", lang)}: ~${draft.target_duration_seconds}s`,
      `${t("format_btn", lang)}: ${draft.format}`,
    ].join("\n"), {
      reply_markup: {
        inline_keyboard: [
          [
            { text: t("render_now", lang), callback_data: `cv_rok_${draftId}` },
            { text: t("re_search", lang), callback_data: `cv_vrg_${draftId}` },
          ],
          [
            { text: t("cancel_btn", lang), callback_data: `cv_skip_${draftId}` },
          ],
        ],
      },
    });

    return json({ ok: true, totalImages });
  } catch (e: any) {
    console.error(`❌ prepare_images error: ${e.message}`);
    await sendMessage(chatId, `${t("error_generic", "ua")}: ${escapeHtml(e.message)}`);
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
  let lang = "ua";

  try {
    const { data: draft } = await supabase
      .from("custom_video_drafts")
      .select("format, language, youtube_privacy")
      .eq("id", draftId)
      .single();

    if (!draft) throw new Error("Draft not found");
    lang = draft.language || "ua";

    // Dispatch GitHub Actions
    const result = await triggerCustomVideoRender({
      draftId,
      format: (draft.format as any) || "horizontal",
      language: lang,
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
      t("render_started", lang),
      ``,
      t("render_eta", lang),
      `📐 Format: ${draft.format}`,
      `🌐 ${t("lang_label", lang)}: ${lang.toUpperCase()}`,
      ``,
      t("render_notify", lang),
    ].join("\n"));

    return json({ ok: true, draftId });
  } catch (e: any) {
    console.error(`❌ trigger_render error: ${e.message}`);
    await sendMessage(chatId, `${t("render_failed", lang)}: ${escapeHtml(e.message)}`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: t("retry_btn", lang), callback_data: `cv_rok_${draftId}` }],
          [{ text: t("cancel_btn", lang), callback_data: `cv_skip_${draftId}` }],
        ],
      },
    });

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
      .select("user_chat_id, youtube_title, language")
      .eq("id", draftId)
      .single();

    if (!draft) throw new Error("Draft not found");
    const lang = draft.language || "ua";

    if (youtubeVideoId && youtubeUrl) {
      // YouTube upload succeeded
      await supabase
        .from("custom_video_drafts")
        .update({
          youtube_video_id: youtubeVideoId,
          youtube_url: youtubeUrl,
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", draftId);

      await sendMessage(draft.user_chat_id, [
        t("video_published", lang),
        ``,
        `🎥 ${escapeHtml(draft.youtube_title || "Custom Video")}`,
        ``,
        `▶️ ${youtubeUrl}`,
        ``,
        `📋 ID: <code>${youtubeVideoId}</code>`,
      ].join("\n"));
    } else {
      // YouTube was skipped — still notify user
      await supabase
        .from("custom_video_drafts")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", draftId);

      await sendMessage(draft.user_chat_id, [
        t("video_rendered", lang),
        ``,
        `🎥 ${escapeHtml(draft.youtube_title || "Custom Video")}`,
        ``,
        `📋 Draft: <code>${draftId}</code>`,
        t("yt_skipped", lang),
      ].join("\n"));
    }

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
    .select("format, status, language")
    .eq("id", draftId)
    .single();

  const lang = draft?.language || "ua";
  const newFormat = draft?.format === "horizontal" ? "vertical" : "horizontal";
  const updateFields: Record<string, any> = { format: newFormat, updated_at: new Date().toISOString() };

  // If script was already generated, reset to pending_script
  if (["pending_scenario", "pending_images"].includes(draft?.status)) {
    updateFields.status = "pending_script";
    await sendMessage(chatId, `${t("format_changed", lang)}: <b>${newFormat}</b>\n${t("script_will_regen", lang)}`);
  } else {
    await sendMessage(chatId, `${t("format_changed", lang)}: <b>${newFormat}</b>`);
  }

  await supabase.from("custom_video_drafts").update(updateFields).eq("id", draftId);
  return json({ ok: true, format: newFormat });
}

async function toggleDuration(draftId: string, chatId: string | number): Promise<Response> {
  const { data: draft } = await supabase
    .from("custom_video_drafts")
    .select("target_duration_seconds, status, language")
    .eq("id", draftId)
    .single();

  const lang = draft?.language || "ua";
  const durations = [60, 90, 120, 180, 300];
  const current = draft?.target_duration_seconds || 90;
  const idx = durations.indexOf(current);
  const next = durations[(idx + 1) % durations.length];

  const updateFields: Record<string, any> = { target_duration_seconds: next, updated_at: new Date().toISOString() };

  // If script was already generated, reset to pending_script
  if (["pending_scenario", "pending_images"].includes(draft?.status)) {
    updateFields.status = "pending_script";
    await sendMessage(chatId, `${t("duration_changed", lang)}: <b>~${next}s</b>\n${t("script_will_regen", lang)}`);
  } else {
    await sendMessage(chatId, `${t("duration_changed", lang)}: <b>~${next}s</b>`);
  }

  await supabase.from("custom_video_drafts").update(updateFields).eq("id", draftId);
  return json({ ok: true, duration: next });
}

async function cancelDraft(draftId: string, chatId: string | number): Promise<Response> {
  const { data: draft } = await supabase
    .from("custom_video_drafts")
    .select("language")
    .eq("id", draftId)
    .single();

  const lang = draft?.language || "ua";

  await supabase
    .from("custom_video_drafts")
    .update({ status: "failed", error_message: "Cancelled by user", updated_at: new Date().toISOString() })
    .eq("id", draftId);

  await sendMessage(chatId, t("cancelled", lang));
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

      case "set_language":
        return await setLanguage(draftId, body.language || "en", chatId);

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
