// Test YouTube OAuth credentials
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    // Read secrets from environment
    const CLIENT_ID = Deno.env.get('YOUTUBE_CLIENT_ID')
    const CLIENT_SECRET = Deno.env.get('YOUTUBE_CLIENT_SECRET')
    const REFRESH_TOKEN = Deno.env.get('YOUTUBE_REFRESH_TOKEN')

    // Check if secrets exist
    const secretsStatus = {
      YOUTUBE_CLIENT_ID: CLIENT_ID ? `✅ Exists (${CLIENT_ID.substring(0, 20)}...)` : '❌ Missing',
      YOUTUBE_CLIENT_SECRET: CLIENT_SECRET ? `✅ Exists (${CLIENT_SECRET.substring(0, 15)}...)` : '❌ Missing',
      YOUTUBE_REFRESH_TOKEN: REFRESH_TOKEN ? `✅ Exists (${REFRESH_TOKEN.substring(0, 15)}...)` : '❌ Missing',
    }

    console.log('📋 Secrets status:', secretsStatus)

    // If all secrets exist, test OAuth
    if (CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN) {
      console.log('🔐 Testing OAuth with Google...')

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: REFRESH_TOKEN,
          grant_type: 'refresh_token',
        }),
      })

      const responseText = await tokenResponse.text()
      console.log('📡 Google OAuth response status:', tokenResponse.status)
      console.log('📄 Google OAuth response:', responseText)

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
          {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      } else {
        // OAuth error
        let errorData
        try {
          errorData = JSON.parse(responseText)
        } catch {
          errorData = { raw: responseText }
        }

        return new Response(
          JSON.stringify({
            success: false,
            message: '❌ Помилка OAuth! Перевірте ключі.',
            secretsStatus,
            oauth: {
              status: 'error',
              statusCode: tokenResponse.status,
              error: errorData,
            },
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 200, // Return 200 so we see the error details
          }
        )
      }
    } else {
      // Missing secrets
      return new Response(
        JSON.stringify({
          success: false,
          message: '❌ Не всі секрети налаштовані!',
          secretsStatus,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }
  } catch (error) {
    console.error('❌ Test error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        message: '❌ Помилка тесту',
        error: error.message,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
