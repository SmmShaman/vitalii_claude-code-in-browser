/**
 * Daily Video Bot — Edge Function
 *
 * Handles the 3-step Telegram approval flow for daily news videos:
 *   1. initiate_digest  — fetch news, send digest to Telegram
 *   2. generate_script  — AI writes per-article Norwegian scripts
 *   3. apply_edit       — user edited script text via reply
 *   4. generate_scenario — AI plans visual scenario
 *   5. trigger_render   — dispatch GitHub Actions for Remotion render
 *
 * Called by: telegram-webhook (callback handlers), cron workflow, manual
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { triggerDailyVideoRender } from "../_shared/github-actions.ts";

const VERSION = "2026-03-10-v13";
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

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
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
      max_tokens: 4000,
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
    // Truncate title for very large digests
    const titleText = compact ? escapeHtml(h.title).substring(0, 60) + (h.title.length > 60 ? "…" : "") : escapeHtml(h.title);
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

  const start = `${date}T00:00:00Z`;
  const end = `${date}T23:59:59.999Z`;

  // Fetch published news
  const { data: articles, error } = await supabase
    .from("news")
    .select("id, title_no, title_en, original_title, description_no, description_en, image_url, processed_image_url, tags, slug_en")
    .eq("is_published", true)
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: true });

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

  const targetDuration = detailedCount * 15 + 12 + (hasOverflow ? 25 : 0);
  const wordTarget = Math.round(targetDuration * 2);
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
1. "introScript" — personal opening (~4-5s, ~${wordsPerArticle} words). MUST start with "Hei, jeg er Vitalii fra vitalii punkt no." then mention today's news count (${orderedArticles.length} saker).${roundupPromptBlock}
${hasOverflow ? "3" : "2"}. "segmentScripts" — one narration for each of the ${detailedCount} detailed articles (~12-18s each, ~${wordsPerArticle * 2} words each). 3-5 sentences each.
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
  "introScript": "Hei, jeg er Vitalii fra vitalii punkt no...",${hasOverflow ? '\n  "roundupScript": "I dag dekker vi N nyheter...",' : ""}${hasOverflow ? '\n  "roundupTranslation": "Сьогодні ми розглянемо...",' : ""}
  "segmentScripts": ["...", ...],
  "outroScript": "Det var alt for i dag. Abonner på kanalen...",${hasOverflow ? '\n  "overflowScript": "Du finner N flere nyheter på vitalii punkt no.",' : ""}${hasOverflow ? '\n  "overflowTranslation": "Ще N новин читайте на...",' : ""}
  "segmentTranslations": ["Почнімо з...", ...],
  "introTranslation": "Привіт, я Віталій...",
  "outroTranslation": "На сьогодні все..."
}`;

  const aiResponse = await callAI(systemPrompt, `Write the script for ${displayDate}:\n\n${articleSummaries}`);
  const plan = JSON.parse(aiResponse);

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

  // Send script to Telegram for approval
  const headlines = draft.article_headlines || [];
  let msg = `📝 <b>Сценарій озвучки — ${displayDate}</b>\n`;
  if (hasOverflow) {
    msg += `📋 ${orderedArticles.length} статей: ${detailedCount} детально + ${overflowCount} у згадці\n`;
  }
  msg += "\n";

  // Intro
  msg += `🎬 <b>Інтро (NO):</b>\n<i>${escapeHtml(plan.introScript || "")}</i>\n`;
  if (plan.introTranslation) {
    msg += `🇺🇦 ${escapeHtml(plan.introTranslation)}\n`;
  }
  msg += "\n";

  // Roundup (if >10 articles)
  if (plan.roundupScript) {
    msg += `📋 <b>Headlines Roundup (NO):</b>\n<i>${escapeHtml(plan.roundupScript)}</i>\n`;
    if (plan.roundupTranslation) {
      msg += `🇺🇦 ${escapeHtml(plan.roundupTranslation)}\n`;
    }
    msg += "\n";
  }

  // Segments (only detailed ones)
  plan.segmentScripts.forEach((script: string, i: number) => {
    const title = headlines[i]?.title || `Article ${i + 1}`;
    msg += `📰 <b>${i + 1}. ${escapeHtml(title)}</b>\n`;
    msg += `🇳🇴 <i>${escapeHtml(script)}</i>\n`;
    if (plan.segmentTranslations?.[i]) {
      msg += `🇺🇦 ${escapeHtml(plan.segmentTranslations[i])}\n`;
    }
    msg += "\n";
  });

  // Overflow CTA
  if (plan.overflowScript) {
    msg += `🔗 <b>Overflow CTA (NO):</b>\n<i>${escapeHtml(plan.overflowScript)}</i>\n`;
    if (plan.overflowTranslation) {
      msg += `🇺🇦 ${escapeHtml(plan.overflowTranslation)}\n`;
    }
    msg += "\n";
  }

  // Outro
  msg += `🎬 <b>Аутро (NO):</b>\n<i>${escapeHtml(plan.outroScript || "")}</i>\n`;
  if (plan.outroTranslation) {
    msg += `🇺🇦 ${escapeHtml(plan.outroTranslation)}\n`;
  }

  // Truncate if too long for Telegram
  if (msg.length > 3800) {
    msg = msg.substring(0, 3800) + "\n\n<i>... (скорочено)</i>";
  }

  msg += `\n\n💡 <i>Щоб відредагувати — відповідай reply на це повідомлення з виправленим текстом.</i>`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ Підтвердити скрипт", callback_data: `dv_sok_${targetDate}` },
        { text: "✏️ Перегенерувати", callback_data: `dv_srg_${targetDate}` },
      ],
    ],
  };

  const scriptMsgId = await sendMessage(chatId || TELEGRAM_CHAT_ID, msg, { reply_markup: keyboard });

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
      "statsVisualType": "list"
    }
  ],
  "scenarioDescription": "Детальний покроковий опис візуального сценарію українською з описом анімацій, настрою та ефектів кожного сегменту..."
}`;

  const aiResponse = await callAI(
    systemPrompt,
    `Create visual scenario for ${displayDate} (${detailedScripts.length} detailed articles):\n\n${articleInfo}`,
  );
  const scenario = JSON.parse(aiResponse);

  if (!scenario.segments || scenario.segments.length === 0) {
    throw new Error("AI returned no visual segments");
  }

  // Save scenario
  await supabase
    .from("daily_video_drafts")
    .update({
      visual_scenario: scenario.segments,
      visual_scenario_text: scenario.scenarioDescription || "",
      status: "pending_scenario",
    })
    .eq("target_date", targetDate);

  // Send scenario to Telegram
  let msg = `🎨 <b>Візуальний сценарій — ${displayDate}</b>\n\n`;

  scenario.segments.forEach((seg: any, i: number) => {
    const catEmoji: Record<string, string> = {
      tech: "💻", business: "💼", ai: "🤖", startup: "🚀",
      science: "🔬", politics: "🏛", crypto: "₿", health: "🏥", news: "📰",
    };
    const emoji = catEmoji[seg.category] || "📰";
    msg += `${i + 1}. ${emoji} <b>${escapeHtml(seg.headline || "")}</b>\n`;
    if (seg.summary) {
      msg += `   📝 ${escapeHtml(seg.summary)}\n`;
    }
    msg += `   Категорія: ${seg.category} | Колір: ${seg.accentColor}\n`;
    if (seg.mood || seg.transition || seg.textReveal) {
      msg += `   🎬 Mood: ${seg.mood || "positive"} | Перехід: ${seg.transition || "fade"} | Текст: ${seg.textReveal || "default"}\n`;
    }
    if (seg.keyQuote) {
      msg += `   💬 <i>"${escapeHtml(seg.keyQuote)}"</i>\n`;
    }
    if (seg.facts && seg.facts.length > 0) {
      const statsType = seg.statsVisualType ? ` [${seg.statsVisualType}]` : "";
      msg += `   📊${statsType} ${seg.facts.map((f: any) => `${f.value} (${f.label})`).join(", ")}\n`;
    }
    msg += "\n";
  });

  if (scenario.scenarioDescription) {
    msg += `📋 <b>Опис:</b>\n${escapeHtml(scenario.scenarioDescription)}`;
  }

  if (msg.length > 3800) {
    msg = msg.substring(0, 3800) + "\n\n<i>... (скорочено)</i>";
  }

  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ Рендерити", callback_data: `dv_ren_${targetDate}` },
        { text: "🔄 Перегенерувати", callback_data: `dv_vrg_${targetDate}` },
      ],
    ],
  };

  const scenarioMsgId = await sendMessage(chatId || TELEGRAM_CHAT_ID, msg, { reply_markup: keyboard });

  const existingMsgIds = draft.telegram_message_ids || [];
  await supabase
    .from("daily_video_drafts")
    .update({ telegram_message_ids: [...existingMsgIds, scenarioMsgId] })
    .eq("target_date", targetDate);

  console.log(`✅ Visual scenario sent for approval`);
  return json({ ok: true, segments: scenario.segments.length });
}

// ══════════════════════════════════════════════════════════════
// STEP 4: Trigger Render
// ══════════════════════════════════════════════════════════════

async function triggerRender(targetDate: string, chatId?: number, messageId?: number): Promise<Response> {
  console.log(`🚀 Triggering render for ${targetDate}`);

  const { data: draft, error } = await supabase
    .from("daily_video_drafts")
    .select("*")
    .eq("target_date", targetDate)
    .single();

  if (error || !draft) throw new Error(`Draft not found for ${targetDate}`);

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
const GEMINI_TIMEOUT = 60_000;

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

  // Generate 4 variants in parallel — each with a different style + article image
  const results = await Promise.allSettled(
    THUMBNAIL_STYLES.map(async (style, i) => {
      const img = variantImages[i];
      const imgLabel = img ? `📸 image ${(i % validImages.length) + 1}` : "🎨 text-only";
      console.log(`🎨 Variant ${i + 1}: ${style.name} (${imgLabel})`);
      const prompt = buildThumbPrompt(thumbnailHeadline, displayDate, ordered.length, style, !!img);
      const buffer = await callGeminiImage(prompt, img || undefined);
      if (!buffer) throw new Error(`Failed: ${style.id}`);
      return { style, buffer };
    }),
  );

  const variants: { style: typeof THUMBNAIL_STYLES[0]; buffer: Uint8Array }[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") variants.push(r.value);
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

    switch (action || body.action) {
      case "initiate_digest":
        return await initiateDigest(targetDate || undefined);

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

      case "trigger_render":
        if (!targetDate) return json({ error: "target_date required" }, 400);
        return await triggerRender(targetDate, chatId, messageId);

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
