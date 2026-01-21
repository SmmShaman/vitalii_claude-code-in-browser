import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'berbeha@vitalii.no'

// Rate limiting map (in-memory, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW = 10 * 60 * 1000 // 10 minutes

interface ContactEmailRequest {
  name: string
  email: string
  message: string
  honeypot?: string
  timestamp?: number
}

interface ContactEmailResponse {
  success: boolean
  message: string
}

/**
 * Send contact form email via Resend API
 * Includes spam protection: honeypot, timestamp check, rate limiting
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData: ContactEmailRequest = await req.json()
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     req.headers.get('cf-connecting-ip') ||
                     'unknown'

    console.log('📧 Contact form submission from:', clientIP)

    // 1. Honeypot check - if filled, it's a bot
    if (requestData.honeypot) {
      console.log('🤖 Spam detected: honeypot filled')
      // Return success to not alert spammers
      return new Response(
        JSON.stringify({ success: true, message: 'Message sent!' } as ContactEmailResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Timestamp check - form filled too fast = bot
    if (requestData.timestamp) {
      const formDuration = Date.now() - requestData.timestamp
      if (formDuration < 3000) { // Less than 3 seconds
        console.log('🤖 Spam detected: form submitted too fast (' + formDuration + 'ms)')
        return new Response(
          JSON.stringify({ success: true, message: 'Message sent!' } as ContactEmailResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 3. Rate limiting by IP
    const now = Date.now()
    const rateData = rateLimitMap.get(clientIP)

    if (rateData && now < rateData.resetAt) {
      if (rateData.count >= RATE_LIMIT_MAX) {
        console.log('⚠️ Rate limit exceeded for:', clientIP)
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Too many requests. Please try again later.'
          } as ContactEmailResponse),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      rateData.count++
    } else {
      rateLimitMap.set(clientIP, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    }

    // 4. Validate required fields
    if (!requestData.name?.trim() || !requestData.email?.trim() || !requestData.message?.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'All fields are required.'
        } as ContactEmailResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(requestData.email)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid email address.'
        } as ContactEmailResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 5. Save to database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { error: dbError } = await supabase
      .from('contact_forms')
      .insert([{
        name: requestData.name.trim(),
        email: requestData.email.trim(),
        message: requestData.message.trim(),
        created_at: new Date().toISOString()
      }])

    if (dbError) {
      console.error('❌ Database error:', dbError)
      // Continue to send email even if DB fails
    } else {
      console.log('✅ Contact form saved to database')
    }

    // 6. Send email via Resend API
    if (!RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY not configured, skipping email send')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Message received! (Email delivery pending configuration)'
        } as ContactEmailResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .field { margin-bottom: 15px; }
    .label { font-weight: 600; color: #374151; margin-bottom: 5px; }
    .value { background: white; padding: 10px; border-radius: 4px; border: 1px solid #e5e7eb; }
    .message-value { white-space: pre-wrap; }
    .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">📬 New Contact Form Submission</h2>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">vitalii.no</p>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">👤 Name</div>
        <div class="value">${escapeHtml(requestData.name)}</div>
      </div>
      <div class="field">
        <div class="label">📧 Email</div>
        <div class="value"><a href="mailto:${escapeHtml(requestData.email)}">${escapeHtml(requestData.email)}</a></div>
      </div>
      <div class="field">
        <div class="label">💬 Message</div>
        <div class="value message-value">${escapeHtml(requestData.message)}</div>
      </div>
      <div class="footer">
        <p>Sent from contact form at ${new Date().toLocaleString('en-US', { timeZone: 'Europe/Oslo' })} (Oslo time)</p>
        <p>IP: ${clientIP}</p>
      </div>
    </div>
  </div>
</body>
</html>
`

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Vitalii.no Contact <noreply@vitalii.no>',
        to: ADMIN_EMAIL,
        reply_to: requestData.email,
        subject: `📬 New message from ${requestData.name}`,
        html: emailHtml,
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error('❌ Resend API error:', emailResponse.status, errorText)
      // Don't fail the request - message was saved to DB
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Message received! We will get back to you soon.'
        } as ContactEmailResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailResult = await emailResponse.json()
    console.log('✅ Email sent successfully:', emailResult.id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Message sent successfully! We will get back to you soon.'
      } as ContactEmailResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error processing contact form:', error)
    return new Response(
      JSON.stringify({
        success: false,
        message: 'An error occurred. Please try again later.'
      } as ContactEmailResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return text.replace(/[&<>"']/g, char => htmlEntities[char] || char)
}
