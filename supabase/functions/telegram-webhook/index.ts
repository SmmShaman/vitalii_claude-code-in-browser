import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const update = await req.json()
    console.log('Telegram webhook received:', JSON.stringify(update, null, 2))

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      const callbackData = update.callback_query.data
      const callbackId = update.callback_query.id
      const messageId = update.callback_query.message.message_id
      const chatId = update.callback_query.message.chat.id

      console.log('Callback received:', callbackData)

      // Parse callback data: format is "action_title_url"
      // Example: "publish_AI Revolution_https://example.com/article"
      const parts = callbackData.split('_')
      const action = parts[0]

      if (action === 'publish') {
        // Extract title and URL from callback data
        // The format is: publish_base64EncodedTitle_base64EncodedUrl
        const encodedTitle = parts[1] || ''
        const encodedUrl = parts[2] || ''

        let title = ''
        let url = ''

        try {
          title = atob(encodedTitle)
          url = atob(encodedUrl)
        } catch (e) {
          console.error('Failed to decode callback data:', e)
        }

        console.log('Publishing news:', { title, url })

        // Get the full message text to extract content
        const messageText = update.callback_query.message.text || ''

        // Extract content from message (everything after "Content:" or "Description:")
        const contentMatch = messageText.match(/(?:Content|Description):\s*(.+?)(?:\n\n|$)/s)
        const content = contentMatch ? contentMatch[1].trim() : ''

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
                title,
                content,
                url
              })
            }
          )

          const processResult = await processResponse.json()

          if (processResponse.ok) {
            // Success - answer callback and edit message
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

            // Edit message to show it's been published
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
            // Error - show error message
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
        // Just acknowledge - do nothing
        console.log('News rejected by user')

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

        // Edit message to show it's been rejected
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
