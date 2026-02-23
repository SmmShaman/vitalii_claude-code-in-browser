import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { triggerVideoProcessing, isGitHubActionsEnabled, triggerLinkedInVideo, triggerFacebookVideo, triggerInstagramVideo } from '../_shared/github-actions.ts'
import { escapeHtml } from '../_shared/social-media-helpers.ts'
import { dispatchToWorker } from '../_shared/webhook-dispatch.ts'

/**
 * Extract external source links from text content
 * Returns the first non-Telegram URL found in the text
 */
function extractSourceLink(text: string): string | null {
  if (!text) return null

  // Regular expression to match URLs
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi
  const matches = text.match(urlRegex)

  if (!matches) return null

  // Filter out Telegram URLs and return the first external source
  for (const url of matches) {
    // Skip Telegram URLs
    if (url.includes('t.me/') || url.includes('telegram.me/') || url.includes('telegram.org/')) {
      continue
    }
    // Skip common social media share URLs
    if (url.includes('twitter.com/intent/') || url.includes('facebook.com/sharer/')) {
      continue
    }
    // Clean up URL (remove trailing punctuation)
    const cleanUrl = url.replace(/[.,;:!?)]+$/, '')
    return cleanUrl
  }

  return null
}

serve(async (req) => {
  try {
    // Verify Telegram webhook secret token to prevent unauthorized requests
    const WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')
    if (WEBHOOK_SECRET) {
      const secretHeader = req.headers.get('X-Telegram-Bot-Api-Secret-Token')
      if (secretHeader !== WEBHOOK_SECRET) {
        console.warn('⚠️ Unauthorized webhook request - invalid secret token')
        return new Response('Unauthorized', { status: 401 })
      }
    }

    const update = await req.json()
    console.log('Telegram webhook received:', JSON.stringify(update, null, 2))

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

    const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_SERVICE_ROLE_KEY ?? '')

    // =================================================================
    // 🆕 НОВИЙ HANDLER: Channel Post (пости з каналів)
    // =================================================================
    if (update.channel_post) {
      console.log('📱 Channel post received!')

      const post = update.channel_post
      const channelUsername = post.chat.username || post.chat.id.toString()

      // Отримати список активних Telegram джерел
      const { data: sources } = await supabase
        .from('news_sources')
        .select('url')
        .eq('source_type', 'telegram')
        .eq('is_active', true)

      const allowedChannels = sources?.map(s => {
        // Витягнути username з URL (напр. "https://t.me/geekneural" → "geekneural")
        const match = s.url.match(/t\.me\/([^/]+)/)
        return match ? match[1] : null
      }).filter(Boolean) || []

      console.log('Allowed channels:', allowedChannels)
      console.log('Post from channel:', channelUsername)

      if (!allowedChannels.includes(channelUsername)) {
        console.log(`⚠️  Skipping post from non-allowed channel: ${channelUsername}`)
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      console.log(`✅ Processing post from allowed channel: ${channelUsername}`)

      // Отримати текст
      const text = post.text || post.caption || ''

      // Отримати фото (якщо є)
      let photoUrl = null
      if (post.photo && post.photo.length > 0) {
        const photo = post.photo[post.photo.length - 1] // Найбільше фото
        try {
          const fileResponse = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${photo.file_id}`
          )
          const fileData = await fileResponse.json()
          if (fileData.ok) {
            photoUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`
          }
        } catch (error) {
          console.error('Error getting photo:', error)
        }
      }

      // URL оригінального поста в Telegram
      const originalUrl = post.chat.username
        ? `https://t.me/${post.chat.username}/${post.message_id}`
        : null

      // Extract external source link from post content
      const sourceLink = extractSourceLink(text)
      console.log('📎 Extracted source link:', sourceLink)

      // Викликати process-news для обробки
      try {
        const processResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/process-news`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              content: text,
              imageUrl: photoUrl,
              sourceUrl: originalUrl,
              sourceLink: sourceLink, // External source link from text
              sourceType: 'telegram_channel',
              channelUsername: channelUsername
            })
          }
        )

        const result = await processResponse.json()
        console.log('Process-news result:', result)

        return new Response(JSON.stringify({ ok: true, processed: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      } catch (error) {
        console.error('Error processing channel post:', error)
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500
        })
      }
    }

    // =================================================================
    // 🆕 НОВИЙ HANDLER: Message (ручні повідомлення користувача)
    // =================================================================
    if (update.message) {
      console.log('💬 Message received!')

      const message = update.message
      const chatId = message.chat.id

      // Перевірити чи це пересланне повідомлення з каналу
      if (message.forward_from_chat && message.forward_from_chat.type === 'channel') {
        console.log('📨 Forwarded message from channel')
        const channelUsername = message.forward_from_chat.username

        // Обробити як channel post
        const text = message.text || message.caption || ''
        let photoUrl = null

        if (message.photo && message.photo.length > 0) {
          const photo = message.photo[message.photo.length - 1]
          try {
            const fileResponse = await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${photo.file_id}`
            )
            const fileData = await fileResponse.json()
            if (fileData.ok) {
              photoUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`
            }
          } catch (error) {
            console.error('Error getting photo:', error)
          }
        }

        const originalUrl = channelUsername
          ? `https://t.me/${channelUsername}/${message.forward_from_message_id}`
          : null

        // Extract external source link from forwarded content
        const sourceLink = extractSourceLink(text)
        console.log('📎 Extracted source link from forward:', sourceLink)

        // Обробити
        try {
          await fetch(
            `${SUPABASE_URL}/functions/v1/process-news`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                content: text,
                imageUrl: photoUrl,
                sourceUrl: originalUrl,
                sourceLink: sourceLink, // External source link from text
                sourceType: 'telegram_forward',
                channelUsername: channelUsername,
                chatId: chatId // Для відправки результату назад
              })
            }
          )

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: '✅ Forwarded message sent for processing!'
              })
            }
          )
        } catch (error) {
          console.error('Error processing forwarded message:', error)
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // =================================================================
      // 📸 Check if this is a photo reply for Instagram upload (auto-post after upload)
      // =================================================================
      if (message.reply_to_message && message.photo && message.photo.length > 0) {
        const replyText = message.reply_to_message.text || ''

        // Check for Instagram upload pattern: instagram_lang:newsId
        const instagramMatch = replyText.match(/instagram_(en|no|ua):([a-f0-9-]+)/)
        if (instagramMatch && replyText.includes('Instagram потребує зображення')) {
          const instagramLanguage = instagramMatch[1] as 'en' | 'no' | 'ua'
          const newsId = instagramMatch[2]
          console.log(`📸 Received Instagram image for news: ${newsId}, language: ${instagramLanguage}`)

          try {
            // Get largest photo
            const photo = message.photo[message.photo.length - 1]

            // Download photo from Telegram
            const fileResponse = await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${photo.file_id}`
            )
            const fileData = await fileResponse.json()

            if (!fileData.ok) {
              throw new Error('Failed to get photo file info')
            }

            const photoUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`
            const photoResponse = await fetch(photoUrl)
            const photoBuffer = await photoResponse.arrayBuffer()

            // Upload to Supabase Storage
            const fileName = `custom/${newsId}_${Date.now()}.jpg`
            const { error: uploadError } = await supabase.storage
              .from('news-images')
              .upload(fileName, photoBuffer, {
                contentType: 'image/jpeg',
                upsert: true,
                cacheControl: '31536000'
              })

            if (uploadError) {
              throw new Error(`Upload failed: ${uploadError.message}`)
            }

            const { data: urlData } = supabase.storage
              .from('news-images')
              .getPublicUrl(fileName)

            const publicUrl = urlData.publicUrl

            // Update news record with custom image and append to gallery
            const { data: currentNewsForGal } = await supabase.from('news').select('images').eq('id', newsId).single()
            const currentGalImages: string[] = currentNewsForGal?.images || []
            const updatedGalImages = currentGalImages.includes(publicUrl) ? currentGalImages : [...currentGalImages, publicUrl]

            const { error: updateError } = await supabase
              .from('news')
              .update({
                processed_image_url: publicUrl,
                image_processed_at: new Date().toISOString(),
                images: updatedGalImages
              })
              .eq('id', newsId)

            if (updateError) {
              throw new Error(`Database update failed: ${updateError.message}`)
            }

            console.log(`✅ Image uploaded: ${publicUrl}`)

            // Update message to show upload success (APPEND only, don't remove anything)
            await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  message_id: message.reply_to_message.message_id,
                  text: replyText + `\n\n✅ <b>Зображення завантажено!</b>\n🖼️ <a href="${publicUrl}">Переглянути</a>\n⏳ <i>Публікую в Instagram (${instagramLanguage.toUpperCase()})...</i>`,
                  parse_mode: 'HTML',
                  disable_web_page_preview: true
                })
              }
            )

            // Auto-post to Instagram
            console.log(`📸 Auto-posting to Instagram (${instagramLanguage})...`)

            const postResponse = await fetch(
              `${SUPABASE_URL}/functions/v1/post-to-instagram`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  newsId: newsId,
                  language: instagramLanguage,
                  contentType: 'news'
                })
              }
            )

            const postResult = await postResponse.json()

            if (postResult.success) {
              console.log(`✅ Posted to Instagram successfully: ${postResult.postUrl}`)

              // Update message with success (APPEND to original, include image link)
              const successText = replyText +
                `\n\n✅ <b>Зображення завантажено!</b>\n🖼️ <a href="${publicUrl}">Переглянути</a>` +
                `\n\n📸 Instagram ${instagramLanguage.toUpperCase()}: ` +
                (postResult.postUrl ? `<a href="${postResult.postUrl}">Переглянути пост</a>` : 'Опубліковано')

              // Add buttons for other Instagram languages
              const otherLangs = ['en', 'no', 'ua'].filter(l => l !== instagramLanguage)
              const instagramButtons = otherLangs.map(lang => ({
                text: `📸 Instagram ${lang.toUpperCase()}`,
                callback_data: `instagram_${lang}_${newsId}`
              }))

              await fetch(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: chatId,
                    message_id: message.reply_to_message.message_id,
                    text: successText,
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                    reply_markup: {
                      inline_keyboard: [instagramButtons]
                    }
                  })
                }
              )
            } else {
              console.error(`❌ Instagram post failed: ${postResult.error}`)

              // Update message with error (APPEND to original, include image link)
              const errorText = replyText +
                `\n\n✅ <b>Зображення завантажено!</b>\n🖼️ <a href="${publicUrl}">Переглянути</a>` +
                `\n\n❌ <b>Instagram ${instagramLanguage.toUpperCase()}:</b> ${postResult.error || 'Unknown error'}`

              await fetch(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: chatId,
                    message_id: message.reply_to_message.message_id,
                    text: errorText,
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                    reply_markup: {
                      inline_keyboard: [[
                        { text: '🔄 Спробувати ще', callback_data: `instagram_${instagramLanguage}_${newsId}` }
                      ]]
                    }
                  })
                }
              )
            }

            return new Response(JSON.stringify({ ok: true, instagramPosted: postResult.success }), {
              headers: { 'Content-Type': 'application/json' }
            })

          } catch (error: any) {
            console.error('Error uploading Instagram image:', error)
            await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `❌ Помилка: ${error.message}`,
                  reply_to_message_id: message.message_id
                })
              }
            )

            return new Response(JSON.stringify({ ok: false, error: error.message }), {
              headers: { 'Content-Type': 'application/json' },
              status: 500
            })
          }
        }

        // Check for standard custom image upload pattern: newsId:xxx
        const newsIdMatch = replyText.match(/newsId:([a-f0-9-]+)/)

        if (newsIdMatch && replyText.includes('Очікую фото')) {
          const newsId = newsIdMatch[1]
          console.log(`📸 Received custom image for news: ${newsId}`)

          try {
            // Get largest photo
            const photo = message.photo[message.photo.length - 1]

            // Download photo from Telegram
            const fileResponse = await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${photo.file_id}`
            )
            const fileData = await fileResponse.json()

            if (!fileData.ok) {
              throw new Error('Failed to get photo file info')
            }

            const photoUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`
            const photoResponse = await fetch(photoUrl)
            const photoBuffer = await photoResponse.arrayBuffer()

            // Upload to Supabase Storage
            const fileName = `custom/${newsId}_${Date.now()}.jpg`
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('news-images')
              .upload(fileName, photoBuffer, {
                contentType: 'image/jpeg',
                upsert: true,
                cacheControl: '31536000'
              })

            if (uploadError) {
              throw new Error(`Upload failed: ${uploadError.message}`)
            }

            const { data: urlData } = supabase.storage
              .from('news-images')
              .getPublicUrl(fileName)

            const publicUrl = urlData.publicUrl

            // Update news record with custom image and append to gallery
            const { data: curNewsGal2 } = await supabase.from('news').select('images').eq('id', newsId).single()
            const curGalImgs2: string[] = curNewsGal2?.images || []
            const updGalImgs2 = curGalImgs2.includes(publicUrl) ? curGalImgs2 : [...curGalImgs2, publicUrl]

            const { error: updateError } = await supabase
              .from('news')
              .update({
                processed_image_url: publicUrl,
                image_processed_at: new Date().toISOString(),
                images: updGalImgs2
              })
              .eq('id', newsId)

            if (updateError) {
              throw new Error(`Database update failed: ${updateError.message}`)
            }

            // Check if this is RSS workflow (use RSS-specific publish buttons)
            const isRssWorkflow = replyText.includes('rss_workflow:true')
            const uploadGalCount = updGalImgs2.length

            // Update original message with success status and gallery buttons
            const publishKeyboard = isRssWorkflow ? {
              inline_keyboard: [
                [
                  { text: `✅ Готово (${uploadGalCount} фото)`, callback_data: `gal_done_${newsId}` },
                  { text: '➕ Ще', callback_data: `add_more_${newsId}` }
                ],
                [
                  { text: '🖼 + Оригінал', callback_data: `keep_orig_${newsId}` }
                ],
                [
                  { text: '❌ Skip', callback_data: `reject_${newsId}` }
                ]
              ]
            } : {
              inline_keyboard: [
                [
                  { text: `✅ Готово (${uploadGalCount} фото)`, callback_data: `gal_done_${newsId}` },
                  { text: '➕ Ще', callback_data: `add_more_${newsId}` }
                ],
                [
                  { text: '🖼 + Оригінал', callback_data: `keep_orig_${newsId}` }
                ],
                [
                  { text: '❌ Reject', callback_data: `reject_${newsId}` }
                ]
              ]
            }

            // APPEND success status (don't remove anything from original)
            await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  message_id: message.reply_to_message.message_id,
                  text: replyText + `\n\n✅ <b>Зображення прикріплено</b>\n🖼️ <a href="${publicUrl}">Переглянути</a>\n📝 <i>Оберіть де опублікувати...</i>`,
                  parse_mode: 'HTML',
                  reply_markup: publishKeyboard
                })
              }
            )

            return new Response(JSON.stringify({ ok: true, uploaded: true }), {
              headers: { 'Content-Type': 'application/json' }
            })

          } catch (error) {
            console.error('Error uploading custom image:', error)
            await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `❌ Помилка завантаження зображення: ${error.message}`,
                  reply_to_message_id: message.message_id
                })
              }
            )

            return new Response(JSON.stringify({ ok: false, error: error.message }), {
              headers: { 'Content-Type': 'application/json' },
              status: 500
            })
          }
        }
      }

      // Звичайне повідомлення - ручна публікація
      const text = message.text || message.caption || ''

      if (text.trim() === '') {
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: '⚠️ Please send a text message or photo with caption'
            })
          }
        )
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Отримати фото якщо є
      let photoUrl = null
      if (message.photo && message.photo.length > 0) {
        const photo = message.photo[message.photo.length - 1]
        try {
          const fileResponse = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${photo.file_id}`
          )
          const fileData = await fileResponse.json()
          if (fileData.ok) {
            photoUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`
          }
        } catch (error) {
          console.error('Error getting photo:', error)
        }
      }

      // Обробити ручне повідомлення
      try {
        const processResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/process-news`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              content: text,
              imageUrl: photoUrl,
              sourceType: 'manual',
              chatId: chatId // Для відправки результату назад
            })
          }
        )

        const result = await processResponse.json()

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: '✅ Your message has been sent for processing and AI translation!'
            })
          }
        )

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      } catch (error) {
        console.error('Error processing manual message:', error)

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `❌ Error: ${error.message}`
            })
          }
        )

        return new Response(JSON.stringify({ ok: false, error: error.message }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500
        })
      }
    }

    // =================================================================
    // ✅ ІСНУЮЧИЙ HANDLER: Callback Query (кнопки Publish/Reject)
    // =================================================================
    if (update.callback_query) {
      const callbackData = update.callback_query.data
      const callbackId = update.callback_query.id
      const messageId = update.callback_query.message.message_id
      const chatId = update.callback_query.message.chat.id
      const messageText = escapeHtml(update.callback_query.message.text || '')

      // Helper: truncate messageText + appendedText to fit Telegram 4096 char limit
      const truncateForTelegram = (original: string, appended: string, limit = 4000): string => {
        const combined = original + appended
        if (combined.length <= limit) return combined
        console.log(`⚠️ Message too long (${combined.length}), truncating original to fit`)
        const maxOriginalLength = limit - appended.length - 50
        return original.substring(0, maxOriginalLength) + '\n\n<i>... (скорочено)</i>' + appended
      }

      console.log('Callback received:', callbackData)

      // Parse callback data: publish_news_<id>, publish_blog_<id>, or reject_<id>
      let action: string
      let publicationType: string | null = null
      let newsId: string

      let linkedinLanguage: string | null = null

      // Track platform and language for social posting
      let socialPlatform: string | null = null
      let socialLanguage: string | null = null

      // Track language for image generation
      let imageLanguage: string | null = null

      if (callbackData.startsWith('publish_news_')) {
        action = 'publish'
        publicationType = 'news'
        newsId = callbackData.replace('publish_news_', '')
      } else if (callbackData.startsWith('publish_blog_')) {
        action = 'publish'
        publicationType = 'blog'
        newsId = callbackData.replace('publish_blog_', '')
        // RSS Article callbacks - use process-rss-news for summary-style rewrite
      } else if (callbackData.startsWith('publish_rss_news_')) {
        action = 'publish_rss'
        publicationType = 'news'
        newsId = callbackData.replace('publish_rss_news_', '')
      } else if (callbackData.startsWith('publish_rss_blog_')) {
        action = 'publish_rss'
        publicationType = 'blog'
        newsId = callbackData.replace('publish_rss_blog_', '')
      } else if (callbackData.startsWith('linkedin_en_')) {
        action = 'linkedin'
        linkedinLanguage = 'en'
        newsId = callbackData.replace('linkedin_en_', '')
      } else if (callbackData.startsWith('linkedin_no_')) {
        action = 'linkedin'
        linkedinLanguage = 'no'
        newsId = callbackData.replace('linkedin_no_', '')
      } else if (callbackData.startsWith('linkedin_ua_')) {
        action = 'linkedin'
        linkedinLanguage = 'ua'
        newsId = callbackData.replace('linkedin_ua_', '')
        // Facebook callbacks
      } else if (callbackData.startsWith('facebook_en_')) {
        action = 'social_post'
        socialPlatform = 'facebook'
        socialLanguage = 'en'
        newsId = callbackData.replace('facebook_en_', '')
      } else if (callbackData.startsWith('facebook_no_')) {
        action = 'social_post'
        socialPlatform = 'facebook'
        socialLanguage = 'no'
        newsId = callbackData.replace('facebook_no_', '')
      } else if (callbackData.startsWith('facebook_ua_')) {
        action = 'social_post'
        socialPlatform = 'facebook'
        socialLanguage = 'ua'
        newsId = callbackData.replace('facebook_ua_', '')
        // Instagram callbacks
      } else if (callbackData.startsWith('instagram_en_')) {
        action = 'social_post'
        socialPlatform = 'instagram'
        socialLanguage = 'en'
        newsId = callbackData.replace('instagram_en_', '')
      } else if (callbackData.startsWith('instagram_no_')) {
        action = 'social_post'
        socialPlatform = 'instagram'
        socialLanguage = 'no'
        newsId = callbackData.replace('instagram_no_', '')
      } else if (callbackData.startsWith('instagram_ua_')) {
        action = 'social_post'
        socialPlatform = 'instagram'
        socialLanguage = 'ua'
        newsId = callbackData.replace('instagram_ua_', '')
        // TikTok callback (manual workflow)
      } else if (callbackData.startsWith('tiktok_')) {
        action = 'tiktok'
        newsId = callbackData.replace('tiktok_', '')
        // Twitter Share Intent callbacks
      } else if (callbackData.startsWith('twitter_en_')) {
        action = 'twitter'
        socialPlatform = 'twitter'
        socialLanguage = 'en'
        newsId = callbackData.replace('twitter_en_', '')
      } else if (callbackData.startsWith('twitter_no_')) {
        action = 'twitter'
        socialPlatform = 'twitter'
        socialLanguage = 'no'
        newsId = callbackData.replace('twitter_no_', '')
      } else if (callbackData.startsWith('twitter_ua_')) {
        action = 'twitter'
        socialPlatform = 'twitter'
        socialLanguage = 'ua'
        newsId = callbackData.replace('twitter_ua_', '')
        // Batch posting: All socials in one language
      } else if (callbackData.startsWith('all_en_')) {
        action = 'post_all'
        socialLanguage = 'en'
        newsId = callbackData.replace('all_en_', '')
      } else if (callbackData.startsWith('all_no_')) {
        action = 'post_all'
        socialLanguage = 'no'
        newsId = callbackData.replace('all_no_', '')
      } else if (callbackData.startsWith('all_ua_')) {
        action = 'post_all'
        socialLanguage = 'ua'
        newsId = callbackData.replace('all_ua_', '')
        // Combo: LinkedIn EN + Facebook EN
      } else if (callbackData.startsWith('combo_li_fb_en_')) {
        action = 'combo_li_fb_en'
        newsId = callbackData.replace('combo_li_fb_en_', '')
        // Combo: LinkedIn + Facebook + Instagram (one language)
      } else if (callbackData.startsWith('combo_li_fb_ig_en_')) {
        action = 'combo_li_fb_ig'
        socialLanguage = 'en'
        newsId = callbackData.replace('combo_li_fb_ig_en_', '')
      } else if (callbackData.startsWith('combo_li_fb_ig_no_')) {
        action = 'combo_li_fb_ig'
        socialLanguage = 'no'
        newsId = callbackData.replace('combo_li_fb_ig_no_', '')
      } else if (callbackData.startsWith('combo_li_fb_ig_ua_')) {
        action = 'combo_li_fb_ig'
        socialLanguage = 'ua'
        newsId = callbackData.replace('combo_li_fb_ig_ua_', '')
        // Skip remaining social platforms
      } else if (callbackData.startsWith('skip_social_')) {
        action = 'skip_social'
        newsId = callbackData.replace('skip_social_', '')
        // Image variant selection callbacks (select_variant_1_<uuid>, select_variant_2_<uuid>, etc.)
      } else if (callbackData.startsWith('select_variant_')) {
        action = 'select_variant'
        // Format: select_variant_N_<newsId>
        // Remove prefix "select_variant_" to get "N_<newsId>"
        const remainder = callbackData.replace('select_variant_', '')
        const firstUnderscore = remainder.indexOf('_')
        imageLanguage = remainder.substring(0, firstUnderscore) // variant index as string ("1"-"4")
        newsId = remainder.substring(firstUnderscore + 1)
        // Variant + language selection: vl_N_LL_<uuid> (N=1-4, LL=ua/no/en)
      } else if (callbackData.startsWith('vl_')) {
        action = 'variant_with_lang'
        // Format: vl_N_LL_<uuid>
        const parts = callbackData.split('_')
        // parts: ['vl', '1', 'ua', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'] (UUID may contain dashes)
        socialLanguage = parts[1] // variant index '1'-'4'
        imageLanguage = parts[2]  // 'ua', 'no', 'en'
        newsId = parts.slice(3).join('_')
      } else if (callbackData.startsWith('new_variants_')) {
        action = 'new_variants'
        newsId = callbackData.replace('new_variants_', '')
      } else if (callbackData.startsWith('back_to_variants_')) {
        action = 'back_to_variants'
        newsId = callbackData.replace('back_to_variants_', '')
      } else if (callbackData.startsWith('skip_dup_')) {
        action = 'skip_dup'
        newsId = callbackData.replace('skip_dup_', '')
      } else if (callbackData.startsWith('reject_')) {
        action = 'reject'
        newsId = callbackData.replace('reject_', '')
        // RSS Image workflow callbacks
      } else if (callbackData.startsWith('confirm_rss_image_')) {
        action = 'confirm_rss_image'
        newsId = callbackData.replace('confirm_rss_image_', '')
      } else if (callbackData.startsWith('regenerate_rss_image_')) {
        action = 'regenerate_rss_image'
        newsId = callbackData.replace('regenerate_rss_image_', '')
      } else if (callbackData.startsWith('regen_img_')) {
        // regen_img_ua_123, regen_img_no_123, regen_img_en_123
        console.log('🔍 Received regen_img callback:', callbackData)
        action = 'regen_img_with_lang'
        const parts = callbackData.split('_')
        console.log('🔍 Callback parts:', JSON.stringify(parts))
        // parts: ['regen', 'img', 'ua', '123'] or ['regen', 'img', 'ua', '123', '456'] for UUID
        const lang = parts[2]
        newsId = parts.slice(3).join('_')
        console.log('🔍 Extracted: lang=', lang, 'newsId=', newsId)
        if (!newsId || newsId === 'undefined') {
          console.error('❌ CRITICAL: newsId is empty or undefined in regen_img callback!')
        }
        // Store language in a variable we can access later
        imageLanguage = lang
      } else if (callbackData.startsWith('back_to_rss_')) {
        action = 'back_to_rss'
        newsId = callbackData.replace('back_to_rss_', '')
      } else if (callbackData.startsWith('upload_rss_image_')) {
        action = 'upload_rss_image'
        newsId = callbackData.replace('upload_rss_image_', '')
        // ═══ Creative Builder callbacks ═══
      } else if (callbackData.startsWith('cb_hub_')) {
        action = 'cb_hub'
        newsId = callbackData.replace('cb_hub_', '')
      } else if (callbackData.startsWith('cb_c_')) {
        action = 'cb_category'
        // Format: cb_c_XX_{uuid} (XX = category code like ST, CL, OB, AC, BG, FX, TX)
        const remainder = callbackData.substring(5) // remove "cb_c_"
        const catCode = remainder.substring(0, 2)
        newsId = remainder.substring(3) // skip "XX_"
        // Store category code in socialLanguage (reuse variable)
        socialLanguage = catCode
      } else if (callbackData.startsWith('cb_s_')) {
        action = 'cb_select'
        // Format: cb_s_XX_N_{uuid} (XX = category, N = option index)
        const remainder = callbackData.substring(5) // remove "cb_s_"
        const catCode = remainder.substring(0, 2)
        const rest = remainder.substring(3) // skip "XX_"
        const idxEnd = rest.indexOf('_')
        const optionIdx = rest.substring(0, idxEnd)
        newsId = rest.substring(idxEnd + 1)
        socialLanguage = catCode
        imageLanguage = optionIdx
      } else if (callbackData.startsWith('cb_gen_')) {
        action = 'cb_generate'
        newsId = callbackData.replace('cb_gen_', '')
      } else if (callbackData.startsWith('cb_rst_')) {
        action = 'cb_reset'
        newsId = callbackData.replace('cb_rst_', '')
      } else if (callbackData.startsWith('cb_lg_')) {
        action = 'cb_lang'
        // Format: cb_lg_LL_{uuid} (LL = ua, no, en)
        const remainder = callbackData.substring(6) // remove "cb_lg_"
        const lang = remainder.substring(0, 2)
        newsId = remainder.substring(3) // skip "LL_"
        imageLanguage = lang
      } else if (callbackData.startsWith('cb_go_')) {
        action = 'cb_go'
        // Format: cb_go_LL_{uuid} (LL = ua, no, en) — confirm prompt & generate image
        const remainder = callbackData.substring(6) // remove "cb_go_"
        const lang = remainder.substring(0, 2)
        newsId = remainder.substring(3) // skip "LL_"
        imageLanguage = lang
        // ═══ Gallery & Keep Original callbacks ═══
      } else if (callbackData.startsWith('keep_orig_')) {
        action = 'keep_orig'
        newsId = callbackData.replace('keep_orig_', '')
      } else if (callbackData.startsWith('add_more_')) {
        action = 'add_more'
        newsId = callbackData.replace('add_more_', '')
      } else if (callbackData.startsWith('gal_done_')) {
        action = 'gal_done'
        newsId = callbackData.replace('gal_done_', '')
      } else {
        // Backward compatibility with old format "publish_<id>"
        const parts = callbackData.split('_')
        action = parts[0]
        newsId = parts[1]
        if (action === 'publish') {
          publicationType = 'news' // Default to news for old callbacks
        }
      }

      if (!newsId) {
        console.error('No news ID in callback data')
        return new Response(JSON.stringify({ ok: false }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      if (action === 'publish') {
        console.log(`Publishing as ${publicationType} with ID:`, newsId)

        // Lightweight validation
        const { data: news, error: fetchError } = await supabase
          .from('news')
          .select('id, is_published, is_rewritten, title_en, title_no, title_ua')
          .eq('id', newsId)
          .single()

        if (fetchError || !news) {
          console.error('Failed to fetch news:', fetchError)
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: '❌ Error: News not found',
                show_alert: true
              })
            }
          )
          return new Response(JSON.stringify({ ok: false }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // 🛡️ DUPLICATE CHECK: Prevent republishing already published content
        if (news.is_published || news.is_rewritten) {
          console.log(`⚠️ News ${newsId} is already published, preventing duplicate`)

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: '⚠️ Ця новина вже опублікована!',
                show_alert: true
              })
            }
          )

          // Remove publish buttons, show only LinkedIn buttons if content exists
          const hasContent = news.title_en || news.title_no || news.title_ua
          const updatedKeyboard = hasContent ? {
            inline_keyboard: [
              [
                { text: '🔗 LinkedIn EN', callback_data: `linkedin_en_${newsId}` },
                { text: '🔗 LinkedIn NO', callback_data: `linkedin_no_${newsId}` },
                { text: '🔗 LinkedIn UA', callback_data: `linkedin_ua_${newsId}` }
              ]
            ]
          } : undefined

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: messageText + '\n\n⚠️ <b>ВЖЕ ОПУБЛІКОВАНО</b>',
                parse_mode: 'HTML',
                reply_markup: updatedKeyboard
              })
            }
          )

          return new Response(JSON.stringify({ ok: true, duplicate: true }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // ✅ Answer callback IMMEDIATELY
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '⏳ Обробляю...',
              show_alert: false
            })
          }
        )

        // Show processing state
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + `\n\n⏳ <b>Обробляю ${publicationType === 'blog' ? 'блог' : 'новину'} (AI рерайт EN/NO/UA)...</b>`,
              parse_mode: 'HTML'
            })
          }
        )

        // 🚀 Dispatch to background worker (fire-and-forget)
        dispatchToWorker({
          action: 'publish',
          params: { newsId, publicationType },
          telegram: { chatId, messageId, messageText }
        })

      } else if (action === 'publish_rss') {
        // =================================================================
        // 📰 RSS Article Publishing Handler (Summary-style) - ASYNC
        // =================================================================
        console.log(`Publishing RSS article as ${publicationType} with ID:`, newsId)

        // Lightweight validation
        const { data: news, error: fetchError } = await supabase
          .from('news')
          .select('id, is_published, is_rewritten')
          .eq('id', newsId)
          .single()

        if (fetchError || !news) {
          console.error('Failed to fetch news:', fetchError)
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: '❌ Error: News not found',
                show_alert: true
              })
            }
          )
          return new Response(JSON.stringify({ ok: false }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // Prevent duplicate publishing
        if (news.is_published || news.is_rewritten) {
          console.log(`⚠️ RSS News ${newsId} is already published, preventing duplicate`)

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: '⚠️ Ця новина вже опублікована!',
                show_alert: true
              })
            }
          )

          return new Response(JSON.stringify({ ok: true, duplicate: true }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // ✅ Answer callback IMMEDIATELY
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '⏳ Обробляю RSS...',
              show_alert: false
            })
          }
        )

        // Show processing state
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + `\n\n⏳ <b>Обробляю RSS ${publicationType === 'blog' ? 'блог' : 'новину'} (AI рерайт EN/NO/UA)...</b>`,
              parse_mode: 'HTML'
            })
          }
        )

        // 🚀 Dispatch to background worker
        dispatchToWorker({
          action: 'publish_rss',
          params: { newsId, publicationType },
          telegram: { chatId, messageId, messageText }
        })

      } else if (action === 'linkedin' && linkedinLanguage) {
        // =================================================================
        // 🔗 LinkedIn Posting Handler → DISPATCH TO WORKER
        // =================================================================
        console.log(`[async] Dispatching LinkedIn (${linkedinLanguage}) to worker for news:`, newsId)

        // Answer callback immediately
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: '⏳ Публікуємо в LinkedIn...', show_alert: false })
        })

        // Show processing state
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: messageText + `\n\n⏳ <b>Публікуємо в LinkedIn (${linkedinLanguage.toUpperCase()})...</b>`,
            parse_mode: 'HTML', disable_web_page_preview: true
          })
        })

        // Dispatch to worker
        dispatchToWorker({
          action: 'linkedin',
          params: { newsId, linkedinLanguage },
          telegram: { chatId, messageId, messageText }
        })

      } else if (action === 'social_post' && socialPlatform && socialLanguage) {
        // =================================================================
        // 📱 Facebook/Instagram Posting Handler → DISPATCH TO WORKER
        // =================================================================
        console.log(`[async] Dispatching ${socialPlatform} (${socialLanguage}) to worker for news:`, newsId)

        const platformEmoji = socialPlatform === 'facebook' ? '📘' : '📸'
        const platformName = socialPlatform.charAt(0).toUpperCase() + socialPlatform.slice(1)

        // Answer callback immediately
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: `⏳ Публікуємо в ${platformName}...`, show_alert: false })
        })

        // Show processing state
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: messageText + `\n\n⏳ <b>${platformEmoji} Публікуємо в ${platformName} (${socialLanguage.toUpperCase()})...</b>`,
            parse_mode: 'HTML', disable_web_page_preview: true
          })
        })

        // Dispatch to worker
        dispatchToWorker({
          action: 'social_post',
          params: { newsId, socialPlatform, socialLanguage },
          telegram: { chatId, messageId, messageText }
        })

      } else if (action === 'tiktok') {
        // =================================================================
        // 🎵 TikTok Content Generation → DISPATCH TO WORKER
        // =================================================================
        console.log(`[async] Dispatching TikTok to worker for news:`, newsId)

        // Answer callback immediately
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: '🎵 Generating TikTok content...', show_alert: false })
        })

        // Show processing state
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: messageText + '\n\n⏳ <b>🎵 Генерація TikTok контенту...</b>',
            parse_mode: 'HTML'
          })
        })

        // Dispatch to worker
        dispatchToWorker({
          action: 'tiktok',
          params: { newsId, chatId: chatId.toString() },
          telegram: { chatId, messageId, messageText }
        })

      } else if (action === 'twitter' && socialPlatform === 'twitter' && socialLanguage) {
        // =================================================================
        // 🐦 Twitter Share Intent Handler (with AI teaser)
        // =================================================================
        console.log(`Generating Twitter Share Intent (${socialLanguage}) for news:`, newsId)

        // Fetch news data including content for teaser generation
        const { data: news, error: fetchError } = await supabase
          .from('news')
          .select(`title_en, title_no, title_ua, slug_en, slug_no, slug_ua,
                   content_en, content_no, content_ua,
                   social_teaser_twitter_en, social_teaser_twitter_no, social_teaser_twitter_ua`)
          .eq('id', newsId)
          .single()

        if (fetchError || !news) {
          console.error('Failed to fetch news:', fetchError)
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: '❌ Error: News not found',
                show_alert: true
              })
            }
          )
          return new Response(JSON.stringify({ ok: false }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // Check if has blog post FIRST (before validation)
        const { data: blogPost } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('source_news_id', newsId)
          .single()

        const contentType = blogPost ? 'blog' : 'news'
        const checkRecord = blogPost || news

        // Check if content is published
        const titleField = `title_${socialLanguage}` as keyof typeof checkRecord
        const slugField = `slug_${socialLanguage}` as keyof typeof checkRecord
        const contentField = `content_${socialLanguage}` as keyof typeof checkRecord
        const teaserField = `social_teaser_twitter_${socialLanguage}` as keyof typeof checkRecord

        if (!checkRecord[titleField]) {
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: '❌ Content not published yet. Publish to News/Blog first!',
                show_alert: true
              })
            }
          )
          return new Response(JSON.stringify({ ok: false }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // Get title, content, and slug in the appropriate language
        const title = checkRecord[titleField] as string
        const content = (checkRecord[contentField] || '') as string
        const slug = (checkRecord[slugField] || checkRecord.slug_en || newsId.substring(0, 8)) as string
        const articleUrl = `https://vitalii.no/${contentType === 'blog' ? 'blog' : 'news'}/${slug}`

        // Check for cached teaser or generate new one
        let tweetText = checkRecord[teaserField] as string | null

        if (!tweetText) {
          console.log('🎯 No cached Twitter teaser, generating...')
          try {
            const teaserResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-social-teasers`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                newsId,
                title,
                content,
                contentType: 'news',
                platform: 'twitter',
                language: socialLanguage
              })
            })

            if (teaserResponse.ok) {
              const teaserResult = await teaserResponse.json()
              if (teaserResult.success && teaserResult.teaser) {
                tweetText = teaserResult.teaser
                console.log('✅ Twitter teaser generated:', tweetText.substring(0, 50))
              }
            }
          } catch (e) {
            console.warn('⚠️ Teaser generation failed, using title fallback')
          }
        } else {
          console.log('✅ Using cached Twitter teaser')
        }

        // Fallback to title if no teaser
        if (!tweetText) {
          tweetText = title
        }

        // Twitter has 280 character limit - account for URL and spacing
        // t.co wraps URLs to 23 chars, so max text = 280 - 23 - 2 (space + space) = 255 chars
        const maxTextLength = 255
        if (tweetText.length > maxTextLength) {
          tweetText = tweetText.substring(0, maxTextLength - 3) + '...'
        }

        // Generate Twitter Share Intent URL
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(articleUrl)}`

        // Answer callback
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '🐦 Twitter link generated!',
              show_alert: false
            })
          }
        )

        // Send message with clickable link (separate message for better UX)
        const langLabel = socialLanguage.toUpperCase()
        const shortTitle = title.length > 50 ? title.substring(0, 47) + '...' : title

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `🐦 <b>Twitter Share Ready (${langLabel})!</b>\n\n` +
                `📝 «${shortTitle}»\n\n` +
                `👉 <a href="${twitterIntentUrl}">Натисніть щоб опублікувати в Twitter</a>\n\n` +
                `<i>Відкриється Twitter з готовим текстом. Натисніть "Post" для публікації.</i>`,
              parse_mode: 'HTML',
              disable_web_page_preview: true
            })
          }
        )

        // Update original message to show Twitter was used
        const allLanguages = ['en', 'no', 'ua']
        const remainingLanguages = allLanguages.filter(lang => lang !== socialLanguage)

        // Build remaining Twitter buttons
        const remainingTwitterButtons = remainingLanguages.map(lang => ({
          text: `🐦 Twitter ${lang.toUpperCase()}`,
          callback_data: `twitter_${lang}_${newsId}`
        }))

        // Build remaining buttons (TikTok, Skip)
        const buttonRows = []
        if (remainingTwitterButtons.length > 0) {
          buttonRows.push(remainingTwitterButtons)
        }
        buttonRows.push([
          { text: '🎵 TikTok', callback_data: `tiktok_${newsId}` },
          { text: '⏭️ Skip', callback_data: `skip_social_${newsId}` }
        ])

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + `\n\n🐦 <b>Twitter (${langLabel}) link sent!</b>`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: buttonRows
              }
            })
          }
        )

      } else if (action === 'post_all' && socialLanguage) {
        // =================================================================
        // 🌐 Post to ALL socials → DISPATCH TO WORKER (parallel)
        // =================================================================
        const langLabel = socialLanguage.toUpperCase()
        console.log(`[async] Dispatching post_all (${langLabel}) to worker for news:`, newsId)

        // Answer callback immediately
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: `🌐 Публікуємо у всі соцмережі (${langLabel})...`, show_alert: false })
        })

        // Show processing state
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: messageText + `\n\n⏳ <b>🌐 Публікуємо у всі соцмережі (${langLabel})...</b>\n<i>LinkedIn + Facebook + Instagram + Twitter</i>`,
            parse_mode: 'HTML', disable_web_page_preview: true
          })
        })

        // Dispatch to worker (will use Promise.allSettled for parallel posting)
        dispatchToWorker({
          action: 'post_all',
          params: { newsId, socialLanguage },
          telegram: { chatId, messageId, messageText }
        })

      } else if (action === 'combo_li_fb_en') {
        // =================================================================
        // 🔗📘 Combo: LinkedIn EN + Facebook EN → DISPATCH TO WORKER
        // =================================================================
        console.log(`[async] Dispatching combo_li_fb_en to worker for news:`, newsId)

        // Answer callback immediately
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: '🔗📘 Публікуємо LinkedIn + Facebook EN...', show_alert: false })
        })

        // Show processing state with remaining buttons
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: messageText + '\n\n⏳ <b>Публікуємо LinkedIn + Facebook EN...</b>',
            parse_mode: 'HTML', disable_web_page_preview: true,
            reply_markup: {
              inline_keyboard: [
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
            }
          })
        })

        // Dispatch to worker (will use Promise.allSettled for parallel posting)
        dispatchToWorker({
          action: 'combo_li_fb_en',
          params: { newsId },
          telegram: { chatId, messageId, messageText }
        })

      } else if (action === 'combo_li_fb_ig' && socialLanguage) {
        // =================================================================
        // 🔗📘📸 Combo: LinkedIn + Facebook + Instagram → DISPATCH TO WORKER
        // =================================================================
        const langLabel = socialLanguage.toUpperCase()
        console.log(`[async] Dispatching combo_li_fb_ig (${langLabel}) to worker for news:`, newsId)

        // Answer callback immediately
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: `🔗📘📸 Публікуємо LI+FB+IG ${langLabel}...`, show_alert: false })
        })

        // Processing buttons (exclude the current language)
        const remainingLangs = ['en', 'no', 'ua'].filter(l => l !== socialLanguage)

        // Show processing state with remaining buttons
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: messageText + `\n\n⏳ <b>Публікуємо LinkedIn + Facebook + Instagram ${langLabel}...</b>`,
            parse_mode: 'HTML', disable_web_page_preview: true,
            reply_markup: {
              inline_keyboard: [
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
            }
          })
        })

        // Dispatch to worker (will use Promise.allSettled for parallel posting)
        dispatchToWorker({
          action: 'combo_li_fb_ig',
          params: { newsId, socialLanguage },
          telegram: { chatId, messageId, messageText }
        })

      } else if (action === 'skip_social') {
        // =================================================================
        // ⏭️ Skip remaining social platforms
        // =================================================================
        console.log('User skipped remaining social platforms for news:', newsId)

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '✅ Social posting completed',
              show_alert: false
            })
          }
        )

        // Remove all buttons
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + '\n\n✅ <b>Social posting completed</b>',
              parse_mode: 'HTML'
            })
          }
        )

      } else if (callbackData.startsWith('confirm_image_')) {
        // =================================================================
        // ✅ STEP 1→2: Confirm image (existing or no image) → Show publish buttons
        // =================================================================
        const newsId = callbackData.replace('confirm_image_', '')
        console.log('User confirmed image for news:', newsId)

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '✅ Зображення підтверджено',
              show_alert: false
            })
          }
        )

        // Update message with STEP 2 buttons: Publish options
        const newKeyboard = {
          inline_keyboard: [
            [
              { text: '📰 В новини', callback_data: `publish_news_${newsId}` },
              { text: '📝 В блог', callback_data: `publish_blog_${newsId}` }
            ],
            [
              { text: '❌ Reject', callback_data: `reject_${newsId}` }
            ]
          ]
        }

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              reply_markup: newKeyboard
            })
          }
        )

        // Also update message text to show progress
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + '\n\n✅ <b>Зображення підтверджено</b>\n📝 <i>Оберіть де опублікувати...</i>',
              parse_mode: 'HTML',
              reply_markup: newKeyboard
            })
          }
        )

      } else if (callbackData.startsWith('create_custom_')) {
        // =================================================================
        // 📸 STEP 1→Upload: Initiate custom image upload
        // =================================================================
        const newsId = callbackData.replace('create_custom_', '')
        console.log('User wants to upload custom image for news:', newsId)

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '📸 Відправте фото у відповідь на це повідомлення',
              show_alert: true
            })
          }
        )

        // Edit message to show we're waiting for photo
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + `\n\n📸 <b>Очікую фото...</b>\n<i>Reply to this message with your photo</i>\n<code>newsId:${newsId}</code>`,
              parse_mode: 'HTML'
            })
          }
        )

      } else if (callbackData.startsWith('regenerate_image_')) {
        // =================================================================
        // 🔄 REGENERATE IMAGE: Redirect to variant selection
        // =================================================================
        const newsId = callbackData.replace('regenerate_image_', '')
        console.log('User wants to regenerate Telegram image for news:', newsId, '- redirecting to variant selection')

        // Check if variants exist in DB
        const { data: newsCheck } = await supabase
          .from('news')
          .select('id, image_prompt_variants')
          .eq('id', newsId)
          .single()

        const existingVariants = newsCheck?.image_prompt_variants as Array<{ label: string, description: string }> | null

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: existingVariants ? '🎨 Оберіть концепцію зображення' : '🔄 Генерація варіантів...',
              show_alert: false
            })
          }
        )

        if (existingVariants && existingVariants.length > 0) {
          // Show existing variants
          const variantEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣']
          let variantsText = '\n\n🎨 <b>Оберіть концепцію зображення:</b>\n'
          existingVariants.forEach((v, i) => {
            variantsText += `\n${variantEmojis[i] || `${i + 1}.`} <b>${escapeHtml(v.label)}</b>\n<i>${escapeHtml(v.description)}</i>\n`
          })

          const variantKeyboard = {
            inline_keyboard: [
              [
                { text: '1️⃣', callback_data: `select_variant_1_${newsId}` },
                { text: '2️⃣', callback_data: `select_variant_2_${newsId}` },
                { text: '3️⃣', callback_data: `select_variant_3_${newsId}` },
                { text: '4️⃣', callback_data: `select_variant_4_${newsId}` }
              ],
              [
                { text: '🔄 Нові варіанти', callback_data: `new_variants_${newsId}` },
                { text: '🎨 Creative Builder', callback_data: `cb_hub_${newsId}` }
              ],
              [
                { text: '📸 Завантажити своє', callback_data: `create_custom_${newsId}` },
                { text: '❌ Reject', callback_data: `reject_${newsId}` }
              ]
            ]
          }

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: truncateForTelegram(messageText, variantsText),
                parse_mode: 'HTML',
                reply_markup: variantKeyboard
              })
            }
          )
        } else {
          // No variants — show generate button
          const genKeyboard = {
            inline_keyboard: [
              [
                { text: '🎨 Згенерувати варіанти', callback_data: `new_variants_${newsId}` }
              ],
              [
                { text: '📸 Завантажити своє', callback_data: `create_custom_${newsId}` }
              ],
              [
                { text: '❌ Reject', callback_data: `reject_${newsId}` }
              ]
            ]
          }

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: truncateForTelegram(messageText, '\n\n🎨 <b>Варіанти не знайдені</b>\n<i>Натисніть для генерації...</i>'),
                parse_mode: 'HTML',
                reply_markup: genKeyboard
              })
            }
          )
        }

      } else if (action === 'keep' && callbackData.startsWith('keep_image_')) {
        // =================================================================
        // 🖼️ Keep existing image handler (OLD - kept for backward compatibility)
        // =================================================================
        console.log('User chose to keep existing image for news:', newsId)

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '✅ Поточне зображення збережено',
              show_alert: false
            })
          }
        )

        // Update message to show image was kept
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + '\n\n🖼️ <b>Зображення залишено (поточне)</b>',
              parse_mode: 'HTML'
            })
          }
        )

      } else if (action === 'upload' && callbackData.startsWith('upload_image_')) {
        // =================================================================
        // 📸 Upload custom image handler
        // =================================================================
        console.log('User wants to upload custom image for news:', newsId)

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '📸 Відправте фото у відповідь на це повідомлення',
              show_alert: true
            })
          }
        )

        // Edit message to show we're waiting for photo
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + `\n\n📸 <b>Очікую фото...</b>\n<i>Reply to this message with your photo</i>\n<code>newsId:${newsId}</code>`,
              parse_mode: 'HTML'
            })
          }
        )

        // =================================================================
        // 🖼 KEEP ORIGINAL & GALLERY MANAGEMENT
        // =================================================================

      } else if (action === 'keep_orig') {
        // 🖼 Keep original image(s) from RSS/Telegram source
        console.log('🖼 Keep original images for news:', newsId)

        const { data: newsRecord } = await supabase
          .from('news')
          .select('id, image_url, images, rss_analysis')
          .eq('id', newsId)
          .single()

        const isRssSource = !!(newsRecord?.rss_analysis)
        const originalImages: string[] = newsRecord?.images || []
        const imageUrl = newsRecord?.image_url
        const primaryImage = imageUrl || (originalImages.length > 0 ? originalImages[0] : null)

        if (!primaryImage) {
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: '⚠️ Оригінальне зображення не знайдено',
                show_alert: true
              })
            }
          )
          return new Response(JSON.stringify({ ok: true }))
        }

        // Set processed_image_url and ensure images[] is populated
        const updateData: Record<string, any> = {
          processed_image_url: primaryImage,
          image_processed_at: new Date().toISOString()
        }
        if (!originalImages.length && imageUrl) {
          updateData.images = [imageUrl]
        }
        await supabase.from('news').update(updateData).eq('id', newsId)

        const imageCount = originalImages.length || 1

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: `✅ Оригінал збережено (${imageCount} фото)`,
              show_alert: false
            })
          }
        )

        const galleryKeyboard = {
          inline_keyboard: [
            [
              { text: `✅ Готово (${imageCount} фото)`, callback_data: `gal_done_${newsId}` },
              { text: '➕ + AI зображення', callback_data: `add_more_${newsId}` }
            ],
            [
              { text: '📸 Завантажити своє', callback_data: isRssSource ? `upload_rss_image_${newsId}` : `create_custom_${newsId}` }
            ],
            [
              { text: '❌ Skip', callback_data: `reject_${newsId}` }
            ]
          ]
        }

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: truncateForTelegram(messageText, `\n\n🖼 <b>Оригінал збережено!</b> Галерея: ${imageCount} фото\n<i>Можете додати AI зображення або завантажити своє</i>`),
              parse_mode: 'HTML',
              reply_markup: galleryKeyboard
            })
          }
        )

      } else if (action === 'gal_done') {
        // ✅ Gallery finalized → show publish buttons
        console.log('✅ Gallery done for news:', newsId)

        const { data: newsRecord } = await supabase
          .from('news')
          .select('id, images, rss_analysis')
          .eq('id', newsId)
          .single()

        const isRssSource = !!(newsRecord?.rss_analysis)
        const imageCount = newsRecord?.images?.length || 0

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: `✅ Галерея готова (${imageCount} фото)`,
              show_alert: false
            })
          }
        )

        const publishKeyboard = isRssSource ? {
          inline_keyboard: [
            [
              { text: '📰 В новини', callback_data: `publish_rss_news_${newsId}` },
              { text: '📝 В блог', callback_data: `publish_rss_blog_${newsId}` }
            ],
            [
              { text: '❌ Skip', callback_data: `reject_${newsId}` }
            ]
          ]
        } : {
          inline_keyboard: [
            [
              { text: '📰 Опублікувати', callback_data: `publish_news_${newsId}` },
              { text: '📝 В блог', callback_data: `publish_blog_${newsId}` }
            ],
            [
              { text: '❌ Reject', callback_data: `reject_${newsId}` }
            ]
          ]
        }

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: truncateForTelegram(messageText, `\n\n✅ <b>Галерея готова!</b> ${imageCount} фото\n📝 <i>Оберіть де опублікувати...</i>`),
              parse_mode: 'HTML',
              reply_markup: publishKeyboard
            })
          }
        )

      } else if (action === 'add_more') {
        // ➕ Add more images → redirect to variant selection (same as back_to_variants)
        console.log('➕ Add more images for news:', newsId)

        const { data: newsRecord } = await supabase
          .from('news')
          .select('id, image_prompt_variants, images, rss_analysis')
          .eq('id', newsId)
          .single()

        const isRssSource = !!(newsRecord?.rss_analysis)
        const currentImages: string[] = newsRecord?.images || []
        const existingVariants = newsRecord?.image_prompt_variants as Array<{ label: string, description: string }> | null

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: `➕ Додати зображення (зараз: ${currentImages.length})`,
              show_alert: false
            })
          }
        )

        if (existingVariants && existingVariants.length > 0) {
          const variantEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣']
          let variantsText = `\n\n🎨 <b>Додайте зображення</b> (в галереї: ${currentImages.length} фото)\n`
          existingVariants.forEach((v, i) => {
            variantsText += `\n${variantEmojis[i] || `${i + 1}.`} <b>${escapeHtml(v.label)}</b>\n<i>${escapeHtml(v.description)}</i>\n`
          })

          const variantKeyboard = {
            inline_keyboard: [
              [
                { text: '1️⃣', callback_data: `select_variant_1_${newsId}` },
                { text: '2️⃣', callback_data: `select_variant_2_${newsId}` },
                { text: '3️⃣', callback_data: `select_variant_3_${newsId}` },
                { text: '4️⃣', callback_data: `select_variant_4_${newsId}` }
              ],
              [
                { text: '🔄 Нові варіанти', callback_data: `new_variants_${newsId}` },
                { text: '🎨 Creative Builder', callback_data: `cb_hub_${newsId}` }
              ],
              [
                { text: `✅ Готово (${currentImages.length})`, callback_data: `gal_done_${newsId}` },
                { text: '📸 Завантажити', callback_data: isRssSource ? `upload_rss_image_${newsId}` : `create_custom_${newsId}` }
              ],
              [
                { text: '❌ Skip', callback_data: `reject_${newsId}` }
              ]
            ]
          }

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: truncateForTelegram(messageText, variantsText),
                parse_mode: 'HTML',
                reply_markup: variantKeyboard
              })
            }
          )
        } else {
          const genKeyboard = {
            inline_keyboard: [
              [
                { text: '🎲 Згенерувати варіанти', callback_data: `new_variants_${newsId}` },
                { text: '🎨 Creative Builder', callback_data: `cb_hub_${newsId}` }
              ],
              [
                { text: `✅ Готово (${currentImages.length})`, callback_data: `gal_done_${newsId}` },
                { text: '📸 Завантажити', callback_data: isRssSource ? `upload_rss_image_${newsId}` : `create_custom_${newsId}` }
              ],
              [
                { text: '❌ Skip', callback_data: `reject_${newsId}` }
              ]
            ]
          }

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: truncateForTelegram(messageText, `\n\n➕ <b>Додайте зображення</b> (в галереї: ${currentImages.length} фото)`),
                parse_mode: 'HTML',
                reply_markup: genKeyboard
              })
            }
          )
        }

        // =================================================================
        // 🔄 RSS IMAGE WORKFLOW: confirm_rss_image, regenerate_rss_image, upload_rss_image
        // =================================================================

      } else if (action === 'confirm_rss_image') {
        // ✅ RSS: Confirm existing image → set processed_image_url → Show publish buttons
        console.log('User confirmed RSS image for news:', newsId)

        // Set processed_image_url to original image for SEO/social media
        const { data: newsRecord } = await supabase
          .from('news')
          .select('id, image_url, images')
          .eq('id', newsId)
          .single()

        if (newsRecord?.image_url) {
          const updateData: Record<string, any> = {
            processed_image_url: newsRecord.image_url,
            image_processed_at: new Date().toISOString()
          }
          if (!newsRecord.images?.length) {
            updateData.images = [newsRecord.image_url]
          }
          await supabase.from('news').update(updateData).eq('id', newsId)
        }

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '✅ Зображення підтверджено',
              show_alert: false
            })
          }
        )

        // Update message with RSS publish buttons
        const rssPublishKeyboard = {
          inline_keyboard: [
            [
              { text: '📰 В новини', callback_data: `publish_rss_news_${newsId}` },
              { text: '📝 В блог', callback_data: `publish_rss_blog_${newsId}` }
            ],
            [
              { text: '❌ Skip', callback_data: `reject_${newsId}` }
            ]
          ]
        }

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + '\n\n✅ <b>Зображення підтверджено</b>\n📝 <i>Оберіть де опублікувати...</i>',
              parse_mode: 'HTML',
              reply_markup: rssPublishKeyboard
            })
          }
        )

      } else if (action === 'regenerate_rss_image') {
        // 🔄 RSS: Redirect to variant selection
        console.log('User wants to regenerate RSS image for news:', newsId, '- redirecting to variant selection')

        // Validate newsId before creating buttons
        if (!newsId) {
          console.error('❌ CRITICAL: newsId is undefined when creating variant buttons!')
        }

        // Verify news record exists and get variants
        const { data: newsCheck, error: newsCheckError } = await supabase
          .from('news')
          .select('id, original_title, image_prompt_variants')
          .eq('id', newsId)
          .single()

        if (newsCheckError || !newsCheck) {
          console.error('❌ News record not found for regeneration:', newsId, newsCheckError?.message)

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: `❌ Помилка: новина не знайдена в базі даних`,
                show_alert: true
              })
            }
          )

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: messageText + `\n\n❌ <b>Помилка:</b> Новина не знайдена в базі даних.\n<code>${newsId}</code>\n\n<i>Можливо запис був видалений або не був створений.</i>`,
                parse_mode: 'HTML'
              })
            }
          )

          return new Response(JSON.stringify({ ok: true }))
        }

        console.log('✅ News record verified for regeneration:', newsCheck.id)

        const existingVariants = newsCheck.image_prompt_variants as Array<{ label: string, description: string }> | null

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: existingVariants ? '🎨 Оберіть концепцію зображення' : '🔄 Генерація варіантів...',
              show_alert: false
            })
          }
        )

        if (existingVariants && existingVariants.length > 0) {
          const variantEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣']
          let variantsText = '\n\n🎨 <b>Оберіть концепцію зображення:</b>\n'
          existingVariants.forEach((v, i) => {
            variantsText += `\n${variantEmojis[i] || `${i + 1}.`} <b>${escapeHtml(v.label)}</b>\n<i>${escapeHtml(v.description)}</i>\n`
          })

          const variantKeyboard = {
            inline_keyboard: [
              [
                { text: '1️⃣', callback_data: `select_variant_1_${newsId}` },
                { text: '2️⃣', callback_data: `select_variant_2_${newsId}` },
                { text: '3️⃣', callback_data: `select_variant_3_${newsId}` },
                { text: '4️⃣', callback_data: `select_variant_4_${newsId}` }
              ],
              [
                { text: '🔄 Нові варіанти', callback_data: `new_variants_${newsId}` },
                { text: '🎨 Creative Builder', callback_data: `cb_hub_${newsId}` }
              ],
              [
                { text: '📸 Завантажити своє', callback_data: `upload_rss_image_${newsId}` },
                { text: '❌ Skip', callback_data: `reject_${newsId}` }
              ]
            ]
          }

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: truncateForTelegram(messageText, variantsText),
                parse_mode: 'HTML',
                reply_markup: variantKeyboard
              })
            }
          )
        } else {
          // No variants — show generate button
          const genKeyboard = {
            inline_keyboard: [
              [
                { text: '🎨 Згенерувати варіанти', callback_data: `new_variants_${newsId}` }
              ],
              [
                { text: '📸 Завантажити своє', callback_data: `upload_rss_image_${newsId}` }
              ],
              [
                { text: '❌ Skip', callback_data: `reject_${newsId}` }
              ]
            ]
          }

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: truncateForTelegram(messageText, '\n\n🎨 <b>Варіанти не знайдені</b>\n<i>Натисніть для генерації...</i>'),
                parse_mode: 'HTML',
                reply_markup: genKeyboard
              })
            }
          )
        }

      } else if (action === 'regen_img_with_lang') {
        // 🔄 Generate new AI image with selected language (works for both RSS and Telegram)
        const selectedLang = imageLanguage || 'en'
        const langNames: Record<string, string> = { ua: 'українською', no: 'норвезькою', en: 'англійською' }
        console.log('User selected language for image:', selectedLang, 'for news:', newsId)

        // Verify news record exists and determine source type
        const { data: newsCheck, error: newsCheckError } = await supabase
          .from('news')
          .select('id, original_title, rss_analysis')
          .eq('id', newsId)
          .single()

        // Determine if this is RSS or Telegram source
        const isRssSource = !!(newsCheck?.rss_analysis)

        if (newsCheckError || !newsCheck) {
          console.error('❌ News record not found for regeneration:', newsId, newsCheckError?.message)

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: `❌ Помилка: новина не знайдена в базі даних (${newsId.substring(0, 8)}...)`,
                show_alert: true
              })
            }
          )

          // Update message to show error
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: messageText + `\n\n❌ <b>Помилка:</b> Новина не знайдена в базі даних.\n<code>${newsId}</code>\n\n<i>Можливо запис був видалений або не був створений.</i>`,
                parse_mode: 'HTML'
              })
            }
          )

          return new Response(JSON.stringify({ ok: true }))
        }

        console.log('✅ News record verified:', newsCheck.id, newsCheck.original_title?.substring(0, 50))

        // Show "generating" message
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: `🎨 Генерую зображення ${langNames[selectedLang] || selectedLang}...`,
              show_alert: false
            })
          }
        )

        // Update message to show progress
        const progressEditResponse = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: truncateForTelegram(messageText, `\n\n⏳ <b>Генерація зображення ${langNames[selectedLang] || selectedLang}...</b>\n<i>Це може зайняти до 30 секунд</i>`),
              parse_mode: 'HTML'
            })
          }
        )
        const progressEditResult = await progressEditResponse.json()
        if (!progressEditResult.ok) {
          console.error('❌ Failed to edit message (progress):', progressEditResult.description || progressEditResult)
        }

        // Clear existing processed images before regenerating (both formats)
        await supabase
          .from('news')
          .update({ processed_image_url: null, processed_image_url_wide: null })
          .eq('id', newsId)

        // Call process-image for BOTH aspect ratios (1:1 for Instagram, 16:9 for LinkedIn/Facebook)
        try {
          // Generate 1:1 (square) image first
          const imageGenResponse = await fetch(
            `${SUPABASE_URL}/functions/v1/process-image`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                newsId: newsId,
                generateFromPrompt: true,
                language: selectedLang,
                aspectRatio: '1:1'
              })
            }
          )

          const imageGenResult = await imageGenResponse.json()

          // Generate 16:9 (wide) image in parallel (don't wait for result to show first image)
          let wideImageUrl: string | null = null
          const wideImagePromise = fetch(
            `${SUPABASE_URL}/functions/v1/process-image`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                newsId: newsId,
                generateFromPrompt: true,
                language: selectedLang,
                aspectRatio: '16:9'
              })
            }
          ).then(res => res.json()).then(result => {
            if (result.success && result.processedImageUrl) {
              wideImageUrl = result.processedImageUrl
              console.log(`✅ Wide image (16:9) generated: ${wideImageUrl}`)
            } else {
              console.warn(`⚠️ Wide image (16:9) generation failed:`, result.error || 'unknown error')
            }
            return result
          }).catch(err => {
            console.error(`❌ Wide image (16:9) generation error:`, err)
            return null
          })

          if (imageGenResult.success && imageGenResult.processedImageUrl) {
            // Wait for wide image to complete before showing result
            await wideImagePromise

            // Success! Show both images with appropriate buttons based on source type
            const newImageUrl = imageGenResult.processedImageUrl

            // Append generated image to gallery
            const { data: galNews } = await supabase.from('news').select('images').eq('id', newsId).single()
            const galImages: string[] = galNews?.images || []
            if (!galImages.includes(newImageUrl)) {
              await supabase.from('news').update({ images: [...galImages, newImageUrl] }).eq('id', newsId)
            }
            const galleryCount = galImages.includes(newImageUrl) ? galImages.length : galImages.length + 1

            // Use different callbacks for RSS vs Telegram sources
            const newKeyboard = isRssSource ? {
              inline_keyboard: [
                [
                  { text: `✅ Готово (${galleryCount} фото)`, callback_data: `gal_done_${newsId}` },
                  { text: '➕ Ще', callback_data: `add_more_${newsId}` }
                ],
                [
                  { text: '🖼 + Оригінал', callback_data: `keep_orig_${newsId}` },
                  { text: '📸 Завантажити', callback_data: `upload_rss_image_${newsId}` }
                ],
                [
                  { text: '❌ Skip', callback_data: `reject_${newsId}` }
                ]
              ]
            } : {
              inline_keyboard: [
                [
                  { text: `✅ Готово (${galleryCount} фото)`, callback_data: `gal_done_${newsId}` },
                  { text: '➕ Ще', callback_data: `add_more_${newsId}` }
                ],
                [
                  { text: '🖼 + Оригінал', callback_data: `keep_orig_${newsId}` },
                  { text: '📸 Завантажити', callback_data: `create_custom_${newsId}` }
                ],
                [
                  { text: '❌ Reject', callback_data: `reject_${newsId}` }
                ]
              ]
            }

            // Build message with both image links
            const squareImageLink = `🖼️ <b>1:1</b> (Instagram): ${escapeHtml(newImageUrl)}`
            const wideImageLink = wideImageUrl
              ? `\n📐 <b>16:9</b> (LinkedIn/FB): ${escapeHtml(wideImageUrl)}`
              : '\n📐 <b>16:9</b>: ⚠️ не вдалося згенерувати'

            const successEditResponse = await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  message_id: messageId,
                  text: truncateForTelegram(messageText, `\n\n✅ <b>Зображення згенеровано (${selectedLang.toUpperCase()})!</b>\n${squareImageLink}${wideImageLink}`),
                  parse_mode: 'HTML',
                  reply_markup: newKeyboard
                })
              }
            )
            const successEditResult = await successEditResponse.json()
            if (!successEditResult.ok) {
              console.error('❌ Failed to edit message (success):', successEditResult.description || successEditResult)
            }
          } else {
            // Failed - show error and keep regenerate button (appropriate for source type)
            const errorMsg = imageGenResult.error || 'Невідома помилка'
            const debugInfo = imageGenResult.debug
              ? `\n\n🔍 <b>Debug:</b> v${imageGenResult.debug.version}, ${imageGenResult.debug.lastApiError || 'no details'}`
              : ''

            const newKeyboard = isRssSource ? {
              inline_keyboard: [
                [
                  { text: '🔄 Спробувати ще раз', callback_data: `regenerate_rss_image_${newsId}` }
                ],
                [
                  { text: '📸 Завантажити своє', callback_data: `upload_rss_image_${newsId}` }
                ],
                [
                  { text: '❌ Skip', callback_data: `reject_${newsId}` }
                ]
              ]
            } : {
              inline_keyboard: [
                [
                  { text: '🔄 Спробувати ще раз', callback_data: `regenerate_image_${newsId}` }
                ],
                [
                  { text: '📸 Завантажити своє', callback_data: `create_custom_${newsId}` }
                ],
                [
                  { text: '❌ Reject', callback_data: `reject_${newsId}` }
                ]
              ]
            }

            const errorEditResponse = await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  message_id: messageId,
                  text: truncateForTelegram(messageText, `\n\n❌ <b>Помилка генерації:</b> ${errorMsg}${debugInfo}\n\n<i>Спробуйте ще раз або завантажте своє зображення</i>`),
                  parse_mode: 'HTML',
                  reply_markup: newKeyboard
                })
              }
            )
            const errorEditResult = await errorEditResponse.json()
            if (!errorEditResult.ok) {
              console.error('❌ Failed to edit message (gen error):', errorEditResult.description || errorEditResult)
            }
          }
        } catch (genError: any) {
          console.error('Error regenerating image:', genError)

          const newKeyboard = isRssSource ? {
            inline_keyboard: [
              [
                { text: '🔄 Спробувати ще раз', callback_data: `regenerate_rss_image_${newsId}` }
              ],
              [
                { text: '📸 Завантажити своє', callback_data: `upload_rss_image_${newsId}` }
              ],
              [
                { text: '❌ Skip', callback_data: `reject_${newsId}` }
              ]
            ]
          } : {
            inline_keyboard: [
              [
                { text: '🔄 Спробувати ще раз', callback_data: `regenerate_image_${newsId}` }
              ],
              [
                { text: '📸 Завантажити своє', callback_data: `create_custom_${newsId}` }
              ],
              [
                { text: '❌ Reject', callback_data: `reject_${newsId}` }
              ]
            ]
          }

          const catchEditResponse = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: truncateForTelegram(messageText, `\n\n❌ <b>Помилка:</b> ${genError.message}\n\n<i>Спробуйте ще раз або завантажте своє зображення</i>`),
                parse_mode: 'HTML',
                reply_markup: newKeyboard
              })
            }
          )
          const catchEditResult = await catchEditResponse.json()
          if (!catchEditResult.ok) {
            console.error('❌ Failed to edit message (catch error):', catchEditResult.description || catchEditResult)
          }
        }

      } else if (action === 'back_to_rss') {
        // ← Back to RSS image options
        console.log('User wants to go back to RSS image options for news:', newsId)

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '← Назад',
              show_alert: false
            })
          }
        )

        const rssKeyboard = {
          inline_keyboard: [
            [
              { text: '✅ Використати', callback_data: `confirm_rss_image_${newsId}` },
              { text: '🔄 Перегенерувати', callback_data: `regenerate_rss_image_${newsId}` }
            ],
            [
              { text: '📸 Завантажити своє', callback_data: `upload_rss_image_${newsId}` }
            ],
            [
              { text: '❌ Skip', callback_data: `reject_${newsId}` }
            ]
          ]
        }

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText,
              parse_mode: 'HTML',
              reply_markup: rssKeyboard
            })
          }
        )

      } else if (action === 'upload_rss_image') {
        // 📸 RSS: Upload custom image - prompt user to send photo
        console.log('User wants to upload custom RSS image for news:', newsId)

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '📸 Відправте фото у відповідь на це повідомлення',
              show_alert: true
            })
          }
        )

        // Edit message to show we're waiting for photo
        // Note: The existing photo reply handler will detect newsId from message and handle the upload
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + `\n\n📸 <b>Очікую фото...</b>\n<i>Reply to this message with your photo</i>\n<code>newsId:${newsId}</code>\n<code>rss_workflow:true</code>`,
              parse_mode: 'HTML'
            })
          }
        )

        // =================================================================
        // 🎨 IMAGE VARIANT WORKFLOW: select_variant, new_variants
        // =================================================================

      } else if (action === 'select_variant') {
        // Moderator selected a visual concept variant → show language selection
        const variantIndex = parseInt(imageLanguage || '1')
        console.log(`🎨 User selected variant ${variantIndex} for news:`, newsId)

        // 1. Read variants from DB
        const { data: newsRecord, error: newsError } = await supabase
          .from('news')
          .select('id, image_prompt_variants')
          .eq('id', newsId)
          .single()

        if (newsError || !newsRecord) {
          console.error('❌ News not found for variant selection:', newsId)
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: '❌ Новина не знайдена',
                show_alert: true
              })
            }
          )
          return new Response(JSON.stringify({ ok: true }))
        }

        const variants = newsRecord.image_prompt_variants as Array<{ label: string, description: string }> | null

        if (!variants || variants.length < variantIndex) {
          console.error('❌ Variant not found:', variantIndex, 'available:', variants?.length)
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: '❌ Варіант не знайдено',
                show_alert: true
              })
            }
          )
          return new Response(JSON.stringify({ ok: true }))
        }

        const selectedVariant = variants[variantIndex - 1]
        console.log(`✅ Selected variant: "${selectedVariant.label}"`)

        // 2. Show language selection buttons
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: `🎨 Обрано: "${selectedVariant.label}" — оберіть мову`,
              show_alert: false
            })
          }
        )

        const langKeyboard = {
          inline_keyboard: [
            [
              { text: '🇺🇦 UA', callback_data: `vl_${variantIndex}_ua_${newsId}` },
              { text: '🇳🇴 NO', callback_data: `vl_${variantIndex}_no_${newsId}` },
              { text: '🇬🇧 EN', callback_data: `vl_${variantIndex}_en_${newsId}` }
            ],
            [
              { text: '← Назад до варіантів', callback_data: `back_to_variants_${newsId}` }
            ]
          ]
        }

        const editLangResponse = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: truncateForTelegram(messageText, `\n\n🎨 <b>Обрано: "${escapeHtml(selectedVariant.label)}"</b>\n<i>${escapeHtml(selectedVariant.description)}</i>\n\n🌐 <b>Оберіть мову для зображення:</b>`),
              parse_mode: 'HTML',
              reply_markup: langKeyboard
            })
          }
        )
        if (!editLangResponse.ok) {
          const editErr = await editLangResponse.text()
          console.error('❌ editMessageText failed (select_variant):', editErr)
        }

      } else if (action === 'variant_with_lang') {
        // =================================================================
        // 🎨 Variant + Language → DISPATCH TO WORKER
        // =================================================================
        const variantIndex = parseInt(socialLanguage || '1')
        const selectedLang = imageLanguage || 'en'
        const langNames: Record<string, string> = { ua: 'UA', no: 'NO', en: 'EN' }
        console.log(`[async] Dispatching variant_with_lang (variant ${variantIndex}, ${selectedLang}) to worker for news:`, newsId)

        // Answer callback immediately
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: `🎨 Генерація варіанту ${variantIndex} (${langNames[selectedLang] || selectedLang})...`, show_alert: false })
        })

        // Show processing state
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: truncateForTelegram(messageText, `\n\n⏳ <b>Генерація промпта та зображення (варіант ${variantIndex}, ${langNames[selectedLang] || selectedLang})...</b>`),
            parse_mode: 'HTML'
          })
        })

        // Dispatch to worker
        dispatchToWorker({
          action: 'variant_with_lang',
          params: { newsId, variantIndex, selectedLang },
          telegram: { chatId, messageId, messageText }
        })

      } else if (action === 'back_to_variants') {
        // ← Back to variant selection: show existing variants from DB
        console.log('← Back to variants for news:', newsId)

        const { data: newsRecord, error: newsError } = await supabase
          .from('news')
          .select('id, image_prompt_variants, rss_analysis')
          .eq('id', newsId)
          .single()

        const isRssSource = !!(newsRecord?.rss_analysis)
        const existingVariants = newsRecord?.image_prompt_variants as Array<{ label: string, description: string }> | null

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '← Назад до варіантів',
              show_alert: false
            })
          }
        )

        if (existingVariants && existingVariants.length > 0) {
          // Show existing variants
          const variantEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣']
          let variantsText = '\n\n🎨 <b>Оберіть концепцію зображення:</b>\n'
          existingVariants.forEach((v, i) => {
            variantsText += `\n${variantEmojis[i] || `${i + 1}.`} <b>${escapeHtml(v.label)}</b>\n<i>${escapeHtml(v.description)}</i>\n`
          })

          const variantKeyboard = {
            inline_keyboard: [
              [
                { text: '1️⃣', callback_data: `select_variant_1_${newsId}` },
                { text: '2️⃣', callback_data: `select_variant_2_${newsId}` },
                { text: '3️⃣', callback_data: `select_variant_3_${newsId}` },
                { text: '4️⃣', callback_data: `select_variant_4_${newsId}` }
              ],
              [
                { text: '🔄 Нові варіанти', callback_data: `new_variants_${newsId}` },
                { text: '🎨 Creative Builder', callback_data: `cb_hub_${newsId}` }
              ],
              [
                { text: '🖼 Оригінал', callback_data: `keep_orig_${newsId}` },
                { text: '📸 Завантажити', callback_data: isRssSource ? `upload_rss_image_${newsId}` : `create_custom_${newsId}` }
              ],
              [
                { text: '❌ Reject', callback_data: `reject_${newsId}` }
              ]
            ]
          }

          const editBackResponse = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: truncateForTelegram(messageText, variantsText),
                parse_mode: 'HTML',
                reply_markup: variantKeyboard
              })
            }
          )
          if (!editBackResponse.ok) {
            const editErr = await editBackResponse.text()
            console.error('❌ editMessageText failed (back_to_variants):', editErr)
          }
        } else {
          // No variants stored — generate new ones or use Creative Builder
          const genKeyboard = {
            inline_keyboard: [
              [
                { text: '🎲 Random Variants', callback_data: `new_variants_${newsId}` },
                { text: '🎨 Creative Builder', callback_data: `cb_hub_${newsId}` }
              ],
              [
                { text: '🖼 Оригінал', callback_data: `keep_orig_${newsId}` },
                { text: '📸 Завантажити', callback_data: isRssSource ? `upload_rss_image_${newsId}` : `create_custom_${newsId}` }
              ],
              [
                { text: '❌ Reject', callback_data: `reject_${newsId}` }
              ]
            ]
          }

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: truncateForTelegram(messageText, '\n\n⚠️ <b>Варіанти не знайдені</b>\n<i>Натисніть "Згенерувати варіанти" для створення нових</i>'),
                parse_mode: 'HTML',
                reply_markup: genKeyboard
              })
            }
          )
        }

      } else if (action === 'new_variants') {
        // =================================================================
        // 🔄 Generate new variants → DISPATCH TO WORKER
        // =================================================================
        console.log(`[async] Dispatching new_variants to worker for news:`, newsId)

        // Answer callback immediately
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: '🔄 Генерація нових варіантів...', show_alert: false })
        })

        // Show processing state
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: truncateForTelegram(messageText, '\n\n⏳ <b>Генерація нових візуальних концепцій...</b>'),
            parse_mode: 'HTML'
          })
        })

        // Dispatch to worker
        dispatchToWorker({
          action: 'new_variants',
          params: { newsId },
          telegram: { chatId, messageId, messageText }
        })

        // ═══════════════════════════════════════════════════════════════════
        // CREATIVE BUILDER HANDLERS
        // ═══════════════════════════════════════════════════════════════════
      } else if (action === 'cb_hub') {
        // Show/return to Creative Builder hub screen
        console.log('🎨 Creative Builder hub for news:', newsId)

        const { data: newsRecord, error: newsError } = await supabase
          .from('news')
          .select('id, original_title, creative_builder_state, rss_analysis')
          .eq('id', newsId)
          .single()

        if (newsError || !newsRecord) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackId, text: '❌ Новина не знайдена', show_alert: true })
          })
          return new Response(JSON.stringify({ ok: true }))
        }

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: '🎨 Creative Builder', show_alert: false })
        })

        const state = (newsRecord.creative_builder_state || {}) as Record<string, any>
        const isRssSource = !!(newsRecord.rss_analysis)

        // Category map: code → { key, label, emoji }
        const categories = [
          { key: 'style', code: 'ST', label: 'Стиль', emoji: '🎨' },
          { key: 'color', code: 'CL', label: 'Тон', emoji: '🌈' },
          { key: 'object', code: 'OB', label: "Об'єкт", emoji: '🔮' },
          { key: 'action', code: 'AC', label: 'Дія', emoji: '💫' },
          { key: 'background', code: 'BG', label: 'Фон', emoji: '🌆' },
          { key: 'effects', code: 'FX', label: 'Ефекти', emoji: '✨' },
          { key: 'text', code: 'TX', label: 'Текст', emoji: '📝' },
        ]

        // Build status text
        let selectedCount = 0
        let statusLines = ''
        for (const cat of categories) {
          const sel = state[cat.key]
          if (sel && sel.label) {
            statusLines += `\n✅ ${cat.label}: ${escapeHtml(sel.label)}`
            selectedCount++
          } else {
            statusLines += `\n⬜ ${cat.label}: --`
          }
        }

        const articleTitle = newsRecord.original_title
          ? escapeHtml(newsRecord.original_title.substring(0, 60)) + (newsRecord.original_title.length > 60 ? '...' : '')
          : 'N/A'

        const hubText = `\n\n🎨 <b>Creative Builder</b>\n\n📰 "${articleTitle}"\n\n<b>Ваші вибори:</b>${statusLines}`

        // Build keyboard: 2 per row for first 6, then text alone, then generate/reset/back
        const catButtons = categories.map(cat => {
          const sel = state[cat.key]
          const checkmark = sel && sel.label ? ' ✅' : ''
          return { text: `${cat.emoji} ${cat.label}${checkmark}`, callback_data: `cb_c_${cat.code}_${newsId}` }
        })

        const hubKeyboard = {
          inline_keyboard: [
            [catButtons[0], catButtons[1]],
            [catButtons[2], catButtons[3]],
            [catButtons[4], catButtons[5]],
            [catButtons[6]],
            [
              { text: `🚀 Генерувати (${selectedCount}/7)`, callback_data: `cb_gen_${newsId}` },
              { text: '🔄 Скинути', callback_data: `cb_rst_${newsId}` }
            ],
            [
              { text: '🎲 Random Variants', callback_data: `new_variants_${newsId}` }
            ],
            [
              { text: '← Назад', callback_data: `back_to_variants_${newsId}` }
            ]
          ]
        }

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: truncateForTelegram(messageText, hubText),
            parse_mode: 'HTML',
            reply_markup: hubKeyboard
          })
        })

      } else if (action === 'cb_category') {
        // Show options for a specific category
        const catCode = socialLanguage || ''
        console.log(`🎨 Creative Builder: showing category ${catCode} for news:`, newsId)

        const catMap: Record<string, string> = {
          'ST': 'style', 'CL': 'color', 'OB': 'object',
          'AC': 'action', 'BG': 'background', 'FX': 'effects', 'TX': 'text'
        }
        const catLabelMap: Record<string, string> = {
          'ST': '🎨 Стиль', 'CL': '🌈 Тон', 'OB': "🔮 Об'єкт",
          'AC': '💫 Дія', 'BG': '🌆 Фон', 'FX': '✨ Ефекти', 'TX': '📝 Текст'
        }
        const categoryName = catMap[catCode]

        if (!categoryName) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackId, text: '❌ Невідома категорія', show_alert: true })
          })
          return new Response(JSON.stringify({ ok: true }))
        }

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: catLabelMap[catCode] || categoryName, show_alert: false })
        })

        // Special handling for Object category — dynamically generated
        if (catCode === 'OB') {
          const { data: newsRecord } = await supabase
            .from('news')
            .select('id, original_title, original_content, creative_builder_state')
            .eq('id', newsId)
            .single()

          if (!newsRecord) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId, message_id: messageId,
                text: truncateForTelegram(messageText, '\n\n❌ Новина не знайдена'),
                parse_mode: 'HTML'
              })
            })
            return new Response(JSON.stringify({ ok: true }))
          }

          const state = (newsRecord.creative_builder_state || {}) as Record<string, any>
          let suggestedObjects = state.suggested_objects as Array<{ label: string; prompt_fragment: string }> | null

          // If no cached objects, extract them via GPT
          if (!suggestedObjects || suggestedObjects.length === 0) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId, message_id: messageId,
                text: truncateForTelegram(messageText, "\n\n⏳ <b>Аналізую статтю для визначення об'єктів...</b>"),
                parse_mode: 'HTML'
              })
            })

            try {
              const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
              const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
              const objResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-image-prompt`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  newsId,
                  title: (newsRecord.original_title || '').substring(0, 200),
                  content: (newsRecord.original_content || '').substring(0, 2000),
                  mode: 'extract_objects'
                })
              })

              if (objResponse.ok) {
                const objResult = await objResponse.json()
                suggestedObjects = objResult.objects || []

                // Cache in DB
                await supabase
                  .from('news')
                  .update({
                    creative_builder_state: { ...state, suggested_objects: suggestedObjects }
                  })
                  .eq('id', newsId)
              }
            } catch (objErr: any) {
              console.error('❌ Error extracting objects:', objErr)
            }
          }

          if (!suggestedObjects || suggestedObjects.length === 0) {
            suggestedObjects = [{ label: 'Default Object', prompt_fragment: 'A symbolic object representing the article topic' }]
          }

          // Build object selection buttons (1 per row)
          const selectedObj = state.object
          const objButtons = suggestedObjects.map((obj, i) => {
            const isSelected = selectedObj && selectedObj.label === obj.label
            return [{ text: `${isSelected ? '✅ ' : ''}${obj.label}`, callback_data: `cb_s_OB_${i}_${newsId}` }]
          })
          objButtons.push([{ text: '← Назад', callback_data: `cb_hub_${newsId}` }])

          let objText = "\n\n🔮 <b>Оберіть центральний об'єкт:</b>\n"
          suggestedObjects.forEach((obj, i) => {
            const isSelected = selectedObj && selectedObj.label === obj.label
            objText += `\n${isSelected ? '✅' : `${i + 1}.`} <b>${escapeHtml(obj.label)}</b>\n<i>${escapeHtml(obj.prompt_fragment)}</i>\n`
          })

          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId, message_id: messageId,
              text: truncateForTelegram(messageText, objText),
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: objButtons }
            })
          })

          return new Response(JSON.stringify({ ok: true }))
        }

        // Regular categories: fetch from creative_elements table
        const { data: elements } = await supabase
          .from('creative_elements')
          .select('code, label_ua, label_en, prompt_fragment, emoji, sort_order')
          .eq('category', categoryName)
          .eq('is_active', true)
          .order('sort_order', { ascending: true })

        if (!elements || elements.length === 0) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId, message_id: messageId,
              text: truncateForTelegram(messageText, `\n\n⚠️ Елементи для категорії "${categoryName}" не знайдені`),
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: [[{ text: '← Назад', callback_data: `cb_hub_${newsId}` }]] }
            })
          })
          return new Response(JSON.stringify({ ok: true }))
        }

        // Get current selection
        const { data: newsRecord } = await supabase
          .from('news')
          .select('creative_builder_state')
          .eq('id', newsId)
          .single()

        const currentState = (newsRecord?.creative_builder_state || {}) as Record<string, any>
        const currentSelection = currentState[categoryName]

        // Build buttons (2 per row)
        const optionButtons: any[][] = []
        let row: any[] = []
        elements.forEach((el: any, i: number) => {
          const isSelected = currentSelection && currentSelection.code === el.code
          const btnText = `${isSelected ? '✅ ' : ''}${el.emoji || ''} ${el.label_ua}`
          row.push({ text: btnText, callback_data: `cb_s_${catCode}_${i}_${newsId}` })
          if (row.length === 2 || i === elements.length - 1) {
            optionButtons.push([...row])
            row = []
          }
        })
        optionButtons.push([{ text: '← Назад', callback_data: `cb_hub_${newsId}` }])

        let catText = `\n\n${catLabelMap[catCode]} <b>— оберіть:</b>\n`
        elements.forEach((el: any) => {
          const isSelected = currentSelection && currentSelection.code === el.code
          catText += `\n${isSelected ? '✅' : '○'} ${el.emoji || ''} <b>${escapeHtml(el.label_ua)}</b> — <i>${escapeHtml(el.label_en)}</i>`
        })

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: truncateForTelegram(messageText, catText),
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: optionButtons }
          })
        })

      } else if (action === 'cb_select') {
        // Select an option within a category
        const catCode = socialLanguage || ''
        const optionIndex = parseInt(imageLanguage || '0')
        console.log(`🎨 Creative Builder: select option ${optionIndex} in category ${catCode} for news:`, newsId)

        const catMap: Record<string, string> = {
          'ST': 'style', 'CL': 'color', 'OB': 'object',
          'AC': 'action', 'BG': 'background', 'FX': 'effects', 'TX': 'text'
        }
        const categoryName = catMap[catCode]

        if (!categoryName) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackId, text: '❌ Невідома категорія', show_alert: true })
          })
          return new Response(JSON.stringify({ ok: true }))
        }

        // Get current state
        const { data: newsRecord } = await supabase
          .from('news')
          .select('creative_builder_state')
          .eq('id', newsId)
          .single()

        const currentState = (newsRecord?.creative_builder_state || {}) as Record<string, any>

        let selectedElement: { code: string; label: string; prompt_fragment: string } | null = null

        if (catCode === 'OB') {
          // Object: get from cached suggested_objects
          const suggestedObjects = currentState.suggested_objects as Array<{ label: string; prompt_fragment: string }> | null
          if (suggestedObjects && suggestedObjects[optionIndex]) {
            const obj = suggestedObjects[optionIndex]
            selectedElement = { code: `ob_${optionIndex}`, label: obj.label, prompt_fragment: obj.prompt_fragment }
          }
        } else {
          // Regular category: fetch from creative_elements by sort order index
          const { data: elements } = await supabase
            .from('creative_elements')
            .select('code, label_ua, label_en, prompt_fragment')
            .eq('category', categoryName)
            .eq('is_active', true)
            .order('sort_order', { ascending: true })

          if (elements && elements[optionIndex]) {
            const el = elements[optionIndex]
            selectedElement = { code: el.code, label: el.label_ua, prompt_fragment: el.prompt_fragment }
          }
        }

        if (!selectedElement) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackId, text: '❌ Елемент не знайдено', show_alert: true })
          })
          return new Response(JSON.stringify({ ok: true }))
        }

        // Update state
        const newState = { ...currentState, [categoryName]: selectedElement }
        await supabase
          .from('news')
          .update({ creative_builder_state: newState })
          .eq('id', newsId)

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: `✅ ${selectedElement.label}`, show_alert: false })
        })

        // Return to hub (simulate cb_hub action by re-rendering hub)
        // Re-read updated state
        const { data: updatedNews } = await supabase
          .from('news')
          .select('id, original_title, creative_builder_state, rss_analysis')
          .eq('id', newsId)
          .single()

        const updatedState = (updatedNews?.creative_builder_state || {}) as Record<string, any>

        const categories = [
          { key: 'style', code: 'ST', label: 'Стиль', emoji: '🎨' },
          { key: 'color', code: 'CL', label: 'Тон', emoji: '🌈' },
          { key: 'object', code: 'OB', label: "Об'єкт", emoji: '🔮' },
          { key: 'action', code: 'AC', label: 'Дія', emoji: '💫' },
          { key: 'background', code: 'BG', label: 'Фон', emoji: '🌆' },
          { key: 'effects', code: 'FX', label: 'Ефекти', emoji: '✨' },
          { key: 'text', code: 'TX', label: 'Текст', emoji: '📝' },
        ]

        let selectedCount = 0
        let statusLines = ''
        for (const cat of categories) {
          const sel = updatedState[cat.key]
          if (sel && sel.label) {
            statusLines += `\n✅ ${cat.label}: ${escapeHtml(sel.label)}`
            selectedCount++
          } else {
            statusLines += `\n⬜ ${cat.label}: --`
          }
        }

        const articleTitle = updatedNews?.original_title
          ? escapeHtml(updatedNews.original_title.substring(0, 60)) + (updatedNews.original_title.length > 60 ? '...' : '')
          : 'N/A'

        const hubText = `\n\n🎨 <b>Creative Builder</b>\n\n📰 "${articleTitle}"\n\n<b>Ваші вибори:</b>${statusLines}`

        const catButtons = categories.map(cat => {
          const sel = updatedState[cat.key]
          const checkmark = sel && sel.label ? ' ✅' : ''
          return { text: `${cat.emoji} ${cat.label}${checkmark}`, callback_data: `cb_c_${cat.code}_${newsId}` }
        })

        const hubKeyboard = {
          inline_keyboard: [
            [catButtons[0], catButtons[1]],
            [catButtons[2], catButtons[3]],
            [catButtons[4], catButtons[5]],
            [catButtons[6]],
            [
              { text: `🚀 Генерувати (${selectedCount}/7)`, callback_data: `cb_gen_${newsId}` },
              { text: '🔄 Скинути', callback_data: `cb_rst_${newsId}` }
            ],
            [
              { text: '🎲 Random Variants', callback_data: `new_variants_${newsId}` }
            ],
            [
              { text: '← Назад', callback_data: `back_to_variants_${newsId}` }
            ]
          ]
        }

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: truncateForTelegram(messageText, hubText),
            parse_mode: 'HTML',
            reply_markup: hubKeyboard
          })
        })

      } else if (action === 'cb_generate') {
        // Show language selection before generating from Creative Builder
        console.log('🚀 Creative Builder: generate for news:', newsId)

        const { data: newsRecord } = await supabase
          .from('news')
          .select('creative_builder_state')
          .eq('id', newsId)
          .single()

        const state = (newsRecord?.creative_builder_state || {}) as Record<string, any>

        // Count selections
        const catKeys = ['style', 'color', 'object', 'action', 'background', 'effects', 'text']
        const selectedCount = catKeys.filter(k => state[k] && state[k].label).length

        if (selectedCount === 0) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackId, text: '⚠️ Оберіть хоча б 1 елемент!', show_alert: true })
          })
          return new Response(JSON.stringify({ ok: true }))
        }

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: '🚀 Оберіть мову', show_alert: false })
        })

        const langKeyboard = {
          inline_keyboard: [
            [
              { text: '🇺🇦 UA', callback_data: `cb_lg_ua_${newsId}` },
              { text: '🇳🇴 NO', callback_data: `cb_lg_no_${newsId}` },
              { text: '🇬🇧 EN', callback_data: `cb_lg_en_${newsId}` }
            ],
            [
              { text: '← Назад до конструктора', callback_data: `cb_hub_${newsId}` }
            ]
          ]
        }

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: truncateForTelegram(messageText, `\n\n🚀 <b>Генерація зображення</b> (${selectedCount}/7 елементів)\n\n🌐 <b>Оберіть мову тексту на зображенні:</b>`),
            parse_mode: 'HTML',
            reply_markup: langKeyboard
          })
        })

      } else if (action === 'cb_lang') {
        // =================================================================
        // 🎨 Creative Builder Language → DISPATCH TO WORKER
        // =================================================================
        const selectedLang = imageLanguage || 'en'
        const langNames: Record<string, string> = { ua: 'UA', no: 'NO', en: 'EN' }
        console.log(`[async] Dispatching cb_lang (${selectedLang}) to worker for news:`, newsId)

        // Answer callback immediately
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: `🎨 Створюю промпт...`, show_alert: false })
        })

        // Show processing state
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: truncateForTelegram(messageText, `\n\n⏳ <b>Creative Builder: створюю промпт (${langNames[selectedLang] || selectedLang})...</b>`),
            parse_mode: 'HTML'
          })
        })

        // Dispatch to worker
        dispatchToWorker({
          action: 'cb_lang',
          params: { newsId, selectedLang },
          telegram: { chatId, messageId, messageText }
        })

      } else if (action === 'cb_go') {
        // =================================================================
        // 🖼️ Creative Builder Go → DISPATCH TO WORKER
        // =================================================================
        const selectedLang = imageLanguage || 'en'
        const langNames: Record<string, string> = { ua: 'UA', no: 'NO', en: 'EN' }
        console.log(`[async] Dispatching cb_go (${selectedLang}) to worker for news:`, newsId)

        // Answer callback immediately
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: `🖼️ Генерація зображення...`, show_alert: false })
        })

        // Show processing state
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: truncateForTelegram(messageText, `\n\n⏳ <b>Генерація зображення (${langNames[selectedLang] || selectedLang})...</b>\n<i>Промпт підтверджено, створюю зображення...</i>`),
            parse_mode: 'HTML'
          })
        })

        // Dispatch to worker
        dispatchToWorker({
          action: 'cb_go',
          params: { newsId, selectedLang },
          telegram: { chatId, messageId, messageText }
        })

      } else if (action === 'cb_reset') {
        // Reset all Creative Builder selections
        console.log('🔄 Creative Builder: reset for news:', newsId)

        await supabase
          .from('news')
          .update({ creative_builder_state: {} })
          .eq('id', newsId)

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: '🔄 Скинуто', show_alert: false })
        })

        // Re-render hub with empty state (simulate cb_hub)
        const { data: newsRecord } = await supabase
          .from('news')
          .select('id, original_title, rss_analysis')
          .eq('id', newsId)
          .single()

        const articleTitle = newsRecord?.original_title
          ? escapeHtml(newsRecord.original_title.substring(0, 60)) + (newsRecord.original_title.length > 60 ? '...' : '')
          : 'N/A'

        const categories = [
          { key: 'style', code: 'ST', label: 'Стиль', emoji: '🎨' },
          { key: 'color', code: 'CL', label: 'Тон', emoji: '🌈' },
          { key: 'object', code: 'OB', label: "Об'єкт", emoji: '🔮' },
          { key: 'action', code: 'AC', label: 'Дія', emoji: '💫' },
          { key: 'background', code: 'BG', label: 'Фон', emoji: '🌆' },
          { key: 'effects', code: 'FX', label: 'Ефекти', emoji: '✨' },
          { key: 'text', code: 'TX', label: 'Текст', emoji: '📝' },
        ]

        let statusLines = ''
        for (const cat of categories) {
          statusLines += `\n⬜ ${cat.label}: --`
        }

        const hubText = `\n\n🎨 <b>Creative Builder</b>\n\n📰 "${articleTitle}"\n\n<b>Ваші вибори:</b>${statusLines}`

        const catButtons = categories.map(cat => ({
          text: `${cat.emoji} ${cat.label}`,
          callback_data: `cb_c_${cat.code}_${newsId}`
        }))

        const hubKeyboard = {
          inline_keyboard: [
            [catButtons[0], catButtons[1]],
            [catButtons[2], catButtons[3]],
            [catButtons[4], catButtons[5]],
            [catButtons[6]],
            [
              { text: '🚀 Генерувати (0/7)', callback_data: `cb_gen_${newsId}` },
              { text: '🔄 Скинути', callback_data: `cb_rst_${newsId}` }
            ],
            [
              { text: '🎲 Random Variants', callback_data: `new_variants_${newsId}` }
            ],
            [
              { text: '← Назад', callback_data: `back_to_variants_${newsId}` }
            ]
          ]
        }

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: truncateForTelegram(messageText, hubText),
            parse_mode: 'HTML',
            reply_markup: hubKeyboard
          })
        })

      } else if (action === 'skip_dup') {
        // Skip as duplicate - reject with reason
        console.log('News skipped as duplicate, ID:', newsId)

        const { error: updateError } = await supabase
          .from('news')
          .update({
            pre_moderation_status: 'rejected',
            rejection_reason: 'Duplicate (moderator confirmed)'
          })
          .eq('id', newsId)

        if (updateError) {
          console.error('Failed to update news as duplicate:', updateError)
        }

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '🔁 Skipped as duplicate',
              show_alert: false
            })
          }
        )

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + '\n\n🔁 <b>SKIPPED (Duplicate)</b>',
              parse_mode: 'HTML'
            })
          }
        )

      } else if (action === 'reject') {
        console.log('News rejected by user, ID:', newsId)

        const { error: deleteError } = await supabase
          .from('news')
          .delete()
          .eq('id', newsId)

        if (deleteError) {
          console.error('Failed to delete news:', deleteError)
        }

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '❌ News rejected',
              show_alert: false
            })
          }
        )

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + '\n\n❌ <b>REJECTED</b>',
              parse_mode: 'HTML'
            })
          }
        )
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
