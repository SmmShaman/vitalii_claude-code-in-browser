import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { triggerVideoProcessing, isGitHubActionsEnabled, triggerLinkedInVideo, triggerFacebookVideo, triggerInstagramVideo } from '../_shared/github-actions.ts'
import { escapeHtml } from '../_shared/social-media-helpers.ts'

/**
 * Telegram Webhook Worker
 *
 * Handles heavy background operations dispatched from telegram-webhook.
 * The webhook answers Telegram immediately and dispatches tasks here.
 * This worker executes the heavy work and sends results back to Telegram.
 */

interface WorkerTask {
  action: string
  params: Record<string, any>
  telegram: {
    chatId: number
    messageId: number
    messageText: string
  }
  queueId?: string
}

// Helper: truncate messageText + appendedText to fit Telegram 4096 char limit
function truncateForTelegram(original: string, appended: string, limit = 4000): string {
  const combined = original + appended
  if (combined.length <= limit) return combined
  console.log(`⚠️ Message too long (${combined.length}), truncating original to fit`)
  const maxOriginalLength = limit - appended.length - 50
  return original.substring(0, maxOriginalLength) + '\n\n<i>... (скорочено)</i>' + appended
}

// Helper: edit Telegram message
async function editMessage(
  botToken: string,
  chatId: number,
  messageId: number,
  text: string,
  replyMarkup?: any,
  disableWebPagePreview = false
): Promise<boolean> {
  try {
    const body: any = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
    }
    if (replyMarkup) body.reply_markup = replyMarkup
    if (disableWebPagePreview) body.disable_web_page_preview = true

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/editMessageText`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    )
    if (!response.ok) {
      const errText = await response.text()
      console.error('❌ editMessageText failed:', errText)
      return false
    }
    return true
  } catch (err) {
    console.error('❌ editMessage error:', err)
    return false
  }
}

// Helper: send new Telegram message (fallback if edit fails)
async function sendMessage(
  botToken: string,
  chatId: number,
  text: string,
  replyMarkup?: any,
  disableWebPagePreview = false
): Promise<boolean> {
  try {
    const body: any = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }
    if (replyMarkup) body.reply_markup = replyMarkup
    if (disableWebPagePreview) body.disable_web_page_preview = true

    await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    )
    return true
  } catch (err) {
    console.error('❌ sendMessage error:', err)
    return false
  }
}

// Helper: edit message with fallback to new message
async function editOrSend(
  botToken: string,
  chatId: number,
  messageId: number,
  text: string,
  replyMarkup?: any,
  disableWebPagePreview = false
): Promise<void> {
  const success = await editMessage(botToken, chatId, messageId, text, replyMarkup, disableWebPagePreview)
  if (!success) {
    // Fallback: send a new message with just the results part
    console.log('📤 Fallback: sending new message')
    await sendMessage(botToken, chatId, text, replyMarkup, disableWebPagePreview)
  }
}

// Helper: poll DB until is_rewritten flag is set (for optimistic pipeline)
async function waitForRewrite(
  supabase: any,
  newsId: string,
  maxWaitMs = 180000,
  intervalMs = 5000
): Promise<boolean> {
  const startTime = Date.now()
  while (Date.now() - startTime < maxWaitMs) {
    const { data } = await supabase
      .from('news')
      .select('is_rewritten')
      .eq('id', newsId)
      .single()
    if (data?.is_rewritten) return true
    console.log(`⏳ waitForRewrite: ${newsId} not ready, waiting ${intervalMs}ms...`)
    await new Promise(r => setTimeout(r, intervalMs))
  }
  console.error(`❌ waitForRewrite: timeout after ${maxWaitMs}ms for ${newsId}`)
  return false
}

// =================================================================
// Social media keyboard builders (reused across handlers)
// =================================================================

function buildSocialKeyboard(newsId: string) {
  return {
    inline_keyboard: [
      [
        { text: '🌐 Все EN', callback_data: `all_en_${newsId}` },
        { text: '🌐 Все NO', callback_data: `all_no_${newsId}` },
        { text: '🌐 Все UA', callback_data: `all_ua_${newsId}` }
      ],
      [
        { text: '🔗+📘+📸 EN', callback_data: `combo_li_fb_ig_en_${newsId}` },
        { text: '🔗+📘+📸 NO', callback_data: `combo_li_fb_ig_no_${newsId}` },
        { text: '🔗+📘+📸 UA', callback_data: `combo_li_fb_ig_ua_${newsId}` }
      ],
      [
        { text: '🔗 LinkedIn EN', callback_data: `linkedin_en_${newsId}` },
        { text: '🔗 LinkedIn NO', callback_data: `linkedin_no_${newsId}` },
        { text: '🔗 LinkedIn UA', callback_data: `linkedin_ua_${newsId}` }
      ],
      [
        { text: '📘 Facebook EN', callback_data: `facebook_en_${newsId}` },
        { text: '📘 Facebook NO', callback_data: `facebook_no_${newsId}` },
        { text: '📘 Facebook UA', callback_data: `facebook_ua_${newsId}` }
      ],
      [
        { text: '📸 Instagram EN', callback_data: `instagram_en_${newsId}` },
        { text: '📸 Instagram NO', callback_data: `instagram_no_${newsId}` },
        { text: '📸 Instagram UA', callback_data: `instagram_ua_${newsId}` }
      ],
      [
        { text: '🐦 Twitter EN', callback_data: `twitter_en_${newsId}` },
        { text: '🐦 Twitter NO', callback_data: `twitter_no_${newsId}` },
        { text: '🐦 Twitter UA', callback_data: `twitter_ua_${newsId}` }
      ],
      [
        { text: '🎵 TikTok', callback_data: `tiktok_${newsId}` },
        { text: '⏭️ Skip', callback_data: `skip_social_${newsId}` }
      ]
    ]
  }
}

function buildSocialKeyboardRss(newsId: string) {
  return {
    inline_keyboard: [
      [
        { text: '🌐 Все EN', callback_data: `all_en_${newsId}` },
        { text: '🌐 Все NO', callback_data: `all_no_${newsId}` },
        { text: '🌐 Все UA', callback_data: `all_ua_${newsId}` }
      ],
      [
        { text: '🔗+📘+📸 EN', callback_data: `combo_li_fb_ig_en_${newsId}` },
        { text: '🔗+📘+📸 NO', callback_data: `combo_li_fb_ig_no_${newsId}` },
        { text: '🔗+📘+📸 UA', callback_data: `combo_li_fb_ig_ua_${newsId}` }
      ],
      [
        { text: '🔗 LinkedIn EN', callback_data: `linkedin_en_${newsId}` },
        { text: '🔗 LinkedIn NO', callback_data: `linkedin_no_${newsId}` },
        { text: '🔗 LinkedIn UA', callback_data: `linkedin_ua_${newsId}` }
      ],
      [
        { text: '📘 Facebook EN', callback_data: `facebook_en_${newsId}` },
        { text: '📘 Facebook NO', callback_data: `facebook_no_${newsId}` },
        { text: '📘 Facebook UA', callback_data: `facebook_ua_${newsId}` }
      ],
      [
        { text: '📸 Instagram EN', callback_data: `instagram_en_${newsId}` },
        { text: '📸 Instagram NO', callback_data: `instagram_no_${newsId}` },
        { text: '📸 Instagram UA', callback_data: `instagram_ua_${newsId}` }
      ],
      [
        { text: '⏭️ Skip', callback_data: `skip_social_${newsId}` }
      ]
    ]
  }
}

// Helper: post to a social platform and return result
async function postToSocialPlatform(
  supabaseUrl: string,
  authKey: string,
  endpoint: string,
  requestBody: Record<string, any>
): Promise<{ success: boolean; postUrl?: string; postId?: string; error?: string; alreadyPosted?: boolean; videoProcessing?: boolean }> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
    const result = await response.json()
    if (!response.ok || !result.success) {
      return { success: false, error: result.error || 'Unknown error', alreadyPosted: result.alreadyPosted, videoProcessing: result.videoProcessing }
    }
    return { success: true, postUrl: result.postUrl, postId: result.postId, videoProcessing: result.videoProcessing }
  } catch (e: any) {
    return { success: false, error: e.message || 'Request failed' }
  }
}

// Helper: build content request body for social posting
function buildSocialRequestBody(contentType: string, contentId: string, language: string): Record<string, any> {
  const body: Record<string, any> = { language, contentType }
  if (contentType === 'blog') {
    body.blogPostId = contentId
  } else {
    body.newsId = contentId
  }
  return body
}

// =================================================================
// Main worker handler
// =================================================================

serve(async (req) => {
  const startTime = Date.now()

  try {
    const task: WorkerTask = await req.json()
    const { action, params, telegram } = task
    const { chatId, messageId, messageText } = telegram

    console.log(`🔧 Worker received: action=${action}, params=${JSON.stringify(params)}, queueId=${task.queueId || 'none'}`)

    const queueId = task.queueId

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Mark as processing if part of a queue
    if (queueId) {
      await supabase
        .from('moderation_queue')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', queueId)
    }

    // =================================================================
    // PUBLISH: AI rewriting via process-news / process-blog-post
    // =================================================================
    if (action === 'publish') {
      const { newsId, publicationType } = params
      console.log(`📰 Worker: Publishing ${publicationType} for ${newsId}`)

      const { data: news, error: fetchError } = await supabase
        .from('news')
        .select('*')
        .eq('id', newsId)
        .single()

      if (fetchError || !news) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          messageText + '\n\n❌ <b>Помилка:</b> Новина не знайдена')
        return new Response(JSON.stringify({ ok: false }))
      }

      // Trigger video processing if needed
      if (news.video_type === 'telegram_embed' && news.video_url && isGitHubActionsEnabled()) {
        const triggerResult = await triggerVideoProcessing({ newsId, mode: 'single' })
        if (triggerResult.success) {
          console.log('✅ GitHub Action triggered for video processing')
        }
      }

      const processingEndpoint = publicationType === 'blog' ? 'process-blog-post' : 'process-news'

      const processResponse = await fetch(`${SUPABASE_URL}/functions/v1/${processingEndpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newsId,
          title: news.original_title || '',
          content: news.original_content || '',
          url: news.original_url || '',
          imageUrl: news.processed_image_url || news.image_url || null,
          videoUrl: news.video_url || null,
          videoType: news.video_type || null,
          sourceLink: news.source_link || null,
          sourceLinks: news.source_links || []
        })
      })

      if (!processResponse.ok) {
        const errorText = await processResponse.text()
        console.error('❌ Process failed:', errorText)
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          truncateForTelegram(messageText, `\n\n❌ <b>AI processing error</b> (${publicationType})`),
          buildSocialKeyboard(newsId))
        return new Response(JSON.stringify({ ok: false }))
      }

      // Update SAME message with result + keep social buttons
      const statusLabel = publicationType === 'blog' ? 'BLOG' : 'NEWS'
      await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
        truncateForTelegram(messageText, `\n\n✅ <b>PUBLISHED TO ${statusLabel}</b>\n📱 <i>Оберіть соцмережі для публікації:</i>`),
        buildSocialKeyboard(newsId))

      console.log(`✅ Worker: ${publicationType} published in ${Date.now() - startTime}ms`)

      // =================================================================
      // PUBLISH_RSS: AI rewriting via process-rss-news / process-blog-post
      // =================================================================
    } else if (action === 'publish_rss') {
      const { newsId, publicationType } = params
      console.log(`📰 Worker: Publishing RSS ${publicationType} for ${newsId}`)

      const { data: news, error: fetchError } = await supabase
        .from('news')
        .select('*')
        .eq('id', newsId)
        .single()

      if (fetchError || !news) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          messageText + '\n\n❌ <b>Помилка:</b> Новина не знайдена')
        return new Response(JSON.stringify({ ok: false }))
      }

      const processingEndpoint = publicationType === 'blog' ? 'process-blog-post' : 'process-rss-news'

      const processResponse = await fetch(`${SUPABASE_URL}/functions/v1/${processingEndpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newsId,
          title: news.original_title || '',
          content: news.original_content || '',
          url: news.rss_source_url || news.original_url || '',
          imageUrl: news.processed_image_url || news.image_url || null,
          images: news.images || [],
          imagesWithMeta: news.images_with_meta || []
        })
      })

      if (!processResponse.ok) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          truncateForTelegram(messageText, `\n\n❌ <b>AI processing error</b> (RSS ${publicationType})`),
          buildSocialKeyboardRss(newsId))
        return new Response(JSON.stringify({ ok: false }))
      }

      // Update SAME message with result + keep RSS social buttons
      const statusLabel = publicationType === 'blog' ? 'BLOG (RSS)' : 'NEWS (RSS)'
      await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
        truncateForTelegram(messageText, `\n\n✅ <b>PUBLISHED TO ${statusLabel}</b>\n📱 <i>Оберіть соцмережі для публікації:</i>`),
        buildSocialKeyboardRss(newsId))

      console.log(`✅ Worker: RSS ${publicationType} published in ${Date.now() - startTime}ms`)

      // =================================================================
      // LINKEDIN: Post to LinkedIn
      // =================================================================
    } else if (action === 'linkedin') {
      const { newsId, linkedinLanguage } = params
      const langLabel = linkedinLanguage.toUpperCase()
      console.log(`🔗 Worker: Posting to LinkedIn (${langLabel}) for ${newsId}`)

      let news: any
      const { data: newsData } = await supabase.from('news').select('*').eq('id', newsId).single()
      news = newsData
      if (!news) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          messageText + '\n\n❌ <b>Помилка:</b> Новина не знайдена')
        return new Response(JSON.stringify({ ok: false }))
      }

      // Wait for AI rewrite if not ready (optimistic pipeline)
      if (!news.is_rewritten) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          messageText + `\n\n⏳ <b>Очікую завершення AI рерайту...</b>`)
        const ready = await waitForRewrite(supabase, newsId)
        if (!ready) {
          await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
            messageText + `\n\n❌ <b>Таймаут:</b> AI рерайт не завершився за 3 хвилини`)
          return new Response(JSON.stringify({ ok: false }))
        }
        // Refetch with translations
        const { data: refreshed } = await supabase.from('news').select('*').eq('id', newsId).single()
        if (refreshed) news = refreshed
      }

      // Check for blog post
      const { data: blogPost } = await supabase.from('blog_posts').select('*').eq('source_news_id', newsId).single()
      const contentType = blogPost ? 'blog' : 'news'
      const contentId = blogPost ? blogPost.id : newsId
      const checkRecord = blogPost || news

      // Check video for native LinkedIn video upload
      const hasVideo = news.original_video_url && news.original_video_url.includes('t.me')
      if (hasVideo && isGitHubActionsEnabled()) {
        const triggerResult = await triggerLinkedInVideo({ newsId, language: linkedinLanguage as 'en' | 'no' | 'ua' })
        if (triggerResult.success) {
          const processingText = messageText + `\n\n⏳ <b>Відео завантажується в LinkedIn (${langLabel})...</b>\n🎬 Це може зайняти 1-2 хвилини`
          await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId, processingText)
          // Save context for GitHub Actions to edit later
          await supabase.from('news').update({
            telegram_chat_id: chatId,
            telegram_message_id: messageId,
            telegram_message_text: processingText
          }).eq('id', newsId)
          return new Response(JSON.stringify({ ok: true, videoProcessing: true }))
        }
      }

      // Regular text+image posting
      const requestBody = buildSocialRequestBody(contentType, contentId, linkedinLanguage)
      const result = await postToSocialPlatform(SUPABASE_URL, SUPABASE_ANON_KEY, 'post-to-linkedin', requestBody)

      if (!result.success) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          messageText + `\n\n❌ <b>LinkedIn ${langLabel}:</b> ${result.error}`, undefined, true)
        return new Response(JSON.stringify({ ok: false }))
      }

      // Build result message
      const linkedinPostUrl = result.postUrl || (result.postId ? `https://www.linkedin.com/feed/update/${result.postId}` : null)
      const linkedinStatusText = linkedinPostUrl
        ? `\n\n🔗 LinkedIn ${langLabel}: <a href="${linkedinPostUrl}">Переглянути пост</a>`
        : `\n\n✅ LinkedIn ${langLabel}: Опубліковано`

      // Build remaining buttons
      const allLanguages = ['en', 'no', 'ua']
      const remainingLanguages = allLanguages.filter(l => l !== linkedinLanguage)
      const buttonRows = []
      if (remainingLanguages.length > 0) {
        buttonRows.push(remainingLanguages.map(lang => ({
          text: `🔗 LinkedIn ${lang.toUpperCase()}`,
          callback_data: `linkedin_${lang}_${newsId}`
        })))
      }
      buttonRows.push([
        { text: '📘 Facebook EN', callback_data: `facebook_en_${newsId}` },
        { text: '📘 Facebook NO', callback_data: `facebook_no_${newsId}` },
        { text: '📘 Facebook UA', callback_data: `facebook_ua_${newsId}` }
      ])
      buttonRows.push([
        { text: '📸 Instagram EN', callback_data: `instagram_en_${newsId}` },
        { text: '📸 Instagram NO', callback_data: `instagram_no_${newsId}` },
        { text: '📸 Instagram UA', callback_data: `instagram_ua_${newsId}` }
      ])
      buttonRows.push([
        { text: '🐦 Twitter EN', callback_data: `twitter_en_${newsId}` },
        { text: '🐦 Twitter NO', callback_data: `twitter_no_${newsId}` },
        { text: '🐦 Twitter UA', callback_data: `twitter_ua_${newsId}` }
      ])
      buttonRows.push([
        { text: '🎵 TikTok', callback_data: `tiktok_${newsId}` },
        { text: '⏭️ Skip', callback_data: `skip_social_${newsId}` }
      ])

      await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
        messageText + linkedinStatusText,
        { inline_keyboard: buttonRows }, true)

      console.log(`✅ Worker: LinkedIn ${langLabel} posted in ${Date.now() - startTime}ms`)

      // =================================================================
      // SOCIAL_POST: Facebook/Instagram posting
      // =================================================================
    } else if (action === 'social_post') {
      const { newsId, socialPlatform, socialLanguage } = params
      const langLabel = socialLanguage.toUpperCase()
      const platformEmoji = socialPlatform === 'facebook' ? '📘' : '📸'
      const platformName = socialPlatform.charAt(0).toUpperCase() + socialPlatform.slice(1)
      console.log(`${platformEmoji} Worker: Posting to ${platformName} (${langLabel}) for ${newsId}`)

      let news: any
      const { data: newsData } = await supabase.from('news').select('*').eq('id', newsId).single()
      news = newsData
      if (!news) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          messageText + '\n\n❌ <b>Помилка:</b> Новина не знайдена')
        return new Response(JSON.stringify({ ok: false }))
      }

      // Wait for AI rewrite if not ready (optimistic pipeline)
      if (!news.is_rewritten) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          messageText + `\n\n⏳ <b>Очікую завершення AI рерайту...</b>`)
        const ready = await waitForRewrite(supabase, newsId)
        if (!ready) {
          await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
            messageText + `\n\n❌ <b>Таймаут:</b> AI рерайт не завершився за 3 хвилини`)
          return new Response(JSON.stringify({ ok: false }))
        }
        const { data: refreshed } = await supabase.from('news').select('*').eq('id', newsId).single()
        if (refreshed) news = refreshed
      }

      // Instagram media validation
      if (socialPlatform === 'instagram') {
        const hasImage = !!(news.processed_image_url || news.image_url)
        const isValidVideoUrl = (url: string | null | undefined): boolean => {
          if (!url) return false
          if (url.match(/^https?:\/\/t\.me\/[^\/]+\/\d+/)) return false
          const validExtensions = ['.mp4', '.mov', '.avi', '.webm', '.m4v']
          const hasVideoExtension = validExtensions.some(ext => url.toLowerCase().includes(ext))
          const isTelegramFileApi = url.includes('api.telegram.org/file/')
          return hasVideoExtension || isTelegramFileApi
        }
        const hasValidVideo = isValidVideoUrl(news.original_video_url) ||
          (news.video_type !== 'youtube' && news.video_type !== 'telegram_embed' && isValidVideoUrl(news.video_url))

        const hasTelegramVideo = !!(
          news.original_video_url?.match(/^https?:\/\/t\.me\/[^\/]+\/\d+/) ||
          (news.video_type === 'telegram_embed' && news.video_url?.match(/^https?:\/\/t\.me\/[^\/]+\/\d+/))
        )

        // Try GitHub Actions for video
        if (!hasValidVideo && hasTelegramVideo && isGitHubActionsEnabled()) {
          const igResult = await triggerInstagramVideo({ newsId, language: socialLanguage as 'en' | 'no' | 'ua' })
          if (igResult.success) {
            const processingText = messageText +
              `\n\n⏳ <b>Instagram Reel (${langLabel}) обробляється...</b>\n<i>Відео завантажується з Telegram → Instagram. Це займе 2-5 хвилин.</i>`
            await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId, processingText, undefined, true)
            await supabase.from('news').update({
              telegram_chat_id: chatId, telegram_message_id: messageId, telegram_message_text: processingText
            }).eq('id', newsId)
            return new Response(JSON.stringify({ ok: true, videoProcessing: true }))
          }
        }

        // Auto-generate image if no media
        if (!hasImage && !hasValidVideo && news.image_generation_prompt) {
          console.log('🎨 Auto-generating image for Instagram...')
          await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
            messageText + `\n\n🎨 <b>Генерую зображення для Instagram (${langLabel})...</b>`)
          try {
            const imageGenResponse = await fetch(`${SUPABASE_URL}/functions/v1/process-image`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ newsId, generateFromPrompt: true })
            })
            if (imageGenResponse.ok) {
              const imageGenResult = await imageGenResponse.json()
              if (imageGenResult.success && imageGenResult.processedImageUrl) {
                news.processed_image_url = imageGenResult.processedImageUrl
                await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
                  messageText + `\n\n🤖 <b>AI згенерував зображення!</b>\n⏳ <i>Публікую в Instagram (${langLabel})...</i>`, undefined, true)
              }
            }
          } catch (genErr: any) {
            console.error('❌ Auto-gen failed:', genErr.message)
          }
        }

        // If still no media, prompt for upload
        if (!news.processed_image_url && !news.image_url && !hasValidVideo) {
          const uploadText = messageText +
            `\n\n📸 <b>Instagram потребує зображення!</b>\n<i>Відповідь на це повідомлення з фото для публікації в Instagram (${langLabel})</i>\n<code>instagram_${socialLanguage}:${newsId}</code>`
          await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId, uploadText, undefined, true)
          return new Response(JSON.stringify({ ok: true, needsImage: true }))
        }
      }

      // Check for blog post
      const { data: blogPost } = await supabase.from('blog_posts').select('*').eq('source_news_id', newsId).single()
      const contentType = blogPost ? 'blog' : 'news'
      const contentId = blogPost ? blogPost.id : newsId

      const endpoint = socialPlatform === 'facebook' ? 'post-to-facebook' : 'post-to-instagram'
      const requestBody = buildSocialRequestBody(contentType, contentId, socialLanguage)
      const result = await postToSocialPlatform(SUPABASE_URL, SUPABASE_ANON_KEY, endpoint, requestBody)

      // Handle video processing response (Facebook)
      if (result.videoProcessing && socialPlatform === 'facebook') {
        const processingText = messageText + `\n\n📘 <b>Facebook (${langLabel}): 🎬 Відео обробляється...</b>\n⏳ Це може зайняти 1-2 хвилини`
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId, processingText, undefined, true)
        await supabase.from('news').update({
          telegram_chat_id: chatId, telegram_message_id: messageId, telegram_message_text: processingText
        }).eq('id', newsId)
        return new Response(JSON.stringify({ ok: true, videoProcessing: true }))
      }

      if (!result.success) {
        const errMsg = result.alreadyPosted
          ? `⚠️ Already posted to ${socialPlatform}!`
          : `❌ ${platformName} error: ${result.error}`
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          messageText + `\n\n${errMsg}`, undefined, true)
        return new Response(JSON.stringify({ ok: false }))
      }

      // Build result
      const statusText = result.postUrl
        ? `\n\n${platformEmoji} ${platformName} ${langLabel}: <a href="${result.postUrl}">Переглянути пост</a>`
        : `\n\n✅ ${platformName} ${langLabel}: Опубліковано`

      const remainingButtons: any[] = []
      const allLanguages = ['en', 'no', 'ua']
      const remainingLangs = allLanguages.filter(l => l !== socialLanguage)
      for (const lang of remainingLangs) {
        remainingButtons.push({
          text: `${platformEmoji} ${platformName} ${lang.toUpperCase()}`,
          callback_data: `${socialPlatform}_${lang}_${newsId}`
        })
      }
      if (socialPlatform === 'facebook') {
        remainingButtons.push({ text: '📸 Instagram EN', callback_data: `instagram_en_${newsId}` })
      } else {
        remainingButtons.push({ text: '📘 Facebook EN', callback_data: `facebook_en_${newsId}` })
      }
      remainingButtons.push({ text: '🎵 TikTok', callback_data: `tiktok_${newsId}` })
      remainingButtons.push({ text: '⏭️ Skip', callback_data: `skip_social_${newsId}` })

      const rows: any[] = []
      for (let i = 0; i < remainingButtons.length; i += 2) {
        rows.push(remainingButtons.slice(i, i + 2))
      }

      await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
        messageText + statusText,
        rows.length > 0 ? { inline_keyboard: rows } : undefined, true)

      console.log(`✅ Worker: ${platformName} ${langLabel} posted in ${Date.now() - startTime}ms`)

      // =================================================================
      // POST_ALL: Post to ALL socials in one language (PARALLEL!)
      // =================================================================
    } else if (action === 'post_all') {
      const { newsId, socialLanguage } = params
      const langLabel = socialLanguage.toUpperCase()
      console.log(`🌐 Worker: Post ALL (${langLabel}) for ${newsId}`)

      let news: any
      const { data: newsData } = await supabase.from('news').select('*').eq('id', newsId).single()
      news = newsData
      if (!news) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          messageText + '\n\n❌ <b>Помилка:</b> Новина не знайдена')
        return new Response(JSON.stringify({ ok: false }))
      }

      // Wait for AI rewrite if not ready (optimistic pipeline)
      if (!news.is_rewritten) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          messageText + `\n\n⏳ <b>Очікую завершення AI рерайту...</b>`)
        const ready = await waitForRewrite(supabase, newsId)
        if (!ready) {
          await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
            messageText + `\n\n❌ <b>Таймаут:</b> AI рерайт не завершився за 3 хвилини`)
          return new Response(JSON.stringify({ ok: false }))
        }
        const { data: refreshed } = await supabase.from('news').select('*').eq('id', newsId).single()
        if (refreshed) news = refreshed
      }

      // Check for blog post
      const { data: blogPost } = await supabase.from('blog_posts').select('*').eq('source_news_id', newsId).single()
      const contentType = blogPost ? 'blog' : 'news'
      const contentId = blogPost ? blogPost.id : newsId
      const checkRecord = blogPost || news

      const titleField = `title_${socialLanguage}` as keyof typeof checkRecord
      if (!checkRecord[titleField]) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          messageText + `\n\n❌ <b>Error:</b> No ${langLabel} translation. Publish to News/Blog first!`)
        return new Response(JSON.stringify({ ok: false }))
      }

      const requestBody = buildSocialRequestBody(contentType, contentId, socialLanguage)

      // Check video for LinkedIn
      const hasVideo = news.original_video_url && news.original_video_url.includes('t.me')

      // === PARALLEL POSTING via Promise.allSettled ===
      const postPromises: Promise<{ platform: string; result: any }>[] = []

      // LinkedIn
      const linkedinAlreadyPosted = !!checkRecord.linkedin_post_id
      if (linkedinAlreadyPosted) {
        // Already posted - skip
      } else if (hasVideo && isGitHubActionsEnabled()) {
        postPromises.push(
          triggerLinkedInVideo({ newsId, language: socialLanguage as 'en' | 'no' | 'ua' })
            .then(r => ({ platform: 'LinkedIn', result: r.success ? { success: true, videoProcessing: true } : { success: false, error: r.error } }))
            .catch(e => ({ platform: 'LinkedIn', result: { success: false, error: e.message } }))
        )
      } else {
        postPromises.push(
          postToSocialPlatform(SUPABASE_URL, SUPABASE_ANON_KEY, 'post-to-linkedin', requestBody)
            .then(r => ({ platform: 'LinkedIn', result: r }))
        )
      }

      // Facebook (parallel)
      postPromises.push(
        postToSocialPlatform(SUPABASE_URL, SUPABASE_ANON_KEY, 'post-to-facebook', requestBody)
          .then(r => ({ platform: 'Facebook', result: r }))
      )

      // Instagram (parallel)
      postPromises.push(
        postToSocialPlatform(SUPABASE_URL, SUPABASE_ANON_KEY, 'post-to-instagram', requestBody)
          .then(r => ({ platform: 'Instagram', result: r }))
      )

      // Execute all in parallel!
      const postResults = await Promise.allSettled(postPromises)

      // Build results
      const results: { platform: string; success: boolean; error?: string; url?: string; processing?: boolean }[] = []

      // Add LinkedIn duplicate result if skipped
      if (linkedinAlreadyPosted) {
        const existingLang = ((checkRecord as any).linkedin_language || 'unknown').toUpperCase()
        results.push({
          platform: 'LinkedIn',
          success: true,
          url: `https://www.linkedin.com/feed/update/${(checkRecord as any).linkedin_post_id}`,
          error: `Вже опубліковано (${existingLang})`
        })
      }

      for (const settled of postResults) {
        if (settled.status === 'fulfilled') {
          const { platform, result } = settled.value
          if (result.videoProcessing) {
            results.push({ platform, success: true, processing: true, error: '⏳ Відео обробляється...' })
          } else if (result.success) {
            const postUrl = result.postUrl || (result.postId ? `https://www.linkedin.com/feed/update/${result.postId}` : undefined)
            results.push({ platform, success: true, url: postUrl })
          } else {
            results.push({ platform, success: false, error: result.error || 'Unknown error' })
          }
        } else {
          results.push({ platform: 'Unknown', success: false, error: settled.reason?.message || 'Failed' })
        }
      }

      // Generate Twitter share intent
      const teaserField = `social_teaser_twitter_${socialLanguage}` as keyof typeof news
      const titleContent = (news[titleField as keyof typeof news] || news.title_en || news.original_title || '') as string
      let tweetText = (news[teaserField] || titleContent) as string
      if (tweetText.length > 255) tweetText = tweetText.substring(0, 252) + '...'
      const slug = (news[`slug_${socialLanguage}` as keyof typeof news] || news.slug_en || newsId.substring(0, 8)) as string
      const articleUrl = `https://vitalii.no/news/${slug}`
      const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(articleUrl)}`
      results.push({ platform: 'Twitter', success: true, url: twitterIntentUrl })

      // Build results message
      const shortTitle = titleContent.length > 50 ? titleContent.substring(0, 47) + '...' : titleContent
      let resultsText = `\n\n🌐 <b>Результати публікації (${langLabel}):</b>\n\n`
      resultsText += `📰 «${escapeHtml(shortTitle)}»\n`
      resultsText += `📝 <a href="${articleUrl}">Читати на сайті</a>\n\n`

      for (const r of results) {
        if (r.success) {
          if (r.processing) {
            resultsText += `⏳ ${r.platform}: ${r.error || 'Відео обробляється...'}\n`
          } else if (r.platform === 'Twitter') {
            resultsText += `🐦 ${r.platform}: <a href="${r.url}">Натисніть для публікації</a>\n`
          } else if (r.url) {
            resultsText += `✅ ${r.platform}: <a href="${r.url}">Переглянути пост</a>\n`
          } else {
            resultsText += `✅ ${r.platform}: Опубліковано\n`
          }
        } else {
          resultsText += `❌ ${r.platform}: ${r.error}\n`
        }
      }

      await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
        messageText + resultsText, undefined, true)

      console.log(`✅ Worker: post_all ${langLabel} completed in ${Date.now() - startTime}ms`)

      // =================================================================
      // COMBO_LI_FB_EN: LinkedIn EN + Facebook EN (PARALLEL!)
      // =================================================================
    } else if (action === 'combo_li_fb_en') {
      const { newsId } = params
      console.log(`🔗📘 Worker: Combo LinkedIn + Facebook EN for ${newsId}`)

      let news: any
      const { data: newsData } = await supabase.from('news').select('*').eq('id', newsId).single()
      news = newsData
      if (!news) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          messageText + '\n\n❌ <b>Error:</b> News not found')
        return new Response(JSON.stringify({ ok: false }))
      }

      // Wait for AI rewrite if not ready (optimistic pipeline)
      if (!news.is_rewritten) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          messageText + `\n\n⏳ <b>Очікую завершення AI рерайту...</b>`)
        const ready = await waitForRewrite(supabase, newsId)
        if (!ready) {
          await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
            messageText + `\n\n❌ <b>Таймаут:</b> AI рерайт не завершився за 3 хвилини`)
          return new Response(JSON.stringify({ ok: false }))
        }
        const { data: refreshed } = await supabase.from('news').select('*').eq('id', newsId).single()
        if (refreshed) news = refreshed
      }

      const { data: blogPost } = await supabase.from('blog_posts').select('*').eq('source_news_id', newsId).single()
      const contentType = blogPost ? 'blog' : 'news'
      const contentId = blogPost ? blogPost.id : newsId
      const checkRecord = blogPost || news

      if (!checkRecord.title_en) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          messageText + '\n\n❌ <b>Error:</b> No EN translation. Publish first!')
        return new Response(JSON.stringify({ ok: false }))
      }

      const requestBody = buildSocialRequestBody(contentType, contentId, 'en')
      const results: { platform: string; success: boolean; error?: string; url?: string; processing?: boolean }[] = []

      const hasVideo = news.original_video_url && news.original_video_url.includes('t.me')
      const linkedinAlreadyPosted = !!checkRecord.linkedin_post_id

      // === PARALLEL: LinkedIn + Facebook ===
      const postPromises: Promise<{ platform: string; result: any }>[] = []

      if (linkedinAlreadyPosted) {
        const existingLang = ((checkRecord as any).linkedin_language || 'unknown').toUpperCase()
        results.push({
          platform: 'LinkedIn EN',
          success: true,
          url: `https://www.linkedin.com/feed/update/${(checkRecord as any).linkedin_post_id}`,
          error: `Вже опубліковано (${existingLang})`
        })
      } else if (hasVideo && isGitHubActionsEnabled()) {
        postPromises.push(
          triggerLinkedInVideo({ newsId, language: 'en' })
            .then(r => ({ platform: 'LinkedIn EN', result: r.success ? { success: true, videoProcessing: true } : { success: false, error: r.error } }))
            .catch(e => ({ platform: 'LinkedIn EN', result: { success: false, error: e.message } }))
        )
      } else {
        postPromises.push(
          postToSocialPlatform(SUPABASE_URL, SUPABASE_ANON_KEY, 'post-to-linkedin', requestBody)
            .then(r => ({ platform: 'LinkedIn EN', result: r }))
        )
      }

      postPromises.push(
        postToSocialPlatform(SUPABASE_URL, SUPABASE_ANON_KEY, 'post-to-facebook', requestBody)
          .then(r => ({ platform: 'Facebook EN', result: r }))
      )

      const postResultsSettled = await Promise.allSettled(postPromises)

      for (const settled of postResultsSettled) {
        if (settled.status === 'fulfilled') {
          const { platform, result } = settled.value
          if (result.videoProcessing) {
            results.push({ platform, success: true, processing: true, error: '⏳ Відео обробляється... (1-2 хв)' })
          } else if (result.success) {
            const postUrl = result.postUrl || (result.postId ? `https://www.linkedin.com/feed/update/${result.postId}` : undefined)
            results.push({ platform, success: true, url: postUrl })
          } else {
            results.push({ platform, success: false, error: result.error || 'Unknown error' })
          }
        } else {
          results.push({ platform: 'Unknown', success: false, error: settled.reason?.message || 'Failed' })
        }
      }

      // Build results text
      const title = (news.title_en || news.original_title || '') as string
      const shortTitleRaw = title.length > 50 ? title.substring(0, 47) + '...' : title
      const shortTitle = escapeHtml(shortTitleRaw)
      const slug = news.slug_en || newsId.substring(0, 8)
      const articleUrl = `https://vitalii.no/news/${slug}`

      let resultsText = '\n\n✅ <b>Опубліковано LinkedIn + Facebook EN:</b>\n\n'
      resultsText += `📰 «${shortTitle}»\n`
      resultsText += `📝 <a href="${articleUrl}">Читати на сайті</a>\n\n`

      for (const r of results) {
        if (r.success) {
          if (r.processing) {
            resultsText += `⏳ ${r.platform}: Відео обробляється... (1-2 хв)\n`
          } else if (r.url) {
            resultsText += `✅ ${r.platform}: <a href="${r.url}">Переглянути пост</a>\n`
          } else {
            resultsText += `✅ ${r.platform}: Опубліковано\n`
          }
        } else {
          resultsText += `❌ ${r.platform}: ${r.error}\n`
        }
      }

      const remainingButtons = [
        [
          { text: '🌐 Все UA', callback_data: `all_ua_${newsId}` },
          { text: '🌐 Все NO', callback_data: `all_no_${newsId}` }
        ],
        [
          { text: '🐦 Twitter EN', callback_data: `twitter_en_${newsId}` },
          { text: '📸 Instagram EN', callback_data: `instagram_en_${newsId}` }
        ],
        [
          { text: '🎵 TikTok', callback_data: `tiktok_${newsId}` },
          { text: '⏭️ Skip', callback_data: `skip_social_${newsId}` }
        ]
      ]

      let finalText = messageText + resultsText
      if (finalText.length > 4000) {
        const maxOriginalLength = 4000 - resultsText.length - 50
        finalText = messageText.substring(0, maxOriginalLength) + '\n\n<i>... (скорочено)</i>' + resultsText
      }

      await editOrSend(TELEGRAM_BOT_TOKEN, chatId, messageId,
        finalText,
        { inline_keyboard: remainingButtons }, true)

      console.log(`✅ Worker: combo_li_fb_en completed in ${Date.now() - startTime}ms`)

      // =================================================================
      // COMBO_LI_FB_IG: LinkedIn + Facebook + Instagram (PARALLEL!)
      // =================================================================
    } else if (action === 'combo_li_fb_ig') {
      const { newsId, socialLanguage } = params
      const langLabel = socialLanguage.toUpperCase()
      console.log(`🔗📘📸 Worker: Combo LI+FB+IG ${langLabel} for ${newsId}`)

      let news: any
      const { data: newsData } = await supabase.from('news').select('*').eq('id', newsId).single()
      news = newsData
      if (!news) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          messageText + '\n\n❌ <b>Error:</b> News not found')
        return new Response(JSON.stringify({ ok: false }))
      }

      // Wait for AI rewrite if not ready (optimistic pipeline)
      if (!news.is_rewritten) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          messageText + `\n\n⏳ <b>Очікую завершення AI рерайту...</b>`)
        const ready = await waitForRewrite(supabase, newsId)
        if (!ready) {
          await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
            messageText + `\n\n❌ <b>Таймаут:</b> AI рерайт не завершився за 3 хвилини`)
          return new Response(JSON.stringify({ ok: false }))
        }
        const { data: refreshed } = await supabase.from('news').select('*').eq('id', newsId).single()
        if (refreshed) news = refreshed
      }

      const { data: blogPost } = await supabase.from('blog_posts').select('*').eq('source_news_id', newsId).single()
      const contentType = blogPost ? 'blog' : 'news'
      const contentId = blogPost ? blogPost.id : newsId
      const checkRecord = blogPost || news

      const titleField = `title_${socialLanguage}` as keyof typeof checkRecord
      if (!checkRecord[titleField]) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          messageText + `\n\n❌ <b>Error:</b> No ${langLabel} translation. Publish first!`)
        return new Response(JSON.stringify({ ok: false }))
      }

      const requestBody = buildSocialRequestBody(contentType, contentId, socialLanguage)
      const results: { platform: string; success: boolean; error?: string; url?: string; processing?: boolean }[] = []

      const hasVideo = news.original_video_url && news.original_video_url.includes('t.me')
      const linkedinAlreadyPosted = !!checkRecord.linkedin_post_id

      // === PARALLEL: LinkedIn + Facebook + Instagram ===
      const postPromises: Promise<{ platform: string; result: any }>[] = []

      if (linkedinAlreadyPosted) {
        const existingLang = ((checkRecord as any).linkedin_language || 'unknown').toUpperCase()
        results.push({
          platform: `LinkedIn ${langLabel}`,
          success: true,
          url: `https://www.linkedin.com/feed/update/${(checkRecord as any).linkedin_post_id}`,
          error: `Вже опубліковано (${existingLang})`
        })
      } else if (hasVideo && isGitHubActionsEnabled()) {
        postPromises.push(
          triggerLinkedInVideo({ newsId, language: socialLanguage as 'en' | 'no' | 'ua' })
            .then(r => ({ platform: `LinkedIn ${langLabel}`, result: r.success ? { success: true, videoProcessing: true } : { success: false, error: r.error } }))
            .catch(e => ({ platform: `LinkedIn ${langLabel}`, result: { success: false, error: e.message } }))
        )
      } else {
        postPromises.push(
          postToSocialPlatform(SUPABASE_URL, SUPABASE_ANON_KEY, 'post-to-linkedin', requestBody)
            .then(r => ({ platform: `LinkedIn ${langLabel}`, result: r }))
        )
      }

      postPromises.push(
        postToSocialPlatform(SUPABASE_URL, SUPABASE_ANON_KEY, 'post-to-facebook', requestBody)
          .then(r => ({ platform: `Facebook ${langLabel}`, result: r }))
      )

      // Instagram - check for video trigger
      if (hasVideo && isGitHubActionsEnabled()) {
        postPromises.push(
          triggerInstagramVideo({ newsId, language: socialLanguage as 'en' | 'no' | 'ua' })
            .then(r => ({ platform: `Instagram ${langLabel}`, result: r.success ? { success: true, videoProcessing: true } : { success: false, error: r.error } }))
            .catch(e => ({ platform: `Instagram ${langLabel}`, result: { success: false, error: e.message } }))
        )
      } else {
        postPromises.push(
          postToSocialPlatform(SUPABASE_URL, SUPABASE_ANON_KEY, 'post-to-instagram', requestBody)
            .then(r => ({ platform: `Instagram ${langLabel}`, result: r }))
        )
      }

      const postResultsSettled = await Promise.allSettled(postPromises)

      for (const settled of postResultsSettled) {
        if (settled.status === 'fulfilled') {
          const { platform, result } = settled.value
          if (result.videoProcessing) {
            results.push({ platform, success: true, processing: true, error: '⏳ Відео обробляється...' })
          } else if (result.success) {
            const postUrl = result.postUrl || (result.postId ? `https://www.linkedin.com/feed/update/${result.postId}` : undefined)
            results.push({ platform, success: true, url: postUrl })
          } else {
            results.push({ platform, success: false, error: result.error || 'Unknown error' })
          }
        } else {
          results.push({ platform: 'Unknown', success: false, error: settled.reason?.message || 'Failed' })
        }
      }

      // Build results text
      const title = (checkRecord[titleField] || (checkRecord as any).title_en || '') as string
      const shortTitle = escapeHtml(title.length > 50 ? title.substring(0, 47) + '...' : title)
      const slug = (news[`slug_${socialLanguage}` as keyof typeof news] || news.slug_en || newsId.substring(0, 8)) as string
      const articleUrl = `https://vitalii.no/news/${slug}`

      let resultsText = `\n\n✅ <b>Опубліковано LI+FB+IG ${langLabel}:</b>\n\n`
      resultsText += `📰 «${shortTitle}»\n`
      resultsText += `📝 <a href="${articleUrl}">Читати на сайті</a>\n\n`

      for (const r of results) {
        if (r.success) {
          if (r.processing) {
            resultsText += `⏳ ${r.platform}: ${r.error}\n`
          } else if (r.url) {
            resultsText += `✅ ${r.platform}: <a href="${r.url}">Переглянути пост</a>\n`
          } else {
            resultsText += `✅ ${r.platform}: Опубліковано\n`
          }
        } else {
          resultsText += `❌ ${r.platform}: ${r.error}\n`
        }
      }

      const remainingLangs = ['en', 'no', 'ua'].filter(l => l !== socialLanguage)
      const remainingButtons = [
        remainingLangs.map(l => ({
          text: `🌐 Все ${l.toUpperCase()}`,
          callback_data: `all_${l}_${newsId}`
        })),
        [
          { text: `🐦 Twitter ${langLabel}`, callback_data: `twitter_${socialLanguage}_${newsId}` }
        ],
        [
          { text: '🎵 TikTok', callback_data: `tiktok_${newsId}` },
          { text: '⏭️ Skip', callback_data: `skip_social_${newsId}` }
        ]
      ]

      let finalText = messageText + resultsText
      if (finalText.length > 4000) {
        const maxOriginalLength = 4000 - resultsText.length - 50
        finalText = messageText.substring(0, maxOriginalLength) + '\n\n<i>... (скорочено)</i>' + resultsText
      }

      await editOrSend(TELEGRAM_BOT_TOKEN, chatId, messageId,
        finalText,
        { inline_keyboard: remainingButtons }, true)

      console.log(`✅ Worker: combo_li_fb_ig ${langLabel} completed in ${Date.now() - startTime}ms`)

      // =================================================================
      // NEW_VARIANTS: Generate new image variants
      // =================================================================
    } else if (action === 'new_variants') {
      const { newsId } = params
      console.log(`🔄 Worker: Generating new variants for ${newsId}`)

      const { data: newsRecord } = await supabase
        .from('news')
        .select('id, original_title, original_content, rss_analysis')
        .eq('id', newsId)
        .single()

      if (!newsRecord) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          messageText + '\n\n❌ <b>Новина не знайдена</b>')
        return new Response(JSON.stringify({ ok: false }))
      }

      const isRssSource = !!(newsRecord.rss_analysis)
      const title = newsRecord.original_title || ''
      const content = newsRecord.original_content || title

      const promptResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-image-prompt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newsId,
          title: title.substring(0, 200),
          content: content.substring(0, 2000),
          mode: 'variants'
        })
      })

      if (!promptResponse.ok) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          truncateForTelegram(messageText, '\n\n❌ <b>Помилка генерації варіантів</b>'))
        return new Response(JSON.stringify({ ok: false }))
      }

      const promptResult = await promptResponse.json()
      const newVariants = promptResult.variants as Array<{ label: string, description: string }> | null

      if (!newVariants || newVariants.length === 0) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          truncateForTelegram(messageText, '\n\n❌ <b>Не вдалося згенерувати варіанти</b>'))
        return new Response(JSON.stringify({ ok: false }))
      }

      const variantEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣']
      let variantsText = '\n\n🎨 <b>Оберіть концепцію зображення:</b>\n'
      newVariants.forEach((v, i) => {
        variantsText += `\n${variantEmojis[i] || `${i + 1}.`} <b>${escapeHtml(v.label)}</b>\n<i>${escapeHtml(v.description)}</i>\n`
      })

      const variantButtons = [
        [
          { text: '1️⃣', callback_data: `select_variant_1_${newsId}` },
          { text: '2️⃣', callback_data: `select_variant_2_${newsId}` },
          { text: '3️⃣', callback_data: `select_variant_3_${newsId}` },
          { text: '4️⃣', callback_data: `select_variant_4_${newsId}` }
        ],
        [
          { text: '🔄 Нові варіанти', callback_data: `new_variants_${newsId}` },
          { text: '🎨 Конструктор', callback_data: `cb_hub_${newsId}` }
        ],
        isRssSource
          ? [{ text: '📸 Завантажити', callback_data: `upload_rss_image_${newsId}` }, { text: '❌ Skip', callback_data: `reject_${newsId}` }]
          : [{ text: '📸 Завантажити', callback_data: `create_custom_${newsId}` }, { text: '❌ Reject', callback_data: `reject_${newsId}` }]
      ]

      await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
        truncateForTelegram(messageText, variantsText),
        { inline_keyboard: variantButtons })

      console.log(`✅ Worker: new_variants completed in ${Date.now() - startTime}ms`)

      // =================================================================
      // VARIANT_WITH_LANG: Generate image from selected variant
      // =================================================================
    } else if (action === 'variant_with_lang') {
      const { newsId, variantIndex, selectedLang } = params
      const langNames: Record<string, string> = { ua: 'UA', no: 'NO', en: 'EN' }
      console.log(`🎨 Worker: Generating variant ${variantIndex} in ${selectedLang} for ${newsId}`)

      const { data: newsRecord } = await supabase
        .from('news')
        .select('id, original_title, original_content, image_prompt_variants, rss_analysis')
        .eq('id', newsId)
        .single()

      if (!newsRecord) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          truncateForTelegram(messageText, '\n\n❌ <b>Новина не знайдена</b>'))
        return new Response(JSON.stringify({ ok: false }))
      }

      const isRssSource = !!(newsRecord.rss_analysis)
      const variants = newsRecord.image_prompt_variants as Array<{ label: string, description: string }> | null

      if (!variants || variants.length < variantIndex) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          truncateForTelegram(messageText, '\n\n❌ <b>Варіант не знайдено</b>'))
        return new Response(JSON.stringify({ ok: false }))
      }

      const selectedVariant = variants[variantIndex - 1]
      const title = newsRecord.original_title || ''
      const content = newsRecord.original_content || title

      // Generate full prompt
      const promptResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-image-prompt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newsId,
          title: title.substring(0, 200),
          content: content.substring(0, 2000),
          mode: 'full',
          selectedVariant
        })
      })

      if (!promptResponse.ok) {
        throw new Error(`Prompt generation failed: ${promptResponse.status}`)
      }

      await promptResponse.json()

      // Clear existing images
      await supabase.from('news').update({ processed_image_url: null, processed_image_url_wide: null }).eq('id', newsId)

      // Generate BOTH images in parallel
      const [squareResult, wideResult] = await Promise.allSettled([
        fetch(`${SUPABASE_URL}/functions/v1/process-image`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ newsId, generateFromPrompt: true, language: selectedLang, aspectRatio: '1:1' })
        }).then(r => r.json()),
        fetch(`${SUPABASE_URL}/functions/v1/process-image`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ newsId, generateFromPrompt: true, language: selectedLang, aspectRatio: '16:9' })
        }).then(r => r.json())
      ])

      const imageGenResult = squareResult.status === 'fulfilled' ? squareResult.value : null
      const wideImageResult = wideResult.status === 'fulfilled' ? wideResult.value : null
      const wideImageUrl = wideImageResult?.success ? wideImageResult.processedImageUrl : null

      if (imageGenResult?.success && imageGenResult.processedImageUrl) {
        const newImageUrl = imageGenResult.processedImageUrl

        // Append to gallery
        const { data: galNews } = await supabase.from('news').select('images').eq('id', newsId).single()
        const galImages: string[] = galNews?.images || []
        if (!galImages.includes(newImageUrl)) {
          await supabase.from('news').update({ images: [...galImages, newImageUrl] }).eq('id', newsId)
        }
        const galleryCount = galImages.includes(newImageUrl) ? galImages.length : galImages.length + 1

        const squareImageLink = `🖼️ <b>1:1</b> (Instagram): ${escapeHtml(newImageUrl)}`
        const wideImageLink = wideImageUrl
          ? `\n📐 <b>16:9</b> (LinkedIn/FB): ${escapeHtml(wideImageUrl)}`
          : '\n📐 <b>16:9</b>: ⚠️ не вдалося згенерувати'

        // Update SAME message with result + gallery buttons (updated count)
        const galleryKeyboard = isRssSource ? {
          inline_keyboard: [
            [{ text: `✅ Готово (${galleryCount} фото)`, callback_data: `gal_done_${newsId}` }, { text: '➕ Ще', callback_data: `add_more_${newsId}` }],
            [{ text: '🖼 + Оригінал', callback_data: `keep_orig_${newsId}` }, { text: '📸 Завантажити', callback_data: `upload_rss_image_${newsId}` }],
            [{ text: '❌ Skip', callback_data: `reject_${newsId}` }]
          ]
        } : {
          inline_keyboard: [
            [{ text: `✅ Готово (${galleryCount} фото)`, callback_data: `gal_done_${newsId}` }, { text: '➕ Ще', callback_data: `add_more_${newsId}` }],
            [{ text: '🖼 + Оригінал', callback_data: `keep_orig_${newsId}` }, { text: '📸 Завантажити', callback_data: `create_custom_${newsId}` }],
            [{ text: '❌ Reject', callback_data: `reject_${newsId}` }]
          ]
        }

        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          truncateForTelegram(messageText, `\n\n✅ <b>Зображення згенеровано (${langNames[selectedLang] || selectedLang})!</b>\n🎨 Концепція: <i>${escapeHtml(selectedVariant.label)}</i>\n📸 Галерея: ${galleryCount} фото\n${squareImageLink}${wideImageLink}`),
          galleryKeyboard)
      } else {
        const errorMsg = imageGenResult?.error || 'Невідома помилка'
        const retryKeyboard = {
          inline_keyboard: [
            [{ text: '🔄 Спробувати ще', callback_data: `vl_${variantIndex}_${selectedLang}_${newsId}` }, { text: '← Інший варіант', callback_data: `back_to_variants_${newsId}` }],
            [{ text: '📸 Завантажити своє', callback_data: isRssSource ? `upload_rss_image_${newsId}` : `create_custom_${newsId}` }],
            [{ text: '❌ Reject', callback_data: `reject_${newsId}` }]
          ]
        }
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          truncateForTelegram(messageText, `\n\n❌ <b>Помилка генерації:</b> ${errorMsg}\n\n<i>Спробуйте ще раз або оберіть інший варіант</i>`),
          retryKeyboard)
      }

      console.log(`✅ Worker: variant_with_lang completed in ${Date.now() - startTime}ms`)

      // =================================================================
      // CB_LANG: Creative Builder - generate prompt
      // =================================================================
    } else if (action === 'cb_lang') {
      const { newsId, selectedLang } = params
      const langNames: Record<string, string> = { ua: 'UA', no: 'NO', en: 'EN' }
      console.log(`🎨 Worker: Creative Builder prompt in ${selectedLang} for ${newsId}`)

      const { data: newsRecord } = await supabase
        .from('news')
        .select('id, original_title, original_content, creative_builder_state, rss_analysis')
        .eq('id', newsId)
        .single()

      if (!newsRecord) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          truncateForTelegram(messageText, '\n\n❌ <b>Новина не знайдена</b>'))
        return new Response(JSON.stringify({ ok: false }))
      }

      const state = (newsRecord.creative_builder_state || {}) as Record<string, any>
      const title = newsRecord.original_title || ''
      const content = newsRecord.original_content || title

      // Build creativeParameters
      const creativeParameters: Record<string, any> = {}
      for (const key of ['style', 'color', 'object', 'action', 'background', 'effects', 'text']) {
        if (state[key] && state[key].prompt_fragment) {
          creativeParameters[key] = state[key]
        }
      }

      const promptResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-image-prompt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newsId,
          title: title.substring(0, 200),
          content: content.substring(0, 2000),
          mode: 'custom',
          creativeParameters
        })
      })

      if (!promptResponse.ok) {
        throw new Error(`Prompt generation failed: ${promptResponse.status}`)
      }

      const promptResult = await promptResponse.json()
      const generatedPrompt = promptResult.prompt || ''
      const promptPreview = generatedPrompt
        .replace(/\n\nQUALITY REQUIREMENTS[\s\S]*$/, '')
        .substring(0, 1500)

      const reviewKeyboard = {
        inline_keyboard: [
          [{ text: '✅ Генерувати зображення', callback_data: `cb_go_${selectedLang}_${newsId}` }],
          [{ text: '🔄 Новий промпт', callback_data: `cb_lg_${selectedLang}_${newsId}` }, { text: '← Змінити елементи', callback_data: `cb_hub_${newsId}` }],
          [{ text: '❌ Відхилити', callback_data: `reject_${newsId}` }]
        ]
      }

      await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
        truncateForTelegram(messageText, `\n\n📝 <b>Промпт (${langNames[selectedLang] || selectedLang}):</b>\n\n<code>${escapeHtml(promptPreview)}</code>\n\n<i>Натисніть "Генерувати зображення" для створення або "Новий промпт" для перегенерації</i>`),
        reviewKeyboard)

      console.log(`✅ Worker: cb_lang completed in ${Date.now() - startTime}ms`)

      // =================================================================
      // CB_GO: Creative Builder - generate image from prompt
      // =================================================================
    } else if (action === 'cb_go') {
      const { newsId, selectedLang } = params
      const langNames: Record<string, string> = { ua: 'UA', no: 'NO', en: 'EN' }
      console.log(`🖼️ Worker: Creative Builder image in ${selectedLang} for ${newsId}`)

      const { data: newsRecord } = await supabase
        .from('news')
        .select('id, rss_analysis')
        .eq('id', newsId)
        .single()

      if (!newsRecord) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          truncateForTelegram(messageText, '\n\n❌ <b>Новина не знайдена</b>'))
        return new Response(JSON.stringify({ ok: false }))
      }

      const isRssSource = !!(newsRecord.rss_analysis)

      // Clear existing images
      await supabase.from('news').update({ processed_image_url: null, processed_image_url_wide: null }).eq('id', newsId)

      // Generate BOTH images in parallel
      const [squareResult, wideResult] = await Promise.allSettled([
        fetch(`${SUPABASE_URL}/functions/v1/process-image`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ newsId, generateFromPrompt: true, language: selectedLang, aspectRatio: '1:1' })
        }).then(r => r.json()),
        fetch(`${SUPABASE_URL}/functions/v1/process-image`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ newsId, generateFromPrompt: true, language: selectedLang, aspectRatio: '16:9' })
        }).then(r => r.json())
      ])

      const imageGenResult = squareResult.status === 'fulfilled' ? squareResult.value : null
      const wideImageResult = wideResult.status === 'fulfilled' ? wideResult.value : null
      const wideImageUrl = wideImageResult?.success ? wideImageResult.processedImageUrl : null

      if (imageGenResult?.success && imageGenResult.processedImageUrl) {
        const newImageUrl = imageGenResult.processedImageUrl

        // Append to gallery
        const { data: galNews } = await supabase.from('news').select('images').eq('id', newsId).single()
        const galImages: string[] = galNews?.images || []
        if (!galImages.includes(newImageUrl)) {
          await supabase.from('news').update({ images: [...galImages, newImageUrl] }).eq('id', newsId)
        }
        const galleryCount = galImages.includes(newImageUrl) ? galImages.length : galImages.length + 1

        const squareImageLink = `🖼️ <b>1:1</b>: ${escapeHtml(newImageUrl)}`
        const wideImageLink = wideImageUrl
          ? `\n📐 <b>16:9</b>: ${escapeHtml(wideImageUrl)}`
          : '\n📐 <b>16:9</b>: ⚠️ не вдалося згенерувати'

        // Edit SAME message with updated gallery keyboard
        const cbGalleryKeyboard = isRssSource ? {
          inline_keyboard: [
            [{ text: `✅ Готово (${galleryCount} фото)`, callback_data: `gal_done_${newsId}` }, { text: '➕ Ще', callback_data: `add_more_${newsId}` }],
            [{ text: '🖼 + Оригінал', callback_data: `keep_orig_${newsId}` }, { text: '📸 Завантажити', callback_data: `upload_rss_image_${newsId}` }],
            [{ text: '❌ Skip', callback_data: `reject_${newsId}` }]
          ]
        } : {
          inline_keyboard: [
            [{ text: `✅ Готово (${galleryCount} фото)`, callback_data: `gal_done_${newsId}` }, { text: '➕ Ще', callback_data: `add_more_${newsId}` }],
            [{ text: '🖼 + Оригінал', callback_data: `keep_orig_${newsId}` }, { text: '📸 Завантажити', callback_data: `create_custom_${newsId}` }],
            [{ text: '❌ Reject', callback_data: `reject_${newsId}` }]
          ]
        }
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          truncateForTelegram(messageText, `\n\n✅ <b>Creative Builder — зображення згенеровано (${langNames[selectedLang] || selectedLang})!</b>\n📸 Галерея: ${galleryCount} фото\n${squareImageLink}${wideImageLink}`),
          cbGalleryKeyboard)
      } else {
        const errorMsg = imageGenResult?.error || 'Невідома помилка'
        const cbRetryKeyboard = isRssSource ? {
          inline_keyboard: [
            [{ text: '🔄 Спробувати ще', callback_data: `cb_hub_${newsId}` }, { text: '← Варіанти', callback_data: `new_variants_${newsId}` }],
            [{ text: '📸 Завантажити', callback_data: `upload_rss_image_${newsId}` }],
            [{ text: '❌ Skip', callback_data: `reject_${newsId}` }]
          ]
        } : {
          inline_keyboard: [
            [{ text: '🔄 Спробувати ще', callback_data: `cb_hub_${newsId}` }, { text: '← Варіанти', callback_data: `new_variants_${newsId}` }],
            [{ text: '📸 Завантажити', callback_data: `create_custom_${newsId}` }],
            [{ text: '❌ Reject', callback_data: `reject_${newsId}` }]
          ]
        }
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          truncateForTelegram(messageText, `\n\n❌ <b>Помилка генерації:</b> ${errorMsg}\n<i>Натисніть "🔄 Спробувати ще" для повторної спроби</i>`),
          cbRetryKeyboard)
      }

      console.log(`✅ Worker: cb_go completed in ${Date.now() - startTime}ms`)

      // =================================================================
      // TIKTOK: Generate TikTok content
      // =================================================================
    } else if (action === 'tiktok') {
      const { newsId } = params
      console.log(`🎵 Worker: TikTok content for ${newsId}`)

      const { data: news } = await supabase.from('news').select('*').eq('id', newsId).single()
      if (!news) {
        await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
          messageText + '\n\n❌ <b>Помилка:</b> Новина не знайдена')
        return new Response(JSON.stringify({ ok: false }))
      }

      const { data: blogPost } = await supabase.from('blog_posts').select('*').eq('source_news_id', newsId).single()
      const contentType = blogPost ? 'blog' : 'news'
      const contentId = blogPost ? blogPost.id : newsId

      const tiktokResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-tiktok-content`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newsId: contentType === 'news' ? contentId : undefined,
          blogPostId: contentType === 'blog' ? contentId : undefined,
          language: 'en',
          contentType,
          chatId: chatId.toString()
        })
      })

      const tiktokResult = await tiktokResponse.json()
      if (!tiktokResponse.ok || !tiktokResult.success) {
        await sendMessage(TELEGRAM_BOT_TOKEN, chatId,
          `❌ TikTok content generation failed: ${tiktokResult.error || 'Unknown error'}`)
      }

      await editMessage(TELEGRAM_BOT_TOKEN, chatId, messageId,
        messageText + '\n\n🎵 <b>TikTok content sent below!</b>')

      console.log(`✅ Worker: tiktok completed in ${Date.now() - startTime}ms`)

    } else {
      console.error(`❌ Worker: Unknown action: ${action}`)
      return new Response(JSON.stringify({ ok: false, error: `Unknown action: ${action}` }))
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error(`❌ Worker error:`, error)

    // Try to notify user about the error
    try {
      const task: WorkerTask = await (async () => {
        // Re-read the request body is not possible here, use error context
        return { action: 'unknown', params: {}, telegram: { chatId: 0, messageId: 0, messageText: '' } }
      })()
    } catch { }

    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
