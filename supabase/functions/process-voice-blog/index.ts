import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { HUMANIZER_ARTICLE, VOICE_JOURNALISM } from '../_shared/humanizer-prompt.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY') || ''
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const VERSION = '2026-03-26-v1-voice-blog'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/-$/, '')
    + '-' + Math.random().toString(36).slice(2, 10)
}

async function editTelegramMessage(chatId: number, messageId: number, text: string, replyMarkup?: unknown) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId, message_id: messageId, text,
      parse_mode: 'HTML', disable_web_page_preview: true,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  console.log(`${VERSION} started`)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const { rawText, chatId, messageId, blogPostId, authorId } = await req.json() as {
      rawText: string; chatId: number; messageId: number; blogPostId?: string; authorId?: string
    }

    if (!rawText || !chatId) throw new Error('rawText and chatId required')

    // Update status
    if (messageId) {
      await editTelegramMessage(chatId, messageId, '🧠 <b>Генерую блог-пост...</b>\n\nОбробляю текст AI...')
    }

    // Load AI prompt from DB
    const { data: promptData } = await supabase
      .from('ai_prompts')
      .select('prompt_text')
      .eq('prompt_type', 'voice_blog_rewrite')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    const basePrompt = promptData?.prompt_text || `Convert raw text into a polished trilingual blog post. Return JSON with en/no/ua titles, content, descriptions, tags, category.`
    const systemPrompt = `${basePrompt}\n\n${HUMANIZER_ARTICLE}\n\n${VOICE_JOURNALISM}`

    // Get Google API key
    let apiKey = GOOGLE_API_KEY
    if (!apiKey) {
      const { data } = await supabase.from('api_settings').select('key_value').eq('key_name', 'GOOGLE_API_KEY').single()
      apiKey = data?.key_value || ''
    }

    // Call Gemini to generate blog post
    console.log(`📝 Calling Gemini with ${rawText.length} chars...`)
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${systemPrompt}\n\nRAW TEXT FROM VOICE MESSAGE:\n${rawText.slice(0, 5000)}` }],
          }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 16000 },
        }),
      },
    )

    if (!geminiRes.ok) throw new Error(`Gemini ${geminiRes.status}: ${(await geminiRes.text()).slice(0, 200)}`)

    const geminiData = await geminiRes.json()
    const aiText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const cleaned = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let blogData: {
      en: { title: string; content: string; description: string }
      no: { title: string; content: string; description: string }
      ua: { title: string; content: string; description: string }
      tags: string[]; category: string
    }

    try {
      blogData = JSON.parse(cleaned)
    } catch {
      throw new Error(`Failed to parse Gemini response: ${cleaned.slice(0, 300)}`)
    }

    if (messageId) {
      await editTelegramMessage(chatId, messageId, '🖼️ <b>Генерую зображення...</b>')
    }

    // Generate image via process-image
    let imageUrl: string | null = null
    try {
      const imgRes = await fetch(`${SUPABASE_URL}/functions/v1/generate-image-prompt`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newsId: '00000000-0000-0000-0000-000000000000',
          title: blogData.en.title,
          content: blogData.en.content.slice(0, 500),
          mode: 'full',
        }),
      })
      const imgPromptData = await imgRes.json()
      const imgPrompt = imgPromptData?.prompt

      if (imgPrompt) {
        // Generate image with Gemini
        const genRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: imgPrompt }] }],
              generationConfig: { responseModalities: ['image', 'text'] },
            }),
          },
        )
        const genData = await genRes.json()
        for (const part of genData?.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            // Upload to Supabase Storage
            const imgBytes = Uint8Array.from(atob(part.inlineData.data), c => c.charCodeAt(0))
            const path = `blog-covers/voice-blog-${Date.now()}.png`
            const { error: uploadErr } = await supabase.storage.from('news-images').upload(path, imgBytes, {
              contentType: 'image/png', upsert: true,
            })
            if (!uploadErr) {
              imageUrl = `${SUPABASE_URL}/storage/v1/object/public/news-images/${path}`
            }
            break
          }
        }
      }
    } catch (e) {
      console.error('Image generation failed (non-critical):', e)
    }

    // Calculate reading time
    const wordCount = blogData.en.content.split(/\s+/).length
    const readingTime = Math.max(1, Math.ceil(wordCount / 200))

    // Insert or update blog post
    const postData = {
      title_en: blogData.en.title,
      title_no: blogData.no.title,
      title_ua: blogData.ua.title,
      content_en: blogData.en.content,
      content_no: blogData.no.content,
      content_ua: blogData.ua.content,
      description_en: blogData.en.description,
      description_no: blogData.no.description,
      description_ua: blogData.ua.description,
      slug_en: generateSlug(blogData.en.title),
      slug_no: generateSlug(blogData.no.title),
      slug_ua: generateSlug(blogData.ua.title),
      tags: blogData.tags || [],
      category: blogData.category || 'Tech',
      reading_time: readingTime,
      image_url: imageUrl,
      source_type: 'voice',
      original_voice_text: rawText,
      is_published: false,
      draft_chat_id: chatId,
      draft_message_id: messageId,
      ...(authorId ? { author_id: authorId } : {}),
    }

    let postId: string
    if (blogPostId) {
      // Update existing draft
      await supabase.from('blog_posts').update(postData).eq('id', blogPostId)
      postId = blogPostId
    } else {
      // Insert new draft
      const { data: inserted, error: insertErr } = await supabase
        .from('blog_posts').insert(postData).select('id').single()
      if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`)
      postId = inserted.id
    }

    console.log(`✅ Blog draft ${postId}: ${blogData.en.title}`)

    // Send preview to Telegram
    const preview = `📝 <b>Блог-пост готовий!</b>\n\n` +
      `📌 <b>${blogData.ua.title}</b>\n\n` +
      `${blogData.ua.description}\n\n` +
      `🏷 ${(blogData.tags || []).join(', ')}\n` +
      `📖 ~${readingTime} хв читання\n` +
      `🖼️ ${imageUrl ? 'Зображення ✅' : 'Без зображення'}\n\n` +
      `🌐 EN: ${blogData.en.title}\n` +
      `🌐 NO: ${blogData.no.title}`

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Опублікувати', callback_data: `vb_pub_${postId}` },
          { text: '✏️ Редагувати', callback_data: `vb_edit_${postId}` },
        ],
        [
          { text: '🔄 Регенерувати', callback_data: `vb_regen_${postId}` },
          { text: '❌ Скасувати', callback_data: `vb_cancel_${postId}` },
        ],
      ],
    }

    if (messageId) {
      await editTelegramMessage(chatId, messageId, preview, keyboard)
    }

    return new Response(JSON.stringify({ success: true, blogPostId: postId, title: blogData.en.title }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('❌ Voice blog failed:', err)
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
