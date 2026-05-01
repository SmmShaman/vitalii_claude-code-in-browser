import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const LINKEDIN_ACCESS_TOKEN = Deno.env.get('LINKEDIN_ACCESS_TOKEN')
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') || Deno.env.get('TELEGRAM_CHAT_ID')

serve(async (_req) => {
  try {
    if (!LINKEDIN_ACCESS_TOKEN) {
      await sendTelegramAlert('⚠️ LinkedIn: LINKEDIN_ACCESS_TOKEN not set in Supabase secrets!')
      return new Response(JSON.stringify({ status: 'no_token' }), { status: 200 })
    }

    const resp = await fetch('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}` },
    })

    if (resp.status === 401) {
      await sendTelegramAlert(
        '🔴 LinkedIn токен ПРОСТРОЧЕНИЙ!\n\nОновити: https://www.linkedin.com/developers/tools/oauth/token-generator\nПотім оновити секрет LINKEDIN_ACCESS_TOKEN в Supabase.'
      )
      return new Response(JSON.stringify({ status: 'expired' }), { status: 200 })
    }

    if (!resp.ok) {
      await sendTelegramAlert(`⚠️ LinkedIn token check: unexpected status ${resp.status}`)
      return new Response(JSON.stringify({ status: 'error', code: resp.status }), { status: 200 })
    }

    console.log('✅ LinkedIn token valid')
    return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
  } catch (err) {
    console.error('check-linkedin-token error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})

async function sendTelegramAlert(message: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
    console.warn('Cannot send Telegram alert: bot token or chat ID missing')
    return
  }
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_ADMIN_CHAT_ID, text: message }),
    })
  } catch (err) {
    console.error('Failed to send Telegram alert:', err)
  }
}
