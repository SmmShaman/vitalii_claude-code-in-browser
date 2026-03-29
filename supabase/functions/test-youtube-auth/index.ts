// Test YouTube OAuth credentials + OAuth callback handler
const VERSION_STAMP = '2026-03-29-force-redeploy'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    const CLIENT_ID = Deno.env.get('YOUTUBE_CLIENT_ID')
    const CLIENT_SECRET = Deno.env.get('YOUTUBE_CLIENT_SECRET')
    const REFRESH_TOKEN = Deno.env.get('YOUTUBE_REFRESH_TOKEN')

    const url = new URL(req.url)
    const code = url.searchParams.get('code')

    // External URL (Supabase edge functions have internal origin without /functions/v1/)
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://uchmopqiylywnemvjttl.supabase.co'
    const EXTERNAL_REDIRECT_URI = `${SUPABASE_URL}/functions/v1/test-youtube-auth`

    // ── OAuth callback: exchange code for refresh token ──
    if (code && CLIENT_ID && CLIENT_SECRET) {
      const REDIRECT_URI = EXTERNAL_REDIRECT_URI

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      })

      const data = await tokenResponse.json()

      if (data.refresh_token) {
        return new Response(
          `<html><body style="font-family:monospace;padding:40px;background:#1a1a2e;color:#e0e0e0;">
            <h1 style="color:#4ecca3;">✅ OAuth Success!</h1>
            <p><b>Refresh Token:</b></p>
            <textarea style="width:100%;height:100px;background:#16213e;color:#4ecca3;border:1px solid #4ecca3;padding:10px;font-size:14px;" readonly onclick="this.select()">${data.refresh_token}</textarea>
            <p style="color:#e74c3c;"><b>⚠️ Скопіюй цей токен і надішли мені в чат. Після цього закрий цю сторінку.</b></p>
            <hr style="border-color:#333;">
            <details><summary>Full response</summary><pre>${JSON.stringify(data, null, 2)}</pre></details>
          </body></html>`,
          { headers: { 'Content-Type': 'text/html' }, status: 200 }
        )
      } else {
        return new Response(
          `<html><body style="font-family:monospace;padding:40px;background:#1a1a2e;color:#e74c3c;">
            <h1>❌ OAuth Error</h1>
            <pre>${JSON.stringify(data, null, 2)}</pre>
          </body></html>`,
          { headers: { 'Content-Type': 'text/html' }, status: 200 }
        )
      }
    }

    // ── Generate auth URL ──
    if (url.searchParams.get('action') === 'auth_url' && CLIENT_ID) {
      const REDIRECT_URI = EXTERNAL_REDIRECT_URI
      const loginHint = url.searchParams.get('login_hint') || ''
      const SCOPE = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly'
      let authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPE)}&access_type=offline&prompt=consent`
      if (loginHint) authUrl += `&login_hint=${encodeURIComponent(loginHint)}`

      return new Response(JSON.stringify({ auth_url: authUrl }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ── Test existing refresh token ──
    const secretsStatus = {
      YOUTUBE_CLIENT_ID: CLIENT_ID ? `✅ Exists (${CLIENT_ID.substring(0, 20)}...)` : '❌ Missing',
      YOUTUBE_CLIENT_SECRET: CLIENT_SECRET ? `✅ Exists (${CLIENT_SECRET.substring(0, 15)}...)` : '❌ Missing',
      YOUTUBE_REFRESH_TOKEN: REFRESH_TOKEN ? `✅ Exists (${REFRESH_TOKEN.substring(0, 15)}...)` : '❌ Missing',
    }

    if (CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN) {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: REFRESH_TOKEN,
          grant_type: 'refresh_token',
        }),
      })

      const responseText = await tokenResponse.text()

      if (tokenResponse.ok) {
        const data = JSON.parse(responseText)
        return new Response(
          JSON.stringify({
            success: true,
            message: '✅ YouTube OAuth працює правильно!',
            secretsStatus,
            oauth: {
              status: 'success',
              access_token_preview: data.access_token.substring(0, 20) + '...',
              expires_in: data.expires_in,
            },
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 200 }
        )
      } else {
        let errorData
        try { errorData = JSON.parse(responseText) } catch { errorData = { raw: responseText } }
        return new Response(
          JSON.stringify({
            success: false,
            message: '❌ Помилка OAuth! Перевірте ключі.',
            secretsStatus,
            oauth: { status: 'error', statusCode: tokenResponse.status, error: errorData },
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 200 }
        )
      }
    } else {
      return new Response(
        JSON.stringify({ success: false, message: '❌ Не всі секрети налаштовані!', secretsStatus }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      )
    }
  } catch (error) {
    console.error('❌ Test error:', error)
    return new Response(
      JSON.stringify({ success: false, message: '❌ Помилка тесту', error: error.message }),
      { headers: { 'Content-Type': 'text/html' }, status: 500 }
    )
  }
})
