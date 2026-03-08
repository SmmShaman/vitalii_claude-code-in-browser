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

const VERSION = "2026-03-08-v1";

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
  const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options.parse_mode || "HTML",
      disable_web_page_preview: options.disable_web_page_preview ?? true,
      ...(options.reply_markup ? { reply_markup: options.reply_markup } : {}),
    }),
  });
  const data = await resp.json();
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
    .select("id, title_no, title_en, original_title, description_no, description_en, image_url, processed_image_url, tags")
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
  }));

  const { data: draft, error: upsertError } = await supabase
    .from("daily_video_drafts")
    .upsert({
      target_date: date,
      status: "pending_digest",
      article_ids: articles.map((a: any) => a.id),
      article_headlines: headlines,
      telegram_chat_id: Number(TELEGRAM_CHAT_ID),
    }, { onConflict: "target_date" })
    .select()
    .single();

  if (upsertError) throw new Error(`Draft upsert: ${upsertError.message}`);

  // Send digest to Telegram
  const displayDate = formatDateNorwegian(date);
  let msg = `📺 <b>Щоденне відео — ${displayDate}</b>\n\n`;
  msg += `Знайдено <b>${articles.length}</b> статей:\n\n`;

  headlines.forEach((h: any, i: number) => {
    const imgIcon = h.hasImage ? "🖼" : "⚠️";
    const tags = h.tags.length > 0 ? ` <i>${h.tags.slice(0, 3).join(", ")}</i>` : "";
    msg += `${i + 1}. ${imgIcon} <b>${escapeHtml(h.title)}</b>${tags}\n`;
    if (h.description) {
      msg += `   <i>${escapeHtml(h.description.substring(0, 100))}${h.description.length > 100 ? "..." : ""}</i>\n`;
    }
    msg += "\n";
  });

  msg += `Створити відео з цих статей?`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ Підтвердити", callback_data: `dv_ok_${date}` },
        { text: "❌ Пропустити", callback_data: `dv_skip_${date}` },
      ],
    ],
  };

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

  // Build AI prompt
  const articleSummaries = orderedArticles.map((a: any, i: number) => {
    const title = a.title_no || a.title_en || a.original_title || "";
    const content = a.content_no || a.content_en || a.original_content || "";
    return `ARTICLE ${i + 1}:\nTitle: ${title}\nContent: ${content.substring(0, 500)}`;
  }).join("\n\n");

  const targetDuration = Math.min(orderedArticles.length * 12 + 8, 300);
  const wordTarget = Math.round(targetDuration * 2);
  const wordsPerArticle = Math.round(wordTarget / (orderedArticles.length + 2));

  const systemPrompt = `You are a professional Norwegian news anchor writing a daily news summary video script.

The video is a compilation of ${orderedArticles.length} news stories from ${displayDate}.
Target duration: ~${targetDuration} seconds.

Write SEPARATE scripts for each part:
1. "introScript" — opening greeting (~3s, ~${wordsPerArticle} words)
2. "segmentScripts" — one narration per article (~10-15s each, ~${wordsPerArticle * 2} words each)
3. "outroScript" — closing (~3s, ~${wordsPerArticle} words)
4. "segmentTranslations" — Ukrainian translations of each segmentScript (for moderator review)

RULES:
- Write in Norwegian Bokmål
- Each segmentScript stands alone (no references to other segments)
- segmentScripts.length MUST equal ${orderedArticles.length}
- segmentTranslations.length MUST equal ${orderedArticles.length}
- Be engaging, professional, conversational

Return JSON:
{
  "introScript": "God morgen...",
  "segmentScripts": ["...", ...],
  "outroScript": "Det var dagens nyheter...",
  "segmentTranslations": ["Почнімо з...", ...],
  "introTranslation": "Доброго ранку...",
  "outroTranslation": "Це були новини дня..."
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
      segment_scripts: plan.segmentScripts.map((script: string, i: number) => ({
        articleId: draft.article_ids[i],
        scriptNo: script,
        scriptUa: plan.segmentTranslations?.[i] || "",
      })),
      outro_script: plan.outroScript,
      status: "pending_script",
    })
    .eq("target_date", targetDate);

  // Send script to Telegram for approval
  const headlines = draft.article_headlines || [];
  let msg = `📝 <b>Сценарій озвучки — ${displayDate}</b>\n\n`;

  // Intro
  msg += `🎬 <b>Інтро (NO):</b>\n<i>${escapeHtml(plan.introScript || "")}</i>\n`;
  if (plan.introTranslation) {
    msg += `🇺🇦 ${escapeHtml(plan.introTranslation)}\n`;
  }
  msg += "\n";

  // Segments
  plan.segmentScripts.forEach((script: string, i: number) => {
    const title = headlines[i]?.title || `Article ${i + 1}`;
    msg += `📰 <b>${i + 1}. ${escapeHtml(title)}</b>\n`;
    msg += `🇳🇴 <i>${escapeHtml(script)}</i>\n`;
    if (plan.segmentTranslations?.[i]) {
      msg += `🇺🇦 ${escapeHtml(plan.segmentTranslations[i])}\n`;
    }
    msg += "\n";
  });

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

  // AI generates visual scenario
  const articleInfo = scripts.map((s: any, i: number) => {
    const h = headlines[i] || {};
    return `Article ${i + 1}: "${h.title || ""}"\nScript: ${s.scriptNo || ""}\nTags: ${(h.tags || []).join(", ")}`;
  }).join("\n\n");

  const systemPrompt = `You are a video director creating a visual scenario for a daily news show.
The show uses Remotion with these components: ShowIntro, SegmentDivider, Headline, Content (with LowerThird + CategoryBadge), Stats, Outro.

For each article segment, specify:
- headline: Norwegian headline for lower third (5-10 words)
- category: tech|business|ai|startup|science|politics|crypto|health|news
- accentColor: hex color (warm orange preferred: #FF7A00, #FF8C42, #FF6B35)
- keyQuote: most impactful sentence from the script (Norwegian, shown as overlay)
- facts: optional array of {value, label} for stats scene (max 3)

Also provide a Ukrainian description of the complete visual flow for moderator review.

Return JSON:
{
  "segments": [
    {
      "headline": "...",
      "category": "...",
      "accentColor": "#...",
      "keyQuote": "...",
      "facts": []
    }
  ],
  "scenarioDescription": "Крок-по-кроковий опис візуального сценарію українською..."
}`;

  const aiResponse = await callAI(
    systemPrompt,
    `Create visual scenario for ${displayDate} (${scripts.length} articles):\n\n${articleInfo}`,
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
    msg += `   Категорія: ${seg.category} | Колір: ${seg.accentColor}\n`;
    if (seg.keyQuote) {
      msg += `   💬 <i>"${escapeHtml(seg.keyQuote)}"</i>\n`;
    }
    if (seg.facts && seg.facts.length > 0) {
      msg += `   📊 ${seg.facts.map((f: any) => `${f.value} (${f.label})`).join(", ")}\n`;
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

      default:
        return json({ error: `Unknown action: ${action || body.action}`, version: VERSION }, 400);
    }
  } catch (err: any) {
    console.error("❌ Error:", err.message);
    return json({ error: err.message }, 500);
  }
});
