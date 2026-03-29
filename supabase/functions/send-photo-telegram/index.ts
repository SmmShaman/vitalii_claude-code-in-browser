import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
const VERSION_STAMP = '2026-03-29-force-redeploy'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')!

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', {
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }
  })

  const body = await req.json()
  const { image_base64, caption, images, text, reply_markup } = body

  // Single photo
  if (image_base64) {
    const bytes = Uint8Array.from(atob(image_base64), c => c.charCodeAt(0))
    const form = new FormData()
    form.append('chat_id', CHAT_ID)
    form.append('photo', new Blob([bytes], { type: 'image/jpeg' }), 'photo.jpg')
    if (caption) form.append('caption', caption)
    form.append('parse_mode', 'HTML')
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, { method: 'POST', body: form })
    return new Response(JSON.stringify(await res.json()), { headers: { 'Content-Type': 'application/json' } })
  }

  // Multiple photos as media group
  if (images && Array.isArray(images)) {
    const media: Array<Record<string, unknown>> = []
    const form = new FormData()
    form.append('chat_id', CHAT_ID)
    for (let i = 0; i < images.length; i++) {
      const bytes = Uint8Array.from(atob(images[i].base64), c => c.charCodeAt(0))
      const name = `photo${i}`
      form.append(name, new Blob([bytes], { type: 'image/jpeg' }), `${name}.jpg`)
      const m: Record<string, unknown> = { type: 'photo', media: `attach://${name}` }
      if (i === 0 && images[i].caption) { m.caption = images[i].caption; m.parse_mode = 'HTML' }
      media.push(m)
    }
    form.append('media', JSON.stringify(media))
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`, { method: 'POST', body: form })
    return new Response(JSON.stringify(await res.json()), { headers: { 'Content-Type': 'application/json' } })
  }

  // Text message with optional inline keyboard
  if (text) {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML', reply_markup }),
    })
    return new Response(JSON.stringify(await res.json()), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'image_base64, images[], or text required' }), { status: 400 })
})
