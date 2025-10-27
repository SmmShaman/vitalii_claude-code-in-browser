import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

      // URL оригінального поста
      const originalUrl = post.chat.username
        ? `https://t.me/${post.chat.username}/${post.message_id}`
        : null

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

      const parts = callbackData.split('_')
      const action = parts[0]
      const newsId = parts[1]

      if (!newsId) {
        console.error('No news ID in callback data')
        return new Response(JSON.stringify({ ok: false }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      if (action === 'publish') {
        console.log('Publishing news with ID:', newsId)

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

        // Update news to published
        const { error: updateError } = await supabase
          .from('news')
          .update({
            is_published: true,
            published_at: new Date().toISOString()
          })
          .eq('id', newsId)

        if (updateError) {
          console.error('Failed to update news:', updateError)
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: `❌ Error: ${updateError.message}`,
                show_alert: true
              })
            }
          )
          return new Response(JSON.stringify({ ok: false }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // Success
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '✅ News published successfully!',
              show_alert: false
            })
          }
        )

        // Edit message
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + '\n\n✅ <b>PUBLISHED</b>',
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
