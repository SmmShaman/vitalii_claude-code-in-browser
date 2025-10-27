import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const update = await req.json()
    console.log('Telegram webhook received')

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

    const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_SERVICE_ROLE_KEY ?? '')

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      const callbackData = update.callback_query.data
      const callbackId = update.callback_query.id
      const messageId = update.callback_query.message.message_id
      const chatId = update.callback_query.message.chat.id
      const messageText = update.callback_query.message.text || ''

      console.log('Callback received:', callbackData)

      // Parse callback data: format is "action_newsId"
      // Example: "publish_uuid" or "reject_uuid"
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

        // Get news from database
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

        // Call process-news function
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
                newsId: news.id,
                title: news.original_title,
                content: news.original_content,
                url: news.original_url
              })
            }
          )

          const processResult = await processResponse.json()

          if (processResponse.ok) {
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
          } else {
            // Error
            await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  callback_query_id: callbackId,
                  text: `❌ Error: ${processResult.error || 'Unknown error'}`,
                  show_alert: true
                })
              }
            )
          }
        } catch (error) {
          console.error('Error calling process-news:', error)
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: `❌ Error: ${error.message}`,
                show_alert: true
              })
            }
          )
        }

      } else if (action === 'reject') {
        console.log('News rejected by user, ID:', newsId)

        // Delete news from database
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

        // Edit message
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
