import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')!

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', {
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }
  })

  const { image_base64, caption, images } = await req.json()

  // Single photo
  if (image_base64) {
    const bytes = Uint8Array.from(atob(image_base64), c => c.charCodeAt(0))
    const form = new FormData()
    form.append('chat_id', CHAT_ID)
    form.append('photo', new Blob([bytes], { type: 'image/jpeg' }), 'photo.jpg')
    if (caption) form.append('caption', caption)
    form.append('parse_mode', 'HTML')

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, { method: 'POST', body: form })
    const data = await res.json()
    return new Response(JSON.stringify({ ok: data.ok }), { headers: { 'Content-Type': 'application/json' } })
  }

  // Multiple photos as media group
  if (images && Array.isArray(images)) {
    const media: Array<{ type: string; media: string; caption?: string }> = []
    const form = new FormData()
    form.append('chat_id', CHAT_ID)

    for (let i = 0; i < images.length; i++) {
      const bytes = Uint8Array.from(atob(images[i].base64), c => c.charCodeAt(0))
      const attachName = `photo${i}`
      form.append(attachName, new Blob([bytes], { type: 'image/jpeg' }), `${attachName}.jpg`)
      media.push({
        type: 'photo',
        media: `attach://${attachName}`,
        ...(i === 0 && images[i].caption ? { caption: images[i].caption, parse_mode: 'HTML' } as any : {}),
      })
    }
    form.append('media', JSON.stringify(media))

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`, { method: 'POST', body: form })
    const data = await res.json()
    return new Response(JSON.stringify({ ok: data.ok }), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'image_base64 or images[] required' }), { status: 400 })
})
