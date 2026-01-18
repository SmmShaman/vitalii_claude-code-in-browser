import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { triggerVideoProcessing, isGitHubActionsEnabled, triggerLinkedInVideo } from '../_shared/github-actions.ts'

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
      // 📸 Check if this is a photo reply for custom image upload
      // =================================================================
      if (message.reply_to_message && message.photo && message.photo.length > 0) {
        const replyText = message.reply_to_message.text || ''
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
              })

            if (uploadError) {
              throw new Error(`Upload failed: ${uploadError.message}`)
            }

            const { data: urlData } = supabase.storage
              .from('news-images')
              .getPublicUrl(fileName)

            const publicUrl = urlData.publicUrl

            // Update news record with custom image
            const { error: updateError } = await supabase
              .from('news')
              .update({
                processed_image_url: publicUrl,
                image_processed_at: new Date().toISOString()
              })
              .eq('id', newsId)

            if (updateError) {
              throw new Error(`Database update failed: ${updateError.message}`)
            }

            // Update original message with success status and STEP 2 buttons (NO separate message!)
            const publishKeyboard = {
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

            // Remove entire "Очікую фото" block (including technical info) and add success status
            const cleanedText = replyText
              .replace(/\n\n📸 <b>Очікую фото\.\.\.<\/b>[\s\S]*?newsId:[a-f0-9-]+<\/code>/i, '')
              .trim()

            await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  message_id: message.reply_to_message.message_id,
                  text: cleanedText + '\n\n✅ <b>Зображення прикріплено</b>\n📝 <i>Оберіть де опублікувати...</i>',
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
      const messageText = update.callback_query.message.text || ''

      console.log('Callback received:', callbackData)

      // Parse callback data: publish_news_<id>, publish_blog_<id>, or reject_<id>
      let action: string
      let publicationType: string | null = null
      let newsId: string

      let linkedinLanguage: string | null = null

      // Track platform and language for social posting
      let socialPlatform: string | null = null
      let socialLanguage: string | null = null

      if (callbackData.startsWith('publish_news_')) {
        action = 'publish'
        publicationType = 'news'
        newsId = callbackData.replace('publish_news_', '')
      } else if (callbackData.startsWith('publish_blog_')) {
        action = 'publish'
        publicationType = 'blog'
        newsId = callbackData.replace('publish_blog_', '')
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
      // Skip remaining social platforms
      } else if (callbackData.startsWith('skip_social_')) {
        action = 'skip_social'
        newsId = callbackData.replace('skip_social_', '')
      } else if (callbackData.startsWith('reject_')) {
        action = 'reject'
        newsId = callbackData.replace('reject_', '')
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

        const { data: news, error: fetchError } = await supabase
          .from('news')
          .select('*')
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

        // 🎬 TRIGGER VIDEO PROCESSING VIA GITHUB ACTIONS
        // If news has telegram_embed video, trigger background processing to YouTube
        if (news.video_type === 'telegram_embed' && news.video_url && isGitHubActionsEnabled()) {
          console.log(`🎬 Triggering GitHub Action for video processing: ${newsId}`)
          const triggerResult = await triggerVideoProcessing({
            newsId: newsId,
            mode: 'single'
          })
          if (triggerResult.success) {
            console.log(`✅ GitHub Action triggered - video will be processed in background`)
          } else {
            console.log(`⚠️ GitHub Action trigger failed: ${triggerResult.error} - video will remain as Telegram embed`)
          }
        }

        // Choose appropriate processing function based on publication type
        const processingEndpoint = publicationType === 'blog'
          ? 'process-blog-post'
          : 'process-news'

        console.log(`Calling ${processingEndpoint} for AI rewriting...`)

        const processResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/${processingEndpoint}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              newsId: newsId,
              title: news.original_title || '',
              content: news.original_content || '',
              url: news.original_url || '',
              imageUrl: news.processed_image_url || news.image_url || null, // Prioritize custom uploaded image
              videoUrl: news.video_url || null,
              videoType: news.video_type || null,
              sourceLink: news.source_link || null, // First external source link (backwards compatibility)
              sourceLinks: news.source_links || [] // ALL external source links
            })
          }
        )

        if (!processResponse.ok) {
          const errorText = await processResponse.text()
          console.error('Failed to process:', errorText)
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: `❌ AI processing error`,
                show_alert: true
              })
            }
          )
          return new Response(JSON.stringify({ ok: false }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        const successMessage = publicationType === 'blog'
          ? '✅ Published to blog!'
          : '✅ Published to news!'

        console.log(`✅ ${publicationType} processed successfully with AI`)

        // Success
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: successMessage,
              show_alert: false
            })
          }
        )

        // Edit message with social media buttons
        const statusLabel = publicationType === 'blog' ? 'BLOG' : 'NEWS'
        const socialKeyboard = {
          inline_keyboard: [
            // Batch posting - all socials in one language
            [
              { text: '🌐 Все EN', callback_data: `all_en_${newsId}` },
              { text: '🌐 Все NO', callback_data: `all_no_${newsId}` },
              { text: '🌐 Все UA', callback_data: `all_ua_${newsId}` }
            ],
            // Quick combo
            [
              { text: '🔗+📘 LinkedIn+FB EN', callback_data: `combo_li_fb_en_${newsId}` }
            ],
            // LinkedIn individual
            [
              { text: '🔗 LinkedIn EN', callback_data: `linkedin_en_${newsId}` },
              { text: '🔗 LinkedIn NO', callback_data: `linkedin_no_${newsId}` },
              { text: '🔗 LinkedIn UA', callback_data: `linkedin_ua_${newsId}` }
            ],
            // Facebook individual
            [
              { text: '📘 Facebook EN', callback_data: `facebook_en_${newsId}` },
              { text: '📘 Facebook NO', callback_data: `facebook_no_${newsId}` },
              { text: '📘 Facebook UA', callback_data: `facebook_ua_${newsId}` }
            ],
            // Instagram individual
            [
              { text: '📸 Instagram EN', callback_data: `instagram_en_${newsId}` },
              { text: '📸 Instagram NO', callback_data: `instagram_no_${newsId}` },
              { text: '📸 Instagram UA', callback_data: `instagram_ua_${newsId}` }
            ],
            // Twitter individual
            [
              { text: '🐦 Twitter EN', callback_data: `twitter_en_${newsId}` },
              { text: '🐦 Twitter NO', callback_data: `twitter_no_${newsId}` },
              { text: '🐦 Twitter UA', callback_data: `twitter_ua_${newsId}` }
            ],
            // TikTok and Skip
            [
              { text: '🎵 TikTok', callback_data: `tiktok_${newsId}` },
              { text: '⏭️ Skip', callback_data: `skip_social_${newsId}` }
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
              text: messageText + `\n\n✅ <b>PUBLISHED TO ${statusLabel}</b>\n📱 <i>Оберіть соцмережі для публікації:</i>`,
              parse_mode: 'HTML',
              reply_markup: socialKeyboard
            })
          }
        )

      } else if (action === 'linkedin' && linkedinLanguage) {
        // =================================================================
        // 🔗 LinkedIn Posting Handler
        // =================================================================
        console.log(`Posting to LinkedIn (${linkedinLanguage}) with ID:`, newsId)

        // First check if news is already published (has rewritten content)
        const { data: news, error: fetchError } = await supabase
          .from('news')
          .select('*')
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

        // Check if there's a blog post created from this news item
        const { data: blogPost } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('source_news_id', newsId)
          .single()

        // Determine content type and ID to use
        let contentType: 'news' | 'blog' = 'news'
        let contentId = newsId
        let titleField = `title_${linkedinLanguage}`
        let checkRecord = news

        if (blogPost) {
          console.log('📝 Found blog post for this news, using blog content for LinkedIn')
          contentType = 'blog'
          contentId = blogPost.id
          checkRecord = blogPost
        }

        // Check if content has translations
        if (!checkRecord[titleField]) {
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: `❌ Content not published yet. Publish to News/Blog first!`,
                show_alert: true
              })
            }
          )
          return new Response(JSON.stringify({ ok: false }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // 🎬 Check if news has video FIRST - video posts bypass duplicate check
        // This allows re-uploading with native video even if image post was made before
        const hasVideo = news.original_video_url && news.original_video_url.includes('t.me')

        if (hasVideo && isGitHubActionsEnabled()) {
          console.log(`🎬 News has video - triggering LinkedIn video GitHub Action`)
          console.log(`   Original video URL: ${news.original_video_url}`)

          const triggerResult = await triggerLinkedInVideo({
            newsId: newsId,
            language: linkedinLanguage as 'en' | 'no' | 'ua'
          })

          if (triggerResult.success) {
            // Answer callback with processing message
            await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  callback_query_id: callbackId,
                  text: '🎬 Відео завантажується в LinkedIn... Зачекайте 1-2 хв',
                  show_alert: true
                })
              }
            )

            // Update message to show processing status
            const langLabel = linkedinLanguage.toUpperCase()
            await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  message_id: messageId,
                  text: messageText + `\n\n⏳ <b>Відео завантажується в LinkedIn (${langLabel})...</b>\n🎬 Це може зайняти 1-2 хвилини`,
                  parse_mode: 'HTML'
                })
              }
            )

            return new Response(JSON.stringify({ ok: true, videoProcessing: true }), {
              headers: { 'Content-Type': 'application/json' }
            })
          } else {
            console.error('❌ Failed to trigger LinkedIn video Action:', triggerResult.error)
            // Fall through to regular text+image posting
          }
        }

        // 🛡️ DUPLICATE CHECK: Prevent republishing to LinkedIn (only for non-video posts)
        // Video posts bypass this check above
        if (checkRecord.linkedin_post_id) {
          const existingLang = (checkRecord.linkedin_language || 'unknown').toUpperCase()
          console.log(`⚠️ ${contentType} ${contentId} already posted to LinkedIn (${existingLang}), preventing duplicate`)

          // Answer callback silently (required by Telegram API)
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId
              })
            }
          )

          // Build LinkedIn post URL
          const linkedinPostUrl = `https://www.linkedin.com/feed/update/${checkRecord.linkedin_post_id}`

          // Update original message to show duplicate status (NO separate message!)
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: messageText + `\n\n⚠️ <b>Вже опубліковано в LinkedIn (${existingLang})!</b>\n🔗 <a href="${linkedinPostUrl}">Переглянути пост</a>`,
                parse_mode: 'HTML',
                disable_web_page_preview: true
              })
            }
          )

          return new Response(JSON.stringify({ ok: true, duplicate: true }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // Post to LinkedIn with correct content type and ID (text + image only)
        console.log(`Calling post-to-linkedin for ${contentType} ${contentId}...`)

        const linkedinRequestBody: any = {
          language: linkedinLanguage,
          contentType: contentType
        }

        // Use the correct ID field based on content type
        if (contentType === 'blog') {
          linkedinRequestBody.blogPostId = contentId
        } else {
          linkedinRequestBody.newsId = contentId
        }

        const linkedinResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/post-to-linkedin`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(linkedinRequestBody)
          }
        )

        const linkedinResult = await linkedinResponse.json()

        if (!linkedinResponse.ok || !linkedinResult.success) {
          console.error('Failed to post to LinkedIn:', linkedinResult)
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: `❌ LinkedIn error: ${linkedinResult.error || 'Unknown error'}`,
                show_alert: true
              })
            }
          )
          return new Response(JSON.stringify({ ok: false }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        console.log('✅ Posted to LinkedIn successfully')

        // Get the title in the appropriate language for the success message
        // Note: titleField is already declared above on line 496
        const newsTitle = news[titleField] || news.title_en || news.original_title || 'Untitled'
        const shortTitle = newsTitle.length > 50 ? newsTitle.substring(0, 47) + '...' : newsTitle

        // Build LinkedIn post URL (if we have post ID)
        const linkedinPostUrl = linkedinResult.postId
          ? `https://www.linkedin.com/feed/update/${linkedinResult.postId}`
          : null

        // Answer callback silently (required by Telegram API)
        const langLabel = linkedinLanguage.toUpperCase()
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId
            })
          }
        )

        // Build article URL on website
        const slugField = `slug_${linkedinLanguage}`
        const articleSlug = checkRecord[slugField] || checkRecord.slug_en || newsId.substring(0, 8)
        const articlePath = contentType === 'blog' ? 'blog' : 'news'
        const articleUrl = `https://vitalii.no/${articlePath}/${articleSlug}`

        // Update original message to show LinkedIn status (NO separate message!)
        let linkedinStatusText = `\n\n✅ <b>Опубліковано в LinkedIn (${langLabel})!</b>\n`
        linkedinStatusText += `📰 «${shortTitle}»\n`
        linkedinStatusText += `📝 <a href="${articleUrl}">Читати статтю</a>\n`
        if (linkedinPostUrl) {
          linkedinStatusText += `🔗 <a href="${linkedinPostUrl}">Переглянути пост</a>`
        }

        // Build remaining social media buttons
        const allLanguages = ['en', 'no', 'ua']
        const remainingLanguages = allLanguages.filter(lang => lang !== linkedinLanguage)

        // Build button rows
        const buttonRows = []

        // Remaining LinkedIn languages
        if (remainingLanguages.length > 0) {
          buttonRows.push(remainingLanguages.map(lang => ({
            text: `🔗 LinkedIn ${lang.toUpperCase()}`,
            callback_data: `linkedin_${lang}_${newsId}`
          })))
        }

        // Facebook buttons
        buttonRows.push([
          { text: '📘 Facebook EN', callback_data: `facebook_en_${newsId}` },
          { text: '📘 Facebook NO', callback_data: `facebook_no_${newsId}` },
          { text: '📘 Facebook UA', callback_data: `facebook_ua_${newsId}` }
        ])

        // Instagram buttons
        buttonRows.push([
          { text: '📸 Instagram EN', callback_data: `instagram_en_${newsId}` },
          { text: '📸 Instagram NO', callback_data: `instagram_no_${newsId}` },
          { text: '📸 Instagram UA', callback_data: `instagram_ua_${newsId}` }
        ])

        // Twitter buttons
        buttonRows.push([
          { text: '🐦 Twitter EN', callback_data: `twitter_en_${newsId}` },
          { text: '🐦 Twitter NO', callback_data: `twitter_no_${newsId}` },
          { text: '🐦 Twitter UA', callback_data: `twitter_ua_${newsId}` }
        ])

        // TikTok and Skip buttons
        buttonRows.push([
          { text: '🎵 TikTok', callback_data: `tiktok_${newsId}` },
          { text: '⏭️ Skip', callback_data: `skip_social_${newsId}` }
        ])

        const editPayload: any = {
          chat_id: chatId,
          message_id: messageId,
          text: messageText + linkedinStatusText,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard: buttonRows
          }
        }

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editPayload)
          }
        )

      } else if (action === 'social_post' && socialPlatform && socialLanguage) {
        // =================================================================
        // 📱 Facebook/Instagram Posting Handler
        // =================================================================
        console.log(`Posting to ${socialPlatform} (${socialLanguage}) with ID:`, newsId)

        // Fetch news data
        const { data: news, error: fetchError } = await supabase
          .from('news')
          .select('*')
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

        // Check if content has translations
        const titleField = `title_${socialLanguage}`
        if (!news[titleField]) {
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

        // Check if has blog post
        const { data: blogPost } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('source_news_id', newsId)
          .single()

        const contentType = blogPost ? 'blog' : 'news'
        const contentId = blogPost ? blogPost.id : newsId

        // Determine which endpoint to call
        const endpoint = socialPlatform === 'facebook' ? 'post-to-facebook' : 'post-to-instagram'

        const requestBody: any = {
          language: socialLanguage,
          contentType: contentType
        }

        if (contentType === 'blog') {
          requestBody.blogPostId = contentId
        } else {
          requestBody.newsId = contentId
        }

        // Call the posting function
        const postResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/${endpoint}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          }
        )

        const postResult = await postResponse.json()

        if (!postResponse.ok || !postResult.success) {
          // Check if already posted
          if (postResult.alreadyPosted) {
            await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  callback_query_id: callbackId,
                  text: `⚠️ Already posted to ${socialPlatform}!`,
                  show_alert: true
                })
              }
            )
          } else {
            await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  callback_query_id: callbackId,
                  text: `❌ ${socialPlatform} error: ${postResult.error || 'Unknown error'}`,
                  show_alert: true
                })
              }
            )
          }
          return new Response(JSON.stringify({ ok: false }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        console.log(`✅ Posted to ${socialPlatform} successfully`)

        // Answer callback
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId
            })
          }
        )

        // Get emoji for platform
        const platformEmoji = socialPlatform === 'facebook' ? '📘' : '📸'
        const platformName = socialPlatform.charAt(0).toUpperCase() + socialPlatform.slice(1)
        const langLabel = socialLanguage.toUpperCase()

        // Build status text
        let statusText = `\n\n${platformEmoji} <b>Опубліковано в ${platformName} (${langLabel})!</b>`
        if (postResult.postUrl) {
          statusText += `\n🔗 <a href="${postResult.postUrl}">Переглянути пост</a>`
        }

        // Build remaining social buttons (for other platforms/languages)
        const remainingButtons = []

        // Add remaining language buttons for current platform
        const allLanguages = ['en', 'no', 'ua']
        const remainingLangs = allLanguages.filter(l => l !== socialLanguage)
        for (const lang of remainingLangs) {
          remainingButtons.push({
            text: `${platformEmoji} ${platformName} ${lang.toUpperCase()}`,
            callback_data: `${socialPlatform}_${lang}_${newsId}`
          })
        }

        // Add other platform buttons
        if (socialPlatform === 'facebook') {
          remainingButtons.push({
            text: '📸 Instagram EN',
            callback_data: `instagram_en_${newsId}`
          })
        } else {
          remainingButtons.push({
            text: '📘 Facebook EN',
            callback_data: `facebook_en_${newsId}`
          })
        }

        remainingButtons.push({
          text: '🎵 TikTok',
          callback_data: `tiktok_${newsId}`
        })

        remainingButtons.push({
          text: '⏭️ Skip',
          callback_data: `skip_social_${newsId}`
        })

        // Build keyboard with 2 buttons per row
        const rows = []
        for (let i = 0; i < remainingButtons.length; i += 2) {
          rows.push(remainingButtons.slice(i, i + 2))
        }

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + statusText,
              parse_mode: 'HTML',
              disable_web_page_preview: true,
              reply_markup: rows.length > 0 ? { inline_keyboard: rows } : undefined
            })
          }
        )

      } else if (action === 'tiktok') {
        // =================================================================
        // 🎵 TikTok Content Generation (Manual Workflow)
        // =================================================================
        console.log('Generating TikTok content for news:', newsId)

        // Fetch news data
        const { data: news, error: fetchError } = await supabase
          .from('news')
          .select('*')
          .eq('id', newsId)
          .single()

        if (fetchError || !news) {
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

        // Check if content is published
        if (!news.title_en) {
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: '❌ Content not published yet. Publish to News first!',
                show_alert: true
              })
            }
          )
          return new Response(JSON.stringify({ ok: false }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // Check if has blog post
        const { data: blogPost } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('source_news_id', newsId)
          .single()

        const contentType = blogPost ? 'blog' : 'news'
        const contentId = blogPost ? blogPost.id : newsId

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '🎵 Generating TikTok content...',
              show_alert: false
            })
          }
        )

        // Call TikTok content generator
        const tiktokResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/generate-tiktok-content`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              newsId: contentType === 'news' ? contentId : undefined,
              blogPostId: contentType === 'blog' ? contentId : undefined,
              language: 'en',
              contentType: contentType,
              chatId: chatId.toString()
            })
          }
        )

        const tiktokResult = await tiktokResponse.json()

        if (!tiktokResponse.ok || !tiktokResult.success) {
          console.error('TikTok content generation failed:', tiktokResult)
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `❌ TikTok content generation failed: ${tiktokResult.error || 'Unknown error'}`
              })
            }
          )
        }

        // Update original message
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + '\n\n🎵 <b>TikTok content sent below!</b>',
              parse_mode: 'HTML'
            })
          }
        )

      } else if (action === 'twitter' && socialPlatform === 'twitter' && socialLanguage) {
        // =================================================================
        // 🐦 Twitter Share Intent Handler
        // =================================================================
        console.log(`Generating Twitter Share Intent (${socialLanguage}) for news:`, newsId)

        // Fetch news data
        const { data: news, error: fetchError } = await supabase
          .from('news')
          .select('title_en, title_no, title_ua, slug_en, slug_no, slug_ua, description_en, description_no, description_ua')
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

        // Check if content is published
        const titleField = `title_${socialLanguage}` as keyof typeof news
        const slugField = `slug_${socialLanguage}` as keyof typeof news

        if (!news[titleField]) {
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: '❌ Content not published yet. Publish to News first!',
                show_alert: true
              })
            }
          )
          return new Response(JSON.stringify({ ok: false }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // Get title and slug in the appropriate language
        const title = news[titleField] as string
        const slug = (news[slugField] || news.slug_en || newsId.substring(0, 8)) as string
        const articleUrl = `https://vitalii.no/news/${slug}`

        // Twitter has 280 character limit - account for URL and spacing
        // t.co wraps URLs to 23 chars, so max text = 280 - 23 - 2 (space + space) = 255 chars
        const maxTextLength = 255
        const tweetText = title.length > maxTextLength
          ? title.substring(0, maxTextLength - 3) + '...'
          : title

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
        // 🌐 Post to ALL socials in one language
        // =================================================================
        console.log(`Posting to ALL socials (${socialLanguage}) for news:`, newsId)

        const langLabel = socialLanguage.toUpperCase()

        // Answer callback immediately
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: `🌐 Публікуємо у всі соцмережі (${langLabel})...`,
              show_alert: false
            })
          }
        )

        // Fetch news data
        const { data: news, error: fetchError } = await supabase
          .from('news')
          .select('*')
          .eq('id', newsId)
          .single()

        if (fetchError || !news) {
          console.error('Failed to fetch news:', fetchError)
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: '❌ Error: News not found'
              })
            }
          )
          return new Response(JSON.stringify({ ok: false }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // Check if content has translations
        const titleField = `title_${socialLanguage}`
        if (!news[titleField]) {
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `❌ Content not published yet (no ${langLabel} translation). Publish to News first!`
              })
            }
          )
          return new Response(JSON.stringify({ ok: false }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // Check if has blog post
        const { data: blogPost } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('source_news_id', newsId)
          .single()

        const contentType = blogPost ? 'blog' : 'news'
        const contentId = blogPost ? blogPost.id : newsId

        // Track results
        const results: { platform: string; success: boolean; error?: string; url?: string }[] = []

        // 1. Post to LinkedIn
        console.log(`📤 Posting to LinkedIn (${socialLanguage})...`)
        try {
          const linkedinRequestBody: any = {
            language: socialLanguage,
            contentType: contentType
          }
          if (contentType === 'blog') {
            linkedinRequestBody.blogPostId = contentId
          } else {
            linkedinRequestBody.newsId = contentId
          }

          const linkedinResponse = await fetch(
            `${SUPABASE_URL}/functions/v1/post-to-linkedin`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(linkedinRequestBody)
            }
          )
          const linkedinResult = await linkedinResponse.json()

          if (linkedinResponse.ok && linkedinResult.success) {
            const postUrl = linkedinResult.postId
              ? `https://www.linkedin.com/feed/update/${linkedinResult.postId}`
              : undefined
            results.push({ platform: 'LinkedIn', success: true, url: postUrl })
          } else {
            results.push({ platform: 'LinkedIn', success: false, error: linkedinResult.error || 'Unknown error' })
          }
        } catch (e) {
          results.push({ platform: 'LinkedIn', success: false, error: 'Request failed' })
        }

        // 2. Post to Facebook
        console.log(`📤 Posting to Facebook (${socialLanguage})...`)
        try {
          const fbRequestBody: any = {
            language: socialLanguage,
            contentType: contentType
          }
          if (contentType === 'blog') {
            fbRequestBody.blogPostId = contentId
          } else {
            fbRequestBody.newsId = contentId
          }

          const fbResponse = await fetch(
            `${SUPABASE_URL}/functions/v1/post-to-facebook`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(fbRequestBody)
            }
          )
          const fbResult = await fbResponse.json()

          if (fbResponse.ok && fbResult.success) {
            results.push({ platform: 'Facebook', success: true, url: fbResult.postUrl })
          } else {
            results.push({ platform: 'Facebook', success: false, error: fbResult.error || 'Unknown error' })
          }
        } catch (e) {
          results.push({ platform: 'Facebook', success: false, error: 'Request failed' })
        }

        // 3. Post to Instagram
        console.log(`📤 Posting to Instagram (${socialLanguage})...`)
        try {
          const igRequestBody: any = {
            language: socialLanguage,
            contentType: contentType
          }
          if (contentType === 'blog') {
            igRequestBody.blogPostId = contentId
          } else {
            igRequestBody.newsId = contentId
          }

          const igResponse = await fetch(
            `${SUPABASE_URL}/functions/v1/post-to-instagram`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(igRequestBody)
            }
          )
          const igResult = await igResponse.json()

          if (igResponse.ok && igResult.success) {
            results.push({ platform: 'Instagram', success: true, url: igResult.postUrl })
          } else {
            results.push({ platform: 'Instagram', success: false, error: igResult.error || 'Unknown error' })
          }
        } catch (e) {
          results.push({ platform: 'Instagram', success: false, error: 'Request failed' })
        }

        // 4. Generate Twitter Share Intent
        console.log(`📤 Generating Twitter link (${socialLanguage})...`)
        const slugField = `slug_${socialLanguage}`
        const title = news[titleField] as string
        const slug = news[slugField] || news.slug_en || newsId.substring(0, 8)
        const articleUrl = `https://vitalii.no/news/${slug}`
        const maxTextLength = 255
        const tweetText = title.length > maxTextLength
          ? title.substring(0, maxTextLength - 3) + '...'
          : title
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(articleUrl)}`
        results.push({ platform: 'Twitter', success: true, url: twitterIntentUrl })

        // Build results message
        let resultsText = `\n\n🌐 <b>Результати публікації (${langLabel}):</b>\n`
        for (const r of results) {
          if (r.success) {
            if (r.platform === 'Twitter') {
              resultsText += `✅ ${r.platform}: <a href="${r.url}">Натисніть для публікації</a>\n`
            } else if (r.url) {
              resultsText += `✅ ${r.platform}: <a href="${r.url}">Переглянути</a>\n`
            } else {
              resultsText += `✅ ${r.platform}: Опубліковано\n`
            }
          } else {
            resultsText += `❌ ${r.platform}: ${r.error}\n`
          }
        }

        // Update message with results
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + resultsText,
              parse_mode: 'HTML',
              disable_web_page_preview: true
            })
          }
        )

      } else if (action === 'combo_li_fb_en') {
        // =================================================================
        // 🔗📘 Combo: LinkedIn EN + Facebook EN
        // =================================================================
        console.log('Posting combo LinkedIn EN + Facebook EN for news:', newsId)

        // Answer callback immediately
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '🔗📘 Публікуємо LinkedIn + Facebook EN...',
              show_alert: false
            })
          }
        )

        // Fetch news data
        const { data: news, error: fetchError } = await supabase
          .from('news')
          .select('*')
          .eq('id', newsId)
          .single()

        if (fetchError || !news) {
          console.error('Failed to fetch news:', fetchError)
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: '❌ Error: News not found'
              })
            }
          )
          return new Response(JSON.stringify({ ok: false }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // Check if content has English translation
        if (!news.title_en) {
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: '❌ Content not published yet (no EN translation). Publish to News first!'
              })
            }
          )
          return new Response(JSON.stringify({ ok: false }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // Check if has blog post
        const { data: blogPost } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('source_news_id', newsId)
          .single()

        const contentType = blogPost ? 'blog' : 'news'
        const contentId = blogPost ? blogPost.id : newsId

        // Track results
        const results: { platform: string; success: boolean; error?: string; url?: string }[] = []

        // 1. Post to LinkedIn EN
        console.log('📤 Posting to LinkedIn EN...')
        try {
          const linkedinRequestBody: any = {
            language: 'en',
            contentType: contentType
          }
          if (contentType === 'blog') {
            linkedinRequestBody.blogPostId = contentId
          } else {
            linkedinRequestBody.newsId = contentId
          }

          const linkedinResponse = await fetch(
            `${SUPABASE_URL}/functions/v1/post-to-linkedin`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(linkedinRequestBody)
            }
          )
          const linkedinResult = await linkedinResponse.json()

          if (linkedinResponse.ok && linkedinResult.success) {
            const postUrl = linkedinResult.postId
              ? `https://www.linkedin.com/feed/update/${linkedinResult.postId}`
              : undefined
            results.push({ platform: 'LinkedIn EN', success: true, url: postUrl })
          } else {
            results.push({ platform: 'LinkedIn EN', success: false, error: linkedinResult.error || 'Unknown error' })
          }
        } catch (e) {
          results.push({ platform: 'LinkedIn EN', success: false, error: 'Request failed' })
        }

        // 2. Post to Facebook EN
        console.log('📤 Posting to Facebook EN...')
        try {
          const fbRequestBody: any = {
            language: 'en',
            contentType: contentType
          }
          if (contentType === 'blog') {
            fbRequestBody.blogPostId = contentId
          } else {
            fbRequestBody.newsId = contentId
          }

          const fbResponse = await fetch(
            `${SUPABASE_URL}/functions/v1/post-to-facebook`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(fbRequestBody)
            }
          )
          const fbResult = await fbResponse.json()

          if (fbResponse.ok && fbResult.success) {
            results.push({ platform: 'Facebook EN', success: true, url: fbResult.postUrl })
          } else {
            results.push({ platform: 'Facebook EN', success: false, error: fbResult.error || 'Unknown error' })
          }
        } catch (e) {
          results.push({ platform: 'Facebook EN', success: false, error: 'Request failed' })
        }

        // Build results message
        let resultsText = '\n\n🔗📘 <b>LinkedIn + Facebook EN:</b>\n'
        for (const r of results) {
          if (r.success) {
            if (r.url) {
              resultsText += `✅ ${r.platform}: <a href="${r.url}">Переглянути</a>\n`
            } else {
              resultsText += `✅ ${r.platform}: Опубліковано\n`
            }
          } else {
            resultsText += `❌ ${r.platform}: ${r.error}\n`
          }
        }

        // Build remaining buttons
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

        // Update message with results
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + resultsText,
              parse_mode: 'HTML',
              disable_web_page_preview: true,
              reply_markup: {
                inline_keyboard: remainingButtons
              }
            })
          }
        )

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
