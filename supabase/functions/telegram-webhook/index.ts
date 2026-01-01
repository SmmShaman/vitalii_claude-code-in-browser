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
              sourceLink: news.source_link || null // External source link
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

        // Edit message with LinkedIn buttons
        const statusLabel = publicationType === 'blog' ? 'BLOG' : 'NEWS'
        const linkedinKeyboard = {
          inline_keyboard: [
            [
              { text: '🔗 LinkedIn EN', callback_data: `linkedin_en_${newsId}` },
              { text: '🔗 LinkedIn NO', callback_data: `linkedin_no_${newsId}` },
              { text: '🔗 LinkedIn UA', callback_data: `linkedin_ua_${newsId}` }
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
              text: messageText + `\n\n✅ <b>PUBLISHED TO ${statusLabel}</b>`,
              parse_mode: 'HTML',
              reply_markup: linkedinKeyboard
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

        // 🛡️ DUPLICATE CHECK: Prevent republishing to LinkedIn
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

        // 🎬 Check if news has video - use GitHub Action for native LinkedIn video
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

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + linkedinStatusText,
              parse_mode: 'HTML',
              disable_web_page_preview: true
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
