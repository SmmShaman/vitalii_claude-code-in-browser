import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
const VERSION_STAMP = '2026-04-06-text-blog-social-fix'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { triggerVideoProcessing, isGitHubActionsEnabled, triggerLinkedInVideo, triggerFacebookVideo, triggerInstagramVideo } from '../_shared/github-actions.ts'
import { escapeHtml } from '../_shared/social-media-helpers.ts'
import { formatCompactVariants, buildManualKeyboard } from '../_shared/telegram-format-helpers.ts'
import { classifyContentWeight, loadScheduleConfig, computeScheduledTime, formatScheduledTime, countInFlight } from '../_shared/schedule-helpers.ts'
import { dispatchToWorker } from '../_shared/webhook-dispatch.ts'
import { HUMANIZER_SOCIAL, VOICE_SOCIAL } from '../_shared/humanizer-prompt.ts'

/**
 * Extract external source links from text content
 * Returns the first non-Telegram URL found in the text
 */
function extractSourceLink(text: string): string | null {
  if (!text) return null

  // Regular expression to match URLs
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi
  const matches = text.match(urlRegex)

  if (!matches) return null

  // Filter out Telegram URLs and return the first external source
  for (const url of matches) {
    // Skip Telegram URLs
    if (url.includes('t.me/') || url.includes('telegram.me/') || url.includes('telegram.org/')) {
      continue
    }
    // Skip common social media share URLs
    if (url.includes('twitter.com/intent/') || url.includes('facebook.com/sharer/')) {
      continue
    }
    // Clean up URL (remove trailing punctuation)
    const cleanUrl = url.replace(/[.,;:!?)]+$/, '')
    return cleanUrl
  }

  return null
}

serve(async (req) => {
  try {
    // Verify Telegram webhook secret token to prevent unauthorized requests
    const WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')
    if (WEBHOOK_SECRET) {
      const secretHeader = req.headers.get('X-Telegram-Bot-Api-Secret-Token')
      if (secretHeader !== WEBHOOK_SECRET) {
        console.warn('⚠️ Unauthorized webhook request - invalid secret token')
        return new Response('Unauthorized', { status: 401 })
      }
    }

    const update = await req.json()
    console.log('Telegram webhook received:', JSON.stringify(update, null, 2))

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

    const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_SERVICE_ROLE_KEY ?? '')

    // Idempotency: prevent duplicate processing if Telegram resends the same update
    const updateId = update.update_id?.toString()
    if (updateId) {
      const { error: dedupError } = await supabase
        .from('processed_telegram_messages')
        .insert({ message_id: updateId })
      if (dedupError?.code === '23505') {
        console.log(`⏭ Duplicate update ${updateId} — already processed, skipping`)
        return new Response('OK', { status: 200 })
      }
    }

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

      // URL оригінального поста в Telegram
      const originalUrl = post.chat.username
        ? `https://t.me/${post.chat.username}/${post.message_id}`
        : null

      // Extract external source link from post content
      const sourceLink = extractSourceLink(text)
      console.log('📎 Extracted source link:', sourceLink)

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
              sourceLink: sourceLink, // External source link from text
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
      const msgText = message.text || ''

      // ── /blog command: voice-to-blog ──
      if (msgText === '/blog' || msgText.startsWith('/blog ')) {
        const directText = msgText.replace('/blog', '').trim()
        if (directText) {
          // Direct text after /blog — process via existing blog pipeline
          const statusMsg = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: '🧠 <b>Генерую блог-пост...</b>', parse_mode: 'HTML' }),
          }).then(r => r.json())
          const statusMsgId = statusMsg?.result?.message_id
          if (!statusMsgId) console.warn('⚠️ Failed to get status message ID from Telegram')

          // /blog direct text: same pipeline as voice — await blog creation, then image + social
          try {
            const blogRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-blog-post`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ newsId: '00000000-0000-0000-0000-000000000000', title: directText.slice(0, 100), content: directText, sourceType: 'voice' }),
            })
            const blogData = await blogRes.json()

            if (blogData.success && blogData.blogPostId) {
              const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
              const baseUrl = Deno.env.get('SUPABASE_URL')!
              const { data: post } = await supa.from('blog_posts').select('title_ua, title_en, title_no, slug_en, tags, reading_time, image_url, content_en').eq('id', blogData.blogPostId).single()

              const blogUrl = `https://vitalii.no/blog/${post?.slug_en || ''}`
              const bpId = blogData.blogPostId

              await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, message_id: statusMsgId, text: '✅ <b>Блог опубліковано!</b>\n\n🖼️ Генерую зображення + публікую в соцмережі...', parse_mode: 'HTML' }),
              })

              const getKey = async (name: string) => {
                const { data: r } = await supa.from('api_settings').select('key_value').eq('key_name', name).single()
                return r?.key_value || Deno.env.get(name) || ''
              }

              // Image generation via Gemini
              const imagePromise = (async () => {
                try {
                  const gKey = await getKey('GOOGLE_API_KEY')
                  if (!gKey) return null
                  console.log('🖼️ Generating blog cover via Gemini (/blog direct)...')
                  const imgRes = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${gKey}`,
                    { method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        contents: [{ parts: [{ text: `Professional blog cover image. Topic: ${post?.title_en || ''}. ${(post?.content_en || '').slice(0, 200)}. Dark background, modern tech aesthetic, no text, no logos. 16:9 landscape.` }] }],
                        generationConfig: { responseModalities: ['image', 'text'] },
                      }),
                    },
                  )
                  if (!imgRes.ok) { console.error('Gemini image:', imgRes.status); return null }
                  const imgData = await imgRes.json()
                  for (const part of imgData?.candidates?.[0]?.content?.parts || []) {
                    if (part.inlineData) {
                      const b64 = part.inlineData.data as string
                      const raw = atob(b64)
                      const arr = new Uint8Array(raw.length)
                      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
                      const path = `blog-covers/direct-${Date.now()}.png`
                      const { error: upErr } = await supa.storage.from('news-images').upload(path, arr, { contentType: 'image/png', upsert: true })
                      if (!upErr) {
                        const url = `${baseUrl}/storage/v1/object/public/news-images/${path}`
                        await supa.from('blog_posts').update({ image_url: url, processed_image_url: url }).eq('id', bpId)
                        console.log('🖼️ Image saved:', url)
                        return url
                      } else { console.error('Upload err:', upErr) }
                    }
                  }
                  return null
                } catch (e) { console.error('Image failed:', e); return null }
              })()

              // Social posting (LinkedIn + Facebook)
              const socialPromise = (async () => {
                const results: string[] = []
                const blogTitle = post?.title_en || ''
                const blogUrlSocial = `https://vitalii.no/blog/${post?.slug_en || ''}`
                const postContent = (post?.content_en || '').slice(0, 500)

                let liText = blogTitle + '\n\n' + (post?.tags || []).map((t: string) => '#' + t.replace(/\s/g, '')).join(' ')
                let fbText = blogTitle
                try {
                  const gk = await getKey('GOOGLE_API_KEY')
                  if (gk) {
                    const sp = 'Generate social media posts for this blog. Author is a full-stack developer.\n' +
                      'TITLE: ' + blogTitle + '\nCONTENT: ' + postContent + '\nURL: ' + blogUrlSocial + '\n' +
                      'TAGS: ' + (post?.tags || []).join(', ') + '\n\n' +
                      'LINKEDIN (1200-1800 chars): Hook under 210 chars, storytelling, NO links in body, 3-5 hashtags, CTA question.\n' +
                      'FACEBOOK (under 280 chars): Short hook, 1-2 hashtags, conversational.\n\n' +
                      HUMANIZER_SOCIAL + '\n\n' + VOICE_SOCIAL + '\n\n' +
                      'Return ONLY JSON: {"linkedin_post":"...","facebook_post":"..."}'
                    const gr = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + gk, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ contents: [{ parts: [{ text: sp }] }], generationConfig: { temperature: 0.6, maxOutputTokens: 4000 } }),
                    })
                    if (gr.ok) {
                      const gt = ((await gr.json())?.candidates?.[0]?.content?.parts?.[0]?.text || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
                      try { const p = JSON.parse(gt); if (p.linkedin_post) liText = p.linkedin_post; if (p.facebook_post) fbText = p.facebook_post } catch { /* keep defaults */ }
                    }
                  }
                } catch { /* keep defaults */ }

                // LinkedIn
                try {
                  const liToken = Deno.env.get('LINKEDIN_ACCESS_TOKEN') || await getKey('LINKEDIN_ACCESS_TOKEN')
                  const liUrn = Deno.env.get('LINKEDIN_PERSON_URN') || await getKey('LINKEDIN_PERSON_URN')
                  if (liToken && liUrn) {
                    let shareContent: any = { shareCommentary: { text: liText }, shareMediaCategory: 'NONE' }
                    const imgWait = await imagePromise
                    if (imgWait) {
                      try {
                        const regRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
                          method: 'POST', headers: { 'Authorization': 'Bearer ' + liToken, 'Content-Type': 'application/json' },
                          body: JSON.stringify({ registerUploadRequest: { recipes: ['urn:li:digitalmediaRecipe:feedshare-image'], owner: liUrn, serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }] } }),
                        })
                        if (regRes.ok) {
                          const rd = await regRes.json()
                          const upUrl = rd.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl
                          const asset = rd.value?.asset
                          if (upUrl && asset) {
                            const ib = await fetch(imgWait).then(r => r.arrayBuffer())
                            await fetch(upUrl, { method: 'PUT', headers: { 'Authorization': 'Bearer ' + liToken }, body: ib })
                            shareContent = { shareCommentary: { text: liText }, shareMediaCategory: 'IMAGE', media: [{ status: 'READY', media: asset }] }
                          }
                        }
                      } catch (ie) { console.error('LI img:', ie) }
                    }
                    const liRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
                      method: 'POST',
                      headers: { 'Authorization': 'Bearer ' + liToken, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
                      body: JSON.stringify({ author: liUrn, lifecycleState: 'PUBLISHED', specificContent: { 'com.linkedin.ugc.ShareContent': shareContent }, visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' } }),
                    })
                    if (liRes.ok) {
                      const su = liRes.headers.get('x-restli-id') || ''
                      results.push('✅ <a href="https://www.linkedin.com/feed/update/' + su + '">LinkedIn</a>')
                    } else { results.push('❌ LinkedIn: ' + liRes.status) }
                  } else { results.push('⏭️ LinkedIn: no credentials') }
                } catch (e: unknown) { results.push('❌ LinkedIn: ' + (e instanceof Error ? e.message.slice(0, 40) : 'error')) }

                // Facebook
                try {
                  const fbToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN') || await getKey('FACEBOOK_PAGE_ACCESS_TOKEN')
                  const fbPage = Deno.env.get('FACEBOOK_PAGE_ID') || await getKey('FACEBOOK_PAGE_ID')
                  if (fbToken && fbPage) {
                    const fbRes = await fetch('https://graph.facebook.com/v18.0/' + fbPage + '/feed', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ message: fbText, link: blogUrlSocial, access_token: fbToken }),
                    })
                    if (fbRes.ok) {
                      const fd = await fbRes.json()
                      results.push('✅ <a href="https://facebook.com/' + fd.id + '">Facebook</a>')
                    } else { results.push('❌ Facebook: ' + fbRes.status) }
                  } else { results.push('⏭️ Facebook: no credentials') }
                } catch (e: unknown) { results.push('❌ Facebook: ' + (e instanceof Error ? e.message.slice(0, 40) : 'error')) }

                return results
              })()

              const [imageUrl, socialResults] = await Promise.all([imagePromise, socialPromise])

              const preview = `✅ <b>Блог-пост опубліковано!</b>\n\n` +
                `📌 <b>${post?.title_ua || ''}</b>\n\n` +
                `🏷 ${(post?.tags || []).join(', ')}\n` +
                `📖 ~${post?.reading_time || 1} хв\n` +
                `🖼️ ${imageUrl ? 'Зображення ✅' : 'Без зображення'}\n` +
                `🌐 EN: ${post?.title_en || ''}\n` +
                `🌐 NO: ${post?.title_no || ''}\n\n` +
                `📢 Соцмережі:\n${socialResults.join('\n')}\n\n` +
                `🔗 ${blogUrl}`

              await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, message_id: statusMsgId, text: preview, parse_mode: 'HTML', disable_web_page_preview: false }),
              })
            } else {
              await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, message_id: statusMsgId, text: `❌ ${blogData.error || 'unknown'}` }),
              })
            }
          } catch (e) { console.error('blog dispatch failed:', e) }

          return new Response('OK')
        }

        // No text — set waiting state with TTL timestamp and ask for voice/text
        const supabaseForState = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
        await supabaseForState.from('api_settings').upsert({
          key_name: `blog_waiting_${chatId}`,
          key_value: new Date().toISOString(),
          description: 'Temporary: chat waiting for voice blog input (expires 30min)',
          is_active: true,
        }, { onConflict: 'key_name' })

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '🎙️ <b>Створення блог-посту</b>\n\nНадішліть голосове повідомлення або текст.\n\n<i>Просто запишіть голосове — /blog не потрібно повторювати.</i>',
            parse_mode: 'HTML',
          }),
        })
        return new Response('OK')
      }

      // ── /video command: custom video generation ──
      if (msgText === '/video' || msgText.startsWith('/video ')) {
        const directText = msgText.replace('/video', '').trim()
        if (directText) {
          // Direct text after /video — analyze prompt immediately
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/custom-video-bot?action=analyze_prompt`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: directText, chatId: chatId }),
          }).catch(err => console.error('custom-video-bot dispatch failed:', err))
          return new Response('OK')
        }

        // No text — set waiting state
        const supabaseForState = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
        await supabaseForState.from('api_settings').upsert({
          key_name: `video_waiting_${chatId}`,
          key_value: new Date().toISOString(),
          description: 'Temporary: chat waiting for video prompt input (expires 30min)',
          is_active: true,
        }, { onConflict: 'key_name' })

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '🎬 <b>Створення відео</b>\n\nОпишіть тему відео текстом або голосовим повідомленням.\n\nПриклади:\n• "Зроби відео про AI автоматизацію контенту"\n• "Video about my social media integration features"\n• "Lag en video om Supabase-prosjektene mine"',
            parse_mode: 'HTML',
          }),
        })
        return new Response('OK')
      }

      // ── Voice message: check video_waiting first, then blog pipeline ──
      if (message.voice) {
        // Check if video_waiting state is active
        const supabaseCheck = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
        const { data: videoWait } = await supabaseCheck.from('api_settings').select('key_value').eq('key_name', `video_waiting_${chatId}`).maybeSingle()
        const videoWaitValid = videoWait?.key_value && (() => {
          const createdAt = new Date(videoWait.key_value).getTime()
          return !isNaN(createdAt) && (Date.now() - createdAt) < 30 * 60 * 1000
        })()

        if (videoWaitValid) {
          // Voice for video — transcribe then analyze
          await supabaseCheck.from('api_settings').delete().eq('key_name', `video_waiting_${chatId}`)
          console.log(`🎬 Voice video: ${message.voice.duration}s, file_id: ${message.voice.file_id}`)

          // Show status
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: '🔄 <b>Транскрибую голосове повідомлення для відео...</b>', parse_mode: 'HTML' }),
          })

          try {
            // Transcribe voice
            const txRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/transcribe-voice`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ voiceFileId: message.voice.file_id }),
            })

            console.log(`🎬 transcribe-voice response status: ${txRes.status}`)
            const txText = await txRes.text()
            console.log(`🎬 transcribe-voice response: ${txText.slice(0, 300)}`)

            let txData: any
            try { txData = JSON.parse(txText) } catch { txData = {} }

            if (txData.success && txData.text) {
              console.log(`🎬 Raw transcription: "${txData.text.slice(0, 200)}..."`)

              // Send raw transcription for reference
              await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: `📝 <b>Транскрипція:</b>\n<i>${txData.text.slice(0, 500)}</i>\n\n🧠 Уточнюю намір...`, parse_mode: 'HTML' }),
              })

              // Stage 1: Extract real intent from messy voice transcription (same as blog pipeline)
              const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY') || ''
              let cleanedPrompt = txData.text
              if (GOOGLE_API_KEY) {
                try {
                  const intentRes = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GOOGLE_API_KEY}`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        systemInstruction: { parts: [{ text: `You are a voice transcription interpreter. The user dictated a video creation request via voice message.
The transcription may contain:
- Filler words ("ну", "тобто", "як-то", "ага", "так")
- Repetitions and self-corrections
- Unclear sentence boundaries
- Mixed languages (Ukrainian/Russian/English)

Your task: Extract the REAL INTENT of what the user wants as a VIDEO topic.
Return a clean, clear description of what video the user wants to create.
Keep ALL specific details: names, URLs, project names, features mentioned.
Write in the SAME language as the user spoke.
Return ONLY the cleaned request, nothing else.` }] },
                        contents: [{ role: 'user', parts: [{ text: `Raw voice transcription:\n"${txData.text}"\n\nWhat does the user actually want? Extract the video creation request:` }] }],
                        generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
                      }),
                    }
                  )
                  if (intentRes.ok) {
                    const intentData = await intentRes.json()
                    const extracted = (intentData.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('').trim()
                    if (extracted && extracted.length > 10) {
                      console.log(`🎬 Cleaned intent: "${extracted.slice(0, 200)}"`)
                      cleanedPrompt = extracted
                    }
                  }
                } catch (e: any) {
                  console.warn(`🎬 Intent extraction failed (using raw): ${e.message}`)
                }
              }

              // Dispatch cleaned prompt to custom-video-bot
              fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/custom-video-bot?action=analyze_prompt`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: cleanedPrompt, chatId: chatId }),
              }).catch(err => console.error('custom-video-bot voice dispatch failed:', err))
            } else {
              const errDetail = txData.error || txData.message || `status=${txRes.status}`
              console.error(`🎬 ❌ Transcription failed: ${errDetail}`)
              await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: `❌ Не вдалося транскрибувати: ${errDetail}\n\n💡 Спробуйте надіслати текстом замість голосу.`, parse_mode: 'HTML' }),
              })
            }
          } catch (txErr: any) {
            console.error(`🎬 ❌ Transcription exception: ${txErr.message}`)
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: `❌ Помилка транскрипції: ${txErr.message}\n\n💡 Спробуйте текстом.`, parse_mode: 'HTML' }),
            })
          }
          return new Response('OK')
        }

        // Clear blog waiting state if exists
        await supabaseCheck.from('api_settings').delete().eq('key_name', `blog_waiting_${chatId}`)

        console.log(`🎙️ Voice blog: ${message.voice.duration}s`)
        {
        const statusMsg = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: '🔄 <b>Транскрибую голосове повідомлення...</b>', parse_mode: 'HTML' }),
        }).then(r => r.json())
        const statusMsgId = statusMsg?.result?.message_id
        if (!statusMsgId) console.warn('⚠️ Failed to get status message ID from Telegram')

        const txRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/transcribe-voice`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ voiceFileId: message.voice.file_id }),
        })
        const txData = await txRes.json()

        if (!txData.success || !txData.text) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: statusMsgId, text: `❌ Не вдалось транскрибувати: ${txData.error || 'unknown'}` }),
          })
          return new Response('OK')
        }

        // Update status
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, message_id: statusMsgId, text: '🧠 <b>Генерую блог-пост...</b>', parse_mode: 'HTML' }),
        })

        // Send to existing process-blog-post with sourceType=voice
        const blogRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-blog-post`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newsId: '00000000-0000-0000-0000-000000000000',
            title: txData.text.slice(0, 100),
            content: txData.text,
            sourceType: 'voice',
          }),
        })
        const blogData = await blogRes.json()

        if (blogData.success && blogData.blogPostId) {
          const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
          const srvKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
          const baseUrl = Deno.env.get('SUPABASE_URL')!
          const { data: post } = await supa.from('blog_posts').select('title_ua, title_en, title_no, slug_en, tags, reading_time, image_url, content_en').eq('id', blogData.blogPostId).single()

          const blogUrl = `https://vitalii.no/blog/${post?.slug_en || ''}`
          const bpId = blogData.blogPostId

          // Update status: publishing + generating image
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: statusMsgId, text: '✅ <b>Блог опубліковано!</b>\n\n🖼️ Генерую зображення + публікую в соцмережі...', parse_mode: 'HTML' }),
          })

          // ── PARALLEL: image (Gemini direct) + social (direct API) ──
          const getKey = async (name: string) => {
            const { data: r } = await supa.from('api_settings').select('key_value').eq('key_name', name).single()
            return r?.key_value || Deno.env.get(name) || ''
          }

          const imagePromise = (async () => {
            try {
              const gKey = await getKey('GOOGLE_API_KEY')
              if (!gKey) return null
              console.log('🖼️ Generating blog cover via Gemini...')
              const imgRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${gKey}`,
                { method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: `Professional blog cover image. Topic: ${post?.title_en || ''}. ${(post?.content_en || '').slice(0, 200)}. Dark background, modern tech aesthetic, no text, no logos. 16:9 landscape.` }] }],
                    generationConfig: { responseModalities: ['image', 'text'] },
                  }),
                },
              )
              if (!imgRes.ok) { console.error('Gemini image:', imgRes.status); return null }
              const imgData = await imgRes.json()
              for (const part of imgData?.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                  // Chunk base64 decode to avoid stack overflow
                  const b64 = part.inlineData.data as string
                  const raw = atob(b64)
                  const arr = new Uint8Array(raw.length)
                  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
                  const path = `blog-covers/voice-${Date.now()}.png`
                  const { error: upErr } = await supa.storage.from('news-images').upload(path, arr, { contentType: 'image/png', upsert: true })
                  if (!upErr) {
                    const url = `${baseUrl}/storage/v1/object/public/news-images/${path}`
                    await supa.from('blog_posts').update({ image_url: url, processed_image_url: url }).eq('id', bpId)
                    console.log('🖼️ Image saved:', url)
                    return url
                  } else { console.error('Upload err:', upErr) }
                }
              }
              return null
            } catch (e) { console.error('Image failed:', e); return null }
          })()

          const socialPromise = (async () => {
            const results: string[] = []
            const blogTitle = post?.title_en || ''
            const blogUrlSocial = `https://vitalii.no/blog/${post?.slug_en || ''}`
            const postContent = (post?.content_en || '').slice(0, 500)

            // Generate AI social posts via Gemini
            let liText = blogTitle + '\n\n' + (post?.tags || []).map((t: string) => '#' + t.replace(/\s/g, '')).join(' ')
            let fbText = blogTitle
            try {
              const gk = await getKey('GOOGLE_API_KEY')
              if (gk) {
                const sp = 'Generate social media posts for this blog. Author is a full-stack developer.\n' +
                  'TITLE: ' + blogTitle + '\nCONTENT: ' + postContent + '\nURL: ' + blogUrlSocial + '\n' +
                  'TAGS: ' + (post?.tags || []).join(', ') + '\n\n' +
                  'LINKEDIN (1200-1800 chars): Hook under 210 chars, storytelling, NO links in body, 3-5 hashtags, CTA question.\n' +
                  'FACEBOOK (under 280 chars): Short hook, 1-2 hashtags, conversational.\n\n' +
                  HUMANIZER_SOCIAL + '\n\n' + VOICE_SOCIAL + '\n\n' +
                  'Return ONLY JSON: {"linkedin_post":"...","facebook_post":"..."}'
                const gr = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + gk, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ contents: [{ parts: [{ text: sp }] }], generationConfig: { temperature: 0.6, maxOutputTokens: 4000 } }),
                })
                if (gr.ok) {
                  const gt = ((await gr.json())?.candidates?.[0]?.content?.parts?.[0]?.text || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
                  try { const p = JSON.parse(gt); if (p.linkedin_post) liText = p.linkedin_post; if (p.facebook_post) fbText = p.facebook_post } catch { /* keep defaults */ }
                }
              }
            } catch { /* keep defaults */ }

            // LinkedIn — with image if available
            try {
              const liToken = Deno.env.get('LINKEDIN_ACCESS_TOKEN') || await getKey('LINKEDIN_ACCESS_TOKEN')
              const liUrn = Deno.env.get('LINKEDIN_PERSON_URN') || await getKey('LINKEDIN_PERSON_URN')
              if (liToken && liUrn) {
                // deno-lint-ignore no-explicit-any
                let shareContent: any = { shareCommentary: { text: liText }, shareMediaCategory: 'NONE' }
                // Try to upload image to LinkedIn
                const imgWait = await imagePromise
                if (imgWait) {
                  try {
                    const regRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
                      method: 'POST', headers: { 'Authorization': 'Bearer ' + liToken, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ registerUploadRequest: { recipes: ['urn:li:digitalmediaRecipe:feedshare-image'], owner: liUrn, serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }] } }),
                    })
                    if (regRes.ok) {
                      const rd = await regRes.json()
                      const upUrl = rd.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl
                      const asset = rd.value?.asset
                      if (upUrl && asset) {
                        const ib = await fetch(imgWait).then(r => r.arrayBuffer())
                        await fetch(upUrl, { method: 'PUT', headers: { 'Authorization': 'Bearer ' + liToken }, body: ib })
                        shareContent = { shareCommentary: { text: liText }, shareMediaCategory: 'IMAGE', media: [{ status: 'READY', media: asset }] }
                      }
                    }
                  } catch (ie) { console.error('LI img:', ie) }
                }
                const liRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
                  method: 'POST',
                  headers: { 'Authorization': 'Bearer ' + liToken, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
                  body: JSON.stringify({ author: liUrn, lifecycleState: 'PUBLISHED', specificContent: { 'com.linkedin.ugc.ShareContent': shareContent }, visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' } }),
                })
                if (liRes.ok) {
                  const su = liRes.headers.get('x-restli-id') || ''
                  results.push('✅ <a href="https://www.linkedin.com/feed/update/' + su + '">LinkedIn</a>')
                } else { results.push('❌ LinkedIn: ' + liRes.status) }
              } else { results.push('⏭️ LinkedIn: no credentials') }
            } catch (e: unknown) { results.push('❌ LinkedIn: ' + (e instanceof Error ? e.message.slice(0, 40) : 'error')) }

            // Facebook
            try {
              const fbToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN') || await getKey('FACEBOOK_PAGE_ACCESS_TOKEN')
              const fbPage = Deno.env.get('FACEBOOK_PAGE_ID') || await getKey('FACEBOOK_PAGE_ID')
              if (fbToken && fbPage) {
                const fbRes = await fetch('https://graph.facebook.com/v18.0/' + fbPage + '/feed', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ message: fbText, link: blogUrlSocial, access_token: fbToken }),
                })
                if (fbRes.ok) {
                  const fd = await fbRes.json()
                  results.push('✅ <a href="https://facebook.com/' + fd.id + '">Facebook</a>')
                } else { results.push('❌ Facebook: ' + fbRes.status) }
              } else { results.push('⏭️ Facebook: no credentials') }
            } catch (e: unknown) { results.push('❌ Facebook: ' + (e instanceof Error ? e.message.slice(0, 40) : 'error')) }

            return results
          })()

          // Wait for both
          const [imageUrl, socialResults] = await Promise.all([imagePromise, socialPromise])

          // Final Telegram message
          const preview = `✅ <b>Блог-пост опубліковано!</b>\n\n` +
            `📌 <b>${post?.title_ua || ''}</b>\n\n` +
            `🏷 ${(post?.tags || []).join(', ')}\n` +
            `📖 ~${post?.reading_time || 1} хв\n` +
            `🖼️ ${imageUrl ? 'Зображення ✅' : 'Без зображення'}\n` +
            `🌐 EN: ${post?.title_en || ''}\n` +
            `🌐 NO: ${post?.title_no || ''}\n\n` +
            `📢 Соцмережі:\n${socialResults.join('\n')}\n\n` +
            `🔗 ${blogUrl}`

          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: statusMsgId, text: preview, parse_mode: 'HTML', disable_web_page_preview: false }),
          })
        } else {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: statusMsgId, text: `❌ Помилка: ${blogData.error || 'unknown'}` }),
          })
        }

        return new Response('OK')
      } // end blog voice handler
      } // end if voice message

      // ── Text message after /video or /blog (waiting state) ──
      if (msgText && !msgText.startsWith('/') && !message.forward_from_chat) {
        const supabaseCheck = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

        // Check video_waiting first
        const { data: videoWaitText } = await supabaseCheck.from('api_settings').select('key_value').eq('key_name', `video_waiting_${chatId}`).maybeSingle()
        const videoWaitTextValid = videoWaitText?.key_value && (() => {
          const createdAt = new Date(videoWaitText.key_value).getTime()
          return !isNaN(createdAt) && (Date.now() - createdAt) < 30 * 60 * 1000
        })()
        if (videoWaitTextValid) {
          await supabaseCheck.from('api_settings').delete().eq('key_name', `video_waiting_${chatId}`)
          console.log(`🎬 Text video via /video waiting state: ${msgText.length} chars`)
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/custom-video-bot?action=analyze_prompt`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: msgText, chatId: chatId }),
          }).catch(err => console.error('custom-video-bot text dispatch failed:', err))
          return new Response('OK')
        }

        const { data: waitState } = await supabaseCheck.from('api_settings').select('key_value').eq('key_name', `blog_waiting_${chatId}`).maybeSingle()
        const waitingIsValid = waitState?.key_value && (() => {
          // TTL check: waiting state expires after 30 minutes
          const createdAt = new Date(waitState.key_value).getTime()
          return !isNaN(createdAt) && (Date.now() - createdAt) < 30 * 60 * 1000
        })()
        if (waitingIsValid) {
          // Clear waiting state
          await supabaseCheck.from('api_settings').delete().eq('key_name', `blog_waiting_${chatId}`)
          console.log(`📝 Text blog via /blog waiting state: ${msgText.length} chars`)

          const statusMsg = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: '🧠 <b>Генерую блог-пост з тексту...</b>', parse_mode: 'HTML' }),
          }).then(r => r.json())
          const statusMsgId = statusMsg?.result?.message_id
          if (!statusMsgId) console.warn('⚠️ Failed to get status message ID from Telegram')

          // Text blog: same pipeline as voice — await blog creation, then image + social in parallel
          try {
            const blogRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-blog-post`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ newsId: '00000000-0000-0000-0000-000000000000', title: msgText.slice(0, 100), content: msgText, sourceType: 'voice' }),
            })
            const blogData = await blogRes.json()

            if (blogData.success && blogData.blogPostId) {
              const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
              const baseUrl = Deno.env.get('SUPABASE_URL')!
              const { data: post } = await supa.from('blog_posts').select('title_ua, title_en, title_no, slug_en, tags, reading_time, image_url, content_en').eq('id', blogData.blogPostId).single()

              const blogUrl = `https://vitalii.no/blog/${post?.slug_en || ''}`
              const bpId = blogData.blogPostId

              await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, message_id: statusMsgId, text: '✅ <b>Блог опубліковано!</b>\n\n🖼️ Генерую зображення + публікую в соцмережі...', parse_mode: 'HTML' }),
              })

              // Helper to get API key from DB or env
              const getKey = async (name: string) => {
                const { data: r } = await supa.from('api_settings').select('key_value').eq('key_name', name).single()
                return r?.key_value || Deno.env.get(name) || ''
              }

              // Image generation via Gemini
              const imagePromise = (async () => {
                try {
                  const gKey = await getKey('GOOGLE_API_KEY')
                  if (!gKey) return null
                  console.log('🖼️ Generating blog cover via Gemini (text blog)...')
                  const imgRes = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${gKey}`,
                    { method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        contents: [{ parts: [{ text: `Professional blog cover image. Topic: ${post?.title_en || ''}. ${(post?.content_en || '').slice(0, 200)}. Dark background, modern tech aesthetic, no text, no logos. 16:9 landscape.` }] }],
                        generationConfig: { responseModalities: ['image', 'text'] },
                      }),
                    },
                  )
                  if (!imgRes.ok) { console.error('Gemini image:', imgRes.status); return null }
                  const imgData = await imgRes.json()
                  for (const part of imgData?.candidates?.[0]?.content?.parts || []) {
                    if (part.inlineData) {
                      const b64 = part.inlineData.data as string
                      const raw = atob(b64)
                      const arr = new Uint8Array(raw.length)
                      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
                      const path = `blog-covers/text-${Date.now()}.png`
                      const { error: upErr } = await supa.storage.from('news-images').upload(path, arr, { contentType: 'image/png', upsert: true })
                      if (!upErr) {
                        const url = `${baseUrl}/storage/v1/object/public/news-images/${path}`
                        await supa.from('blog_posts').update({ image_url: url, processed_image_url: url }).eq('id', bpId)
                        console.log('🖼️ Image saved:', url)
                        return url
                      } else { console.error('Upload err:', upErr) }
                    }
                  }
                  return null
                } catch (e) { console.error('Image failed:', e); return null }
              })()

              // Social posting (LinkedIn + Facebook)
              const socialPromise = (async () => {
                const results: string[] = []
                const blogTitle = post?.title_en || ''
                const blogUrlSocial = `https://vitalii.no/blog/${post?.slug_en || ''}`
                const postContent = (post?.content_en || '').slice(0, 500)

                let liText = blogTitle + '\n\n' + (post?.tags || []).map((t: string) => '#' + t.replace(/\s/g, '')).join(' ')
                let fbText = blogTitle
                try {
                  const gk = await getKey('GOOGLE_API_KEY')
                  if (gk) {
                    const sp = 'Generate social media posts for this blog. Author is a full-stack developer.\n' +
                      'TITLE: ' + blogTitle + '\nCONTENT: ' + postContent + '\nURL: ' + blogUrlSocial + '\n' +
                      'TAGS: ' + (post?.tags || []).join(', ') + '\n\n' +
                      'LINKEDIN (1200-1800 chars): Hook under 210 chars, storytelling, NO links in body, 3-5 hashtags, CTA question.\n' +
                      'FACEBOOK (under 280 chars): Short hook, 1-2 hashtags, conversational.\n\n' +
                      HUMANIZER_SOCIAL + '\n\n' + VOICE_SOCIAL + '\n\n' +
                      'Return ONLY JSON: {"linkedin_post":"...","facebook_post":"..."}'
                    const gr = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + gk, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ contents: [{ parts: [{ text: sp }] }], generationConfig: { temperature: 0.6, maxOutputTokens: 4000 } }),
                    })
                    if (gr.ok) {
                      const gt = ((await gr.json())?.candidates?.[0]?.content?.parts?.[0]?.text || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
                      try { const p = JSON.parse(gt); if (p.linkedin_post) liText = p.linkedin_post; if (p.facebook_post) fbText = p.facebook_post } catch { /* keep defaults */ }
                    }
                  }
                } catch { /* keep defaults */ }

                // LinkedIn
                try {
                  const liToken = Deno.env.get('LINKEDIN_ACCESS_TOKEN') || await getKey('LINKEDIN_ACCESS_TOKEN')
                  const liUrn = Deno.env.get('LINKEDIN_PERSON_URN') || await getKey('LINKEDIN_PERSON_URN')
                  if (liToken && liUrn) {
                    let shareContent: any = { shareCommentary: { text: liText }, shareMediaCategory: 'NONE' }
                    const imgWait = await imagePromise
                    if (imgWait) {
                      try {
                        const regRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
                          method: 'POST', headers: { 'Authorization': 'Bearer ' + liToken, 'Content-Type': 'application/json' },
                          body: JSON.stringify({ registerUploadRequest: { recipes: ['urn:li:digitalmediaRecipe:feedshare-image'], owner: liUrn, serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }] } }),
                        })
                        if (regRes.ok) {
                          const rd = await regRes.json()
                          const upUrl = rd.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl
                          const asset = rd.value?.asset
                          if (upUrl && asset) {
                            const ib = await fetch(imgWait).then(r => r.arrayBuffer())
                            await fetch(upUrl, { method: 'PUT', headers: { 'Authorization': 'Bearer ' + liToken }, body: ib })
                            shareContent = { shareCommentary: { text: liText }, shareMediaCategory: 'IMAGE', media: [{ status: 'READY', media: asset }] }
                          }
                        }
                      } catch (ie) { console.error('LI img:', ie) }
                    }
                    const liRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
                      method: 'POST',
                      headers: { 'Authorization': 'Bearer ' + liToken, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
                      body: JSON.stringify({ author: liUrn, lifecycleState: 'PUBLISHED', specificContent: { 'com.linkedin.ugc.ShareContent': shareContent }, visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' } }),
                    })
                    if (liRes.ok) {
                      const su = liRes.headers.get('x-restli-id') || ''
                      results.push('✅ <a href="https://www.linkedin.com/feed/update/' + su + '">LinkedIn</a>')
                    } else { results.push('❌ LinkedIn: ' + liRes.status) }
                  } else { results.push('⏭️ LinkedIn: no credentials') }
                } catch (e: unknown) { results.push('❌ LinkedIn: ' + (e instanceof Error ? e.message.slice(0, 40) : 'error')) }

                // Facebook
                try {
                  const fbToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN') || await getKey('FACEBOOK_PAGE_ACCESS_TOKEN')
                  const fbPage = Deno.env.get('FACEBOOK_PAGE_ID') || await getKey('FACEBOOK_PAGE_ID')
                  if (fbToken && fbPage) {
                    const fbRes = await fetch('https://graph.facebook.com/v18.0/' + fbPage + '/feed', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ message: fbText, link: blogUrlSocial, access_token: fbToken }),
                    })
                    if (fbRes.ok) {
                      const fd = await fbRes.json()
                      results.push('✅ <a href="https://facebook.com/' + fd.id + '">Facebook</a>')
                    } else { results.push('❌ Facebook: ' + fbRes.status) }
                  } else { results.push('⏭️ Facebook: no credentials') }
                } catch (e: unknown) { results.push('❌ Facebook: ' + (e instanceof Error ? e.message.slice(0, 40) : 'error')) }

                return results
              })()

              const [imageUrl, socialResults] = await Promise.all([imagePromise, socialPromise])

              const preview = `✅ <b>Блог-пост опубліковано!</b>\n\n` +
                `📌 <b>${post?.title_ua || ''}</b>\n\n` +
                `🏷 ${(post?.tags || []).join(', ')}\n` +
                `📖 ~${post?.reading_time || 1} хв\n` +
                `🖼️ ${imageUrl ? 'Зображення ✅' : 'Без зображення'}\n` +
                `🌐 EN: ${post?.title_en || ''}\n` +
                `🌐 NO: ${post?.title_no || ''}\n\n` +
                `📢 Соцмережі:\n${socialResults.join('\n')}\n\n` +
                `🔗 ${blogUrl}`

              await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, message_id: statusMsgId, text: preview, parse_mode: 'HTML', disable_web_page_preview: false }),
              })
            } else {
              await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, message_id: statusMsgId, text: `❌ ${blogData.error || 'unknown'}` }),
              })
            }
          } catch (e) { console.error('text blog dispatch failed:', e) }

          return new Response('OK')
        }
      }

      // ── Voice blog edit reply ──
      if (message.reply_to_message?.text?.includes('voiceblog:edit:') && message.text) {
        const editMatch = message.reply_to_message.text.match(/voiceblog:edit:([a-f0-9-]+)/)
        if (editMatch) {
          const blogPostId = editMatch[1]
          const statusMsg = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: '🔄 <b>Переробляю з вашими правками...</b>', parse_mode: 'HTML' }),
          }).then(r => r.json())

          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-voice-blog`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawText: message.text, chatId, messageId: statusMsg?.result?.message_id, blogPostId }),
          }).catch(e => console.error('edit dispatch failed:', e))
          return new Response('OK')
        }
      }

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

        // Extract external source link from forwarded content
        const sourceLink = extractSourceLink(text)
        console.log('📎 Extracted source link from forward:', sourceLink)

        if (!text || text.trim().length < 50) {
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: '⚠️ Повідомлення занадто коротке для обробки (мін. 50 символів)',
              })
            }
          )
          return new Response(JSON.stringify({ ok: true }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // Обробити через analyze-rss-article (створює запис, AI аналіз, показує з кнопками)
        try {
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `🔄 Обробляю пересланий пост${channelUsername ? ` з @${channelUsername}` : ''}...`,
              })
            }
          )

          const analyzeResponse = await fetch(
            `${SUPABASE_URL}/functions/v1/analyze-rss-article`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                url: originalUrl || sourceLink || '',
                content: text,
                title: text.split('\n')[0].substring(0, 200),
                sourceName: channelUsername ? `@${channelUsername}` : 'Telegram Forward',
                imageUrl: photoUrl,
                skipTelegram: false,
              })
            }
          )

          const result = await analyzeResponse.json()
          if (!result.success && result.error) {
            throw new Error(result.error)
          }

          console.log(`✅ Forward processed: newsId=${result.newsId}, score=${result.relevanceScore}`)
        } catch (error: any) {
          console.error('Error processing forwarded message:', error)
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `❌ Помилка: ${error.message}`,
              })
            }
          )
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // =================================================================
      // 📸 Check if this is a photo reply for Instagram upload (auto-post after upload)
      // =================================================================
      if (message.reply_to_message && message.photo && message.photo.length > 0) {
        const replyText = message.reply_to_message.text || ''

        // Check for Instagram upload pattern: instagram_lang:newsId
        const instagramMatch = replyText.match(/instagram_(en|no|ua):([a-f0-9-]+)/)
        if (instagramMatch && replyText.includes('Instagram потребує зображення')) {
          const instagramLanguage = instagramMatch[1] as 'en' | 'no' | 'ua'
          const newsId = instagramMatch[2]
          console.log(`📸 Received Instagram image for news: ${newsId}, language: ${instagramLanguage}`)

          try {
            // Get largest photo
            const photo = message.photo[message.photo.length - 1]

            // Download photo from Telegram
            const fileResponse = await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${photo.file_id}`
            )
            const fileData = await fileResponse.json()

            if (!fileData.ok) {
              throw new Error('Failed to get photo file info')
            }

            const photoUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`
            const photoResponse = await fetch(photoUrl)
            const photoBuffer = await photoResponse.arrayBuffer()

            // Upload to Supabase Storage
            const fileName = `custom/${newsId}_${Date.now()}.jpg`
            const { error: uploadError } = await supabase.storage
              .from('news-images')
              .upload(fileName, photoBuffer, {
                contentType: 'image/jpeg',
                upsert: true,
                cacheControl: '31536000'
              })

            if (uploadError) {
              throw new Error(`Upload failed: ${uploadError.message}`)
            }

            const { data: urlData } = supabase.storage
              .from('news-images')
              .getPublicUrl(fileName)

            const publicUrl = urlData.publicUrl

            // Update news record with custom image and append to gallery
            const { data: currentNewsForGal } = await supabase.from('news').select('images').eq('id', newsId).single()
            const currentGalImages: string[] = currentNewsForGal?.images || []
            const updatedGalImages = currentGalImages.includes(publicUrl) ? currentGalImages : [...currentGalImages, publicUrl]

            const { error: updateError } = await supabase
              .from('news')
              .update({
                processed_image_url: publicUrl,
                image_processed_at: new Date().toISOString(),
                images: updatedGalImages
              })
              .eq('id', newsId)

            if (updateError) {
              throw new Error(`Database update failed: ${updateError.message}`)
            }

            console.log(`✅ Image uploaded: ${publicUrl}`)

            // Update message to show upload success (APPEND only, don't remove anything)
            await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  message_id: message.reply_to_message.message_id,
                  text: replyText + `\n\n✅ <b>Зображення завантажено!</b>\n🖼️ <a href="${publicUrl}">Переглянути</a>\n⏳ <i>Публікую в Instagram (${instagramLanguage.toUpperCase()})...</i>`,
                  parse_mode: 'HTML',
                  disable_web_page_preview: true
                })
              }
            )

            // Auto-post to Instagram
            console.log(`📸 Auto-posting to Instagram (${instagramLanguage})...`)

            const postResponse = await fetch(
              `${SUPABASE_URL}/functions/v1/post-to-instagram`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  newsId: newsId,
                  language: instagramLanguage,
                  contentType: 'news'
                })
              }
            )

            const postResult = await postResponse.json()

            if (postResult.success) {
              console.log(`✅ Posted to Instagram successfully: ${postResult.postUrl}`)

              // Update message with success (APPEND to original, include image link)
              const successText = replyText +
                `\n\n✅ <b>Зображення завантажено!</b>\n🖼️ <a href="${publicUrl}">Переглянути</a>` +
                `\n\n📸 Instagram ${instagramLanguage.toUpperCase()}: ` +
                (postResult.postUrl ? `<a href="${postResult.postUrl}">Переглянути пост</a>` : 'Опубліковано')

              // Add buttons for other Instagram languages
              const otherLangs = ['en', 'no', 'ua'].filter(l => l !== instagramLanguage)
              const instagramButtons = otherLangs.map(lang => ({
                text: `📸 Instagram ${lang.toUpperCase()}`,
                callback_data: `instagram_${lang}_${newsId}`
              }))

              await fetch(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: chatId,
                    message_id: message.reply_to_message.message_id,
                    text: successText,
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                    reply_markup: {
                      inline_keyboard: [instagramButtons]
                    }
                  })
                }
              )
            } else {
              console.error(`❌ Instagram post failed: ${postResult.error}`)

              // Update message with error (APPEND to original, include image link)
              const errorText = replyText +
                `\n\n✅ <b>Зображення завантажено!</b>\n🖼️ <a href="${publicUrl}">Переглянути</a>` +
                `\n\n❌ <b>Instagram ${instagramLanguage.toUpperCase()}:</b> ${postResult.error || 'Unknown error'}`

              await fetch(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: chatId,
                    message_id: message.reply_to_message.message_id,
                    text: errorText,
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                    reply_markup: {
                      inline_keyboard: [[
                        { text: '🔄 Спробувати ще', callback_data: `instagram_${instagramLanguage}_${newsId}` }
                      ]]
                    }
                  })
                }
              )
            }

            return new Response(JSON.stringify({ ok: true, instagramPosted: postResult.success }), {
              headers: { 'Content-Type': 'application/json' }
            })

          } catch (error: any) {
            console.error('Error uploading Instagram image:', error)
            await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `❌ Помилка: ${error.message}`,
                  reply_to_message_id: message.message_id
                })
              }
            )

            return new Response(JSON.stringify({ ok: false, error: error.message }), {
              headers: { 'Content-Type': 'application/json' },
              status: 500
            })
          }
        }

        // Check for standard custom image upload pattern: newsId:xxx
        const newsIdMatch = replyText.match(/newsId:([a-f0-9-]+)/)

        if (newsIdMatch && replyText.includes('Очікую фото')) {
          const newsId = newsIdMatch[1]
          console.log(`📸 Received custom image for news: ${newsId}`)

          try {
            // Get largest photo
            const photo = message.photo[message.photo.length - 1]

            // Download photo from Telegram
            const fileResponse = await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${photo.file_id}`
            )
            const fileData = await fileResponse.json()

            if (!fileData.ok) {
              throw new Error('Failed to get photo file info')
            }

            const photoUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`
            const photoResponse = await fetch(photoUrl)
            const photoBuffer = await photoResponse.arrayBuffer()

            // Upload to Supabase Storage
            const fileName = `custom/${newsId}_${Date.now()}.jpg`
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('news-images')
              .upload(fileName, photoBuffer, {
                contentType: 'image/jpeg',
                upsert: true,
                cacheControl: '31536000'
              })

            if (uploadError) {
              throw new Error(`Upload failed: ${uploadError.message}`)
            }

            const { data: urlData } = supabase.storage
              .from('news-images')
              .getPublicUrl(fileName)

            const publicUrl = urlData.publicUrl

            // Update news record with custom image and append to gallery
            const { data: curNewsGal2 } = await supabase.from('news').select('images').eq('id', newsId).single()
            const curGalImgs2: string[] = curNewsGal2?.images || []
            const updGalImgs2 = curGalImgs2.includes(publicUrl) ? curGalImgs2 : [...curGalImgs2, publicUrl]

            const { error: updateError } = await supabase
              .from('news')
              .update({
                processed_image_url: publicUrl,
                image_processed_at: new Date().toISOString(),
                images: updGalImgs2
              })
              .eq('id', newsId)

            if (updateError) {
              throw new Error(`Database update failed: ${updateError.message}`)
            }

            // Check if this is RSS workflow (use RSS-specific publish buttons)
            const isRssWorkflow = replyText.includes('rss_workflow:true')
            const uploadGalCount = updGalImgs2.length

            // Update original message with success status and gallery buttons
            const publishKeyboard = isRssWorkflow ? {
              inline_keyboard: [
                [
                  { text: `✅ Готово (${uploadGalCount} фото)`, callback_data: `gal_done_${newsId}` },
                  { text: '➕ Ще', callback_data: `add_more_${newsId}` }
                ],
                [
                  { text: '🖼 + Оригінал', callback_data: `keep_orig_${newsId}` }
                ],
                [
                  { text: '❌ Skip', callback_data: `reject_${newsId}` }
                ]
              ]
            } : {
              inline_keyboard: [
                [
                  { text: `✅ Готово (${uploadGalCount} фото)`, callback_data: `gal_done_${newsId}` },
                  { text: '➕ Ще', callback_data: `add_more_${newsId}` }
                ],
                [
                  { text: '🖼 + Оригінал', callback_data: `keep_orig_${newsId}` }
                ],
                [
                  { text: '❌ Reject', callback_data: `reject_${newsId}` }
                ]
              ]
            }

            // APPEND success status (don't remove anything from original)
            await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  message_id: message.reply_to_message.message_id,
                  text: replyText + `\n\n✅ <b>Зображення прикріплено</b>\n🖼️ <a href="${publicUrl}">Переглянути</a>\n📝 <i>Оберіть де опублікувати...</i>`,
                  parse_mode: 'HTML',
                  reply_markup: publishKeyboard
                })
              }
            )

            return new Response(JSON.stringify({ ok: true, uploaded: true }), {
              headers: { 'Content-Type': 'application/json' }
            })

          } catch (error) {
            console.error('Error uploading custom image:', error)
            await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `❌ Помилка завантаження зображення: ${error.message}`,
                  reply_to_message_id: message.message_id
                })
              }
            )

            return new Response(JSON.stringify({ ok: false, error: error.message }), {
              headers: { 'Content-Type': 'application/json' },
              status: 500
            })
          }
        }
      }

      // Звичайне повідомлення - перевірити чи це URL
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

      // ── URL Detection: якщо повідомлення містить URL → обробити як статтю ──
      const urlMatch = text.trim().match(/^(https?:\/\/[^\s]+)$/i) || text.trim().match(/^(https?:\/\/[^\s]+)/i)
      if (urlMatch) {
        const articleUrl = urlMatch[1]
        console.log(`🔗 URL detected in message: ${articleUrl}`)

        try {
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `🔄 Обробляю посилання...\n${articleUrl}`,
              })
            }
          )

          // Check if it's a Telegram post link (t.me/channel/123)
          const tgMatch = articleUrl.match(/(?:t\.me|telegram\.me)\/([^/]+)\/(\d+)/)

          if (tgMatch) {
            // Telegram post — forward to process-news with source link
            const processResponse = await fetch(
              `${SUPABASE_URL}/functions/v1/process-news`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  content: `Telegram post from @${tgMatch[1]}`,
                  sourceLink: articleUrl,
                  sourceType: 'telegram_link',
                  chatId: chatId,
                })
              }
            )
            const result = await processResponse.json()
            if (!result.success && result.error) {
              throw new Error(result.error)
            }

            await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `✅ Telegram пост відправлено на обробку!`,
                })
              }
            )
          } else {
            // Web URL — analyze as RSS article (fetches content, AI analysis, sends to bot with buttons)
            const analyzeResponse = await fetch(
              `${SUPABASE_URL}/functions/v1/analyze-rss-article`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  url: articleUrl,
                  sourceName: 'Manual URL',
                  skipTelegram: false,
                })
              }
            )

            const result = await analyzeResponse.json()
            if (!result.success && result.error) {
              throw new Error(result.error)
            }

            // analyze-rss-article already sends Telegram message with buttons
            console.log(`✅ URL processed: newsId=${result.newsId}, score=${result.relevanceScore}`)
          }

          return new Response(JSON.stringify({ ok: true }), {
            headers: { 'Content-Type': 'application/json' }
          })
        } catch (error: any) {
          console.error('Error processing URL:', error)
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `❌ Помилка обробки URL: ${error.message}`,
              })
            }
          )
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200  // Return 200 to Telegram to prevent retries
          })
        }
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
      const messageText = escapeHtml(update.callback_query.message.text || '')

      // Helper: truncate messageText + appendedText to fit Telegram 4096 char limit
      const truncateForTelegram = (original: string, appended: string, limit = 4000): string => {
        const combined = original + appended
        if (combined.length <= limit) return combined
        console.log(`⚠️ Message too long (${combined.length}), truncating original to fit`)
        const maxOriginalLength = limit - appended.length - 50
        return original.substring(0, maxOriginalLength) + '\n\n<i>... (скорочено)</i>' + appended
      }

      // Helper: build 6-button pool keyboard (News×3 + Blog×3 + Reject)
      // Each button triggers preset handler: pr_{variant}{type}{lang}_{newsId}
      // variant=a (AI auto), type=n/b, lang=e/n/u
      const buildPoolKeyboard = (nid: string) => ({
        inline_keyboard: [
          [
            { text: '📰 News EN', callback_data: `pr_ane_${nid}` },
            { text: '📰 News NO', callback_data: `pr_ann_${nid}` },
            { text: '📰 News UA', callback_data: `pr_anu_${nid}` },
          ],
          [
            { text: '📝 Blog EN', callback_data: `pr_abe_${nid}` },
            { text: '📝 Blog NO', callback_data: `pr_abn_${nid}` },
            { text: '📝 Blog UA', callback_data: `pr_abu_${nid}` },
          ],
          [{ text: '❌ Reject', callback_data: `reject_${nid}` }],
        ],
      })

      console.log('Callback received:', callbackData)

      // Parse callback data: publish_news_<id>, publish_blog_<id>, or reject_<id>
      let action: string
      let publicationType: string | null = null
      let newsId: string

      let linkedinLanguage: string | null = null

      // Track platform and language for social posting
      let socialPlatform: string | null = null
      let socialLanguage: string | null = null

      // Track language for image generation
      let imageLanguage: string | null = null

      // ── Voice Blog callbacks (vb_) ──
      if (callbackData.startsWith('vb_pub_')) {
        const blogPostId = callbackData.replace('vb_pub_', '')
        console.log(`✅ Voice blog publish: ${blogPostId}`)
        const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
        await supabase.from('blog_posts').update({ is_published: true, published_at: new Date().toISOString() }).eq('id', blogPostId)
        const { data: post } = await supabase.from('blog_posts').select('title_ua, slug_en').eq('id', blogPostId).single()
        const url = post?.slug_en ? `https://vitalii.no/blog/${post.slug_en}` : 'vitalii.no'
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: `✅ <b>Опубліковано!</b>\n\n📌 ${post?.title_ua || ''}\n🔗 ${url}\n\nТепер можна поширити в соцмережах:`,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [
              [{ text: '🌐 All EN', callback_data: `vb_all_en_${blogPostId}` }, { text: '🌐 All NO', callback_data: `vb_all_no_${blogPostId}` }],
              [{ text: '🔗 LinkedIn EN', callback_data: `linkedin_en_${blogPostId}` }, { text: '📘 Facebook EN', callback_data: `facebook_en_${blogPostId}` }],
            ]},
          }),
        })
        return new Response('OK')
      }

      if (callbackData.startsWith('vb_cancel_')) {
        const blogPostId = callbackData.replace('vb_cancel_', '')
        const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
        await supabase.from('blog_posts').delete().eq('id', blogPostId).eq('is_published', false)
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: '❌ Чернетку скасовано.' }),
        })
        return new Response('OK')
      }

      if (callbackData.startsWith('vb_regen_')) {
        const blogPostId = callbackData.replace('vb_regen_', '')
        const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
        const { data: draft } = await supabase.from('blog_posts').select('original_voice_text').eq('id', blogPostId).single()
        if (draft?.original_voice_text) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: '🔄 <b>Регенерую...</b>', parse_mode: 'HTML' }),
          })
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-voice-blog`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawText: draft.original_voice_text, chatId, messageId, blogPostId }),
          }).catch(e => console.error('regen failed:', e))
        }
        return new Response('OK')
      }

      if (callbackData.startsWith('vb_edit_')) {
        const blogPostId = callbackData.replace('vb_edit_', '')
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: `✏️ <b>Режим редагування</b>\n\nНадішліть виправлений текст у відповідь.\n\n<code>voiceblog:edit:${blogPostId}</code>`,
            parse_mode: 'HTML',
          }),
        })
        return new Response('OK')
      }

      if (callbackData.startsWith('publish_news_')) {
        action = 'publish'
        publicationType = 'news'
        newsId = callbackData.replace('publish_news_', '')
      } else if (callbackData.startsWith('publish_blog_')) {
        action = 'publish'
        publicationType = 'blog'
        newsId = callbackData.replace('publish_blog_', '')
        // RSS Article callbacks - use process-rss-news for summary-style rewrite
      } else if (callbackData.startsWith('publish_rss_news_')) {
        action = 'publish_rss'
        publicationType = 'news'
        newsId = callbackData.replace('publish_rss_news_', '')
      } else if (callbackData.startsWith('publish_rss_blog_')) {
        action = 'publish_rss'
        publicationType = 'blog'
        newsId = callbackData.replace('publish_rss_blog_', '')
      } else if (callbackData.startsWith('linkedin_en_')) {
        action = 'linkedin'
        linkedinLanguage = 'en'
        newsId = callbackData.replace('linkedin_en_', '')
      } else if (callbackData.startsWith('linkedin_no_')) {
        action = 'linkedin'
        linkedinLanguage = 'no'
        newsId = callbackData.replace('linkedin_no_', '')
      } else if (callbackData.startsWith('linkedin_ua_')) {
        action = 'linkedin'
        linkedinLanguage = 'ua'
        newsId = callbackData.replace('linkedin_ua_', '')
        // Facebook callbacks
      } else if (callbackData.startsWith('facebook_en_')) {
        action = 'social_post'
        socialPlatform = 'facebook'
        socialLanguage = 'en'
        newsId = callbackData.replace('facebook_en_', '')
      } else if (callbackData.startsWith('facebook_no_')) {
        action = 'social_post'
        socialPlatform = 'facebook'
        socialLanguage = 'no'
        newsId = callbackData.replace('facebook_no_', '')
      } else if (callbackData.startsWith('facebook_ua_')) {
        action = 'social_post'
        socialPlatform = 'facebook'
        socialLanguage = 'ua'
        newsId = callbackData.replace('facebook_ua_', '')
        // Instagram callbacks
      } else if (callbackData.startsWith('instagram_en_')) {
        action = 'social_post'
        socialPlatform = 'instagram'
        socialLanguage = 'en'
        newsId = callbackData.replace('instagram_en_', '')
      } else if (callbackData.startsWith('instagram_no_')) {
        action = 'social_post'
        socialPlatform = 'instagram'
        socialLanguage = 'no'
        newsId = callbackData.replace('instagram_no_', '')
      } else if (callbackData.startsWith('instagram_ua_')) {
        action = 'social_post'
        socialPlatform = 'instagram'
        socialLanguage = 'ua'
        newsId = callbackData.replace('instagram_ua_', '')
        // TikTok callback (manual workflow)
      } else if (callbackData.startsWith('tiktok_')) {
        action = 'tiktok'
        newsId = callbackData.replace('tiktok_', '')
        // Twitter Share Intent callbacks
      } else if (callbackData.startsWith('twitter_en_')) {
        action = 'twitter'
        socialPlatform = 'twitter'
        socialLanguage = 'en'
        newsId = callbackData.replace('twitter_en_', '')
      } else if (callbackData.startsWith('twitter_no_')) {
        action = 'twitter'
        socialPlatform = 'twitter'
        socialLanguage = 'no'
        newsId = callbackData.replace('twitter_no_', '')
      } else if (callbackData.startsWith('twitter_ua_')) {
        action = 'twitter'
        socialPlatform = 'twitter'
        socialLanguage = 'ua'
        newsId = callbackData.replace('twitter_ua_', '')
        // Batch posting: All socials in one language
      } else if (callbackData.startsWith('all_en_')) {
        action = 'post_all'
        socialLanguage = 'en'
        newsId = callbackData.replace('all_en_', '')
      } else if (callbackData.startsWith('all_no_')) {
        action = 'post_all'
        socialLanguage = 'no'
        newsId = callbackData.replace('all_no_', '')
      } else if (callbackData.startsWith('all_ua_')) {
        action = 'post_all'
        socialLanguage = 'ua'
        newsId = callbackData.replace('all_ua_', '')
        // Combo: LinkedIn EN + Facebook EN
      } else if (callbackData.startsWith('combo_li_fb_en_')) {
        action = 'combo_li_fb_en'
        newsId = callbackData.replace('combo_li_fb_en_', '')
        // Combo: LinkedIn + Facebook + Instagram (one language)
      } else if (callbackData.startsWith('combo_li_fb_ig_en_')) {
        action = 'combo_li_fb_ig'
        socialLanguage = 'en'
        newsId = callbackData.replace('combo_li_fb_ig_en_', '')
      } else if (callbackData.startsWith('combo_li_fb_ig_no_')) {
        action = 'combo_li_fb_ig'
        socialLanguage = 'no'
        newsId = callbackData.replace('combo_li_fb_ig_no_', '')
      } else if (callbackData.startsWith('combo_li_fb_ig_ua_')) {
        action = 'combo_li_fb_ig'
        socialLanguage = 'ua'
        newsId = callbackData.replace('combo_li_fb_ig_ua_', '')
        // Skip remaining social platforms
      } else if (callbackData.startsWith('skip_social_')) {
        action = 'skip_social'
        newsId = callbackData.replace('skip_social_', '')
        // Image variant selection callbacks (select_variant_1_<uuid>, select_variant_2_<uuid>, etc.)
      } else if (callbackData.startsWith('select_variant_')) {
        action = 'select_variant'
        // Format: select_variant_N_<newsId>
        // Remove prefix "select_variant_" to get "N_<newsId>"
        const remainder = callbackData.replace('select_variant_', '')
        const firstUnderscore = remainder.indexOf('_')
        imageLanguage = remainder.substring(0, firstUnderscore) // variant index as string ("1"-"4")
        newsId = remainder.substring(firstUnderscore + 1)
        // Variant + language selection: vl_N_LL_<uuid> (N=1-4, LL=ua/no/en)
      } else if (callbackData.startsWith('vl_')) {
        action = 'variant_with_lang'
        // Format: vl_N_LL_<uuid>
        const parts = callbackData.split('_')
        // parts: ['vl', '1', 'ua', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'] (UUID may contain dashes)
        socialLanguage = parts[1] // variant index '1'-'4'
        imageLanguage = parts[2]  // 'ua', 'no', 'en'
        newsId = parts.slice(3).join('_')
      } else if (callbackData.startsWith('new_variants_')) {
        action = 'new_variants'
        newsId = callbackData.replace('new_variants_', '')
      } else if (callbackData.startsWith('back_to_variants_')) {
        action = 'back_to_variants'
        newsId = callbackData.replace('back_to_variants_', '')
      } else if (callbackData.startsWith('skip_dup_')) {
        action = 'skip_dup'
        newsId = callbackData.replace('skip_dup_', '')
      // ── Daily Video callbacks (dv_*) — newsId = target_date (YYYY-MM-DD) ──
      } else if (callbackData.startsWith('dv_t_')) {
        // Toggle article: dv_t_N_YYYY-MM-DD (N = 1-based index)
        action = 'dv_toggle'
        const rest = callbackData.substring(5) // "N_YYYY-MM-DD"
        const idx = rest.indexOf('_')
        socialLanguage = rest.substring(0, idx)  // article index as string
        newsId = rest.substring(idx + 1)          // YYYY-MM-DD
      } else if (callbackData.startsWith('dv_th_')) {
        // Select thumbnail variant: dv_th_N_YYYY-MM-DD
        action = 'dv_th'
        const rest = callbackData.substring(6) // "N_YYYY-MM-DD"
        const idx = rest.indexOf('_')
        socialLanguage = rest.substring(0, idx)  // variant index as string
        newsId = rest.substring(idx + 1)          // YYYY-MM-DD
      } else if (callbackData.startsWith('dv_thr_')) {
        // Regenerate thumbnails: dv_thr_YYYY-MM-DD
        action = 'dv_thr'
        newsId = callbackData.replace('dv_thr_', '')
      } else if (callbackData.startsWith('dv_ok_')) {
        action = 'dv_ok'
        newsId = callbackData.replace('dv_ok_', '')
      } else if (callbackData.startsWith('dv_skip_')) {
        action = 'dv_skip'
        newsId = callbackData.replace('dv_skip_', '')
      } else if (callbackData.startsWith('dv_sok_')) {
        action = 'dv_sok'
        newsId = callbackData.replace('dv_sok_', '')
      } else if (callbackData.startsWith('dv_srg_')) {
        action = 'dv_srg'
        newsId = callbackData.replace('dv_srg_', '')
      } else if (callbackData.startsWith('dv_ren_')) {
        action = 'dv_ren'
        newsId = callbackData.replace('dv_ren_', '')
      } else if (callbackData.startsWith('dv_rok_')) {
        action = 'dv_rok'
        newsId = callbackData.replace('dv_rok_', '')
      } else if (callbackData.startsWith('dv_vrg_')) {
        action = 'dv_vrg'
        newsId = callbackData.replace('dv_vrg_', '')
      } else if (callbackData.startsWith('dv_rsi_')) {
        action = 'dv_rsi'
        newsId = callbackData.replace('dv_rsi_', '')
      } else if (callbackData.startsWith('dv_rsa_')) {
        // dv_rsa_{index}_{date} — research images for specific article
        action = 'dv_rsa'
        const rsaParts = callbackData.replace('dv_rsa_', '').split('_')
        socialLanguage = rsaParts[0] // article index
        newsId = rsaParts.slice(1).join('_') // target_date
      // ── Custom Video callbacks (cv_*) — newsId = draft UUID ──
      } else if (callbackData.startsWith('cv_sok_')) {
        action = 'cv_sok'
        newsId = callbackData.replace('cv_sok_', '')
      } else if (callbackData.startsWith('cv_srg_')) {
        action = 'cv_srg'
        newsId = callbackData.replace('cv_srg_', '')
      } else if (callbackData.startsWith('cv_ren_')) {
        action = 'cv_ren'
        newsId = callbackData.replace('cv_ren_', '')
      } else if (callbackData.startsWith('cv_img_')) {
        action = 'cv_img'
        newsId = callbackData.replace('cv_img_', '')
      } else if (callbackData.startsWith('cv_rok_')) {
        action = 'cv_rok'
        newsId = callbackData.replace('cv_rok_', '')
      } else if (callbackData.startsWith('cv_vrg_')) {
        action = 'cv_vrg'
        newsId = callbackData.replace('cv_vrg_', '')
      } else if (callbackData.startsWith('cv_skip_')) {
        action = 'cv_skip'
        newsId = callbackData.replace('cv_skip_', '')
      } else if (callbackData.startsWith('cv_fmt_')) {
        action = 'cv_fmt'
        newsId = callbackData.replace('cv_fmt_', '')
      } else if (callbackData.startsWith('cv_dur_')) {
        action = 'cv_dur'
        newsId = callbackData.replace('cv_dur_', '')
      // Custom Video language selection (cv_lu=UA, cv_ln=NO, cv_le=EN)
      } else if (callbackData.startsWith('cv_lu_')) {
        action = 'cv_lu'
        newsId = callbackData.replace('cv_lu_', '')
      } else if (callbackData.startsWith('cv_ln_')) {
        action = 'cv_ln'
        newsId = callbackData.replace('cv_ln_', '')
      } else if (callbackData.startsWith('cv_le_')) {
        action = 'cv_le'
        newsId = callbackData.replace('cv_le_', '')

      } else if (callbackData.startsWith('reject_')) {
        action = 'reject'
        newsId = callbackData.replace('reject_', '')
        // RSS Image workflow callbacks
      } else if (callbackData.startsWith('confirm_rss_image_')) {
        action = 'confirm_rss_image'
        newsId = callbackData.replace('confirm_rss_image_', '')
      } else if (callbackData.startsWith('regenerate_rss_image_')) {
        action = 'regenerate_rss_image'
        newsId = callbackData.replace('regenerate_rss_image_', '')
      } else if (callbackData.startsWith('regen_img_')) {
        // regen_img_ua_123, regen_img_no_123, regen_img_en_123
        console.log('🔍 Received regen_img callback:', callbackData)
        action = 'regen_img_with_lang'
        const parts = callbackData.split('_')
        console.log('🔍 Callback parts:', JSON.stringify(parts))
        // parts: ['regen', 'img', 'ua', '123'] or ['regen', 'img', 'ua', '123', '456'] for UUID
        const lang = parts[2]
        newsId = parts.slice(3).join('_')
        console.log('🔍 Extracted: lang=', lang, 'newsId=', newsId)
        if (!newsId || newsId === 'undefined') {
          console.error('❌ CRITICAL: newsId is empty or undefined in regen_img callback!')
        }
        // Store language in a variable we can access later
        imageLanguage = lang
      } else if (callbackData.startsWith('back_to_rss_')) {
        action = 'back_to_rss'
        newsId = callbackData.replace('back_to_rss_', '')
      } else if (callbackData.startsWith('upload_rss_image_')) {
        action = 'upload_rss_image'
        newsId = callbackData.replace('upload_rss_image_', '')
        // ═══ Creative Builder callbacks ═══
      } else if (callbackData.startsWith('cb_hub_')) {
        action = 'cb_hub'
        newsId = callbackData.replace('cb_hub_', '')
      } else if (callbackData.startsWith('cb_c_')) {
        action = 'cb_category'
        // Format: cb_c_XX_{uuid} (XX = category code like ST, CL, OB, AC, BG, FX, TX)
        const remainder = callbackData.substring(5) // remove "cb_c_"
        const catCode = remainder.substring(0, 2)
        newsId = remainder.substring(3) // skip "XX_"
        // Store category code in socialLanguage (reuse variable)
        socialLanguage = catCode
      } else if (callbackData.startsWith('cb_s_')) {
        action = 'cb_select'
        // Format: cb_s_XX_N_{uuid} (XX = category, N = option index)
        const remainder = callbackData.substring(5) // remove "cb_s_"
        const catCode = remainder.substring(0, 2)
        const rest = remainder.substring(3) // skip "XX_"
        const idxEnd = rest.indexOf('_')
        const optionIdx = rest.substring(0, idxEnd)
        newsId = rest.substring(idxEnd + 1)
        socialLanguage = catCode
        imageLanguage = optionIdx
      } else if (callbackData.startsWith('cb_gen_')) {
        action = 'cb_generate'
        newsId = callbackData.replace('cb_gen_', '')
      } else if (callbackData.startsWith('cb_rst_')) {
        action = 'cb_reset'
        newsId = callbackData.replace('cb_rst_', '')
      } else if (callbackData.startsWith('cb_lg_')) {
        action = 'cb_lang'
        // Format: cb_lg_LL_{uuid} (LL = ua, no, en)
        const remainder = callbackData.substring(6) // remove "cb_lg_"
        const lang = remainder.substring(0, 2)
        newsId = remainder.substring(3) // skip "LL_"
        imageLanguage = lang
      } else if (callbackData.startsWith('cb_go_')) {
        action = 'cb_go'
        // Format: cb_go_LL_{uuid} (LL = ua, no, en) — confirm prompt & generate image
        const remainder = callbackData.substring(6) // remove "cb_go_"
        const lang = remainder.substring(0, 2)
        newsId = remainder.substring(3) // skip "LL_"
        imageLanguage = lang
        // ═══ Gallery & Keep Original callbacks ═══
      } else if (callbackData.startsWith('keep_orig_')) {
        action = 'keep_orig'
        newsId = callbackData.replace('keep_orig_', '')
      } else if (callbackData.startsWith('add_more_')) {
        action = 'add_more'
        newsId = callbackData.replace('add_more_', '')
      } else if (callbackData.startsWith('gal_done_')) {
        action = 'gal_done'
        newsId = callbackData.replace('gal_done_', '')
        // ═══ Preset one-click publishing ═══
      } else if (callbackData.startsWith('pr_')) {
        action = 'preset'
        // Format: pr_VTL_<uuid> where V=variant(a,1-4), T=type(n,b), L=lang(e,n,u)
        const match = callbackData.match(/^pr_([a1-4])([nb])([enu])_(.+)$/)
        if (match) {
          socialLanguage = match[1]  // variant: 'a','1','2','3','4'
          publicationType = match[2] === 'n' ? 'news' : 'blog'
          imageLanguage = match[3]   // lang code: 'e','n','u'
          newsId = match[4]
        } else {
          newsId = callbackData.substring(3) // fallback
        }
      } else if (callbackData.startsWith('imm_')) {
        action = 'schedule_immediate'
        newsId = callbackData.replace('imm_', '')
      } else if (callbackData.startsWith('cs_')) {
        action = 'schedule_cancel'
        newsId = callbackData.replace('cs_', '')
      } else if (callbackData.startsWith('manual_')) {
        action = 'manual'
        newsId = callbackData.replace('manual_', '')
      } else {
        // Backward compatibility with old format "publish_<id>"
        const parts = callbackData.split('_')
        action = parts[0]
        newsId = parts[1]
        if (action === 'publish') {
          publicationType = 'news' // Default to news for old callbacks
        }
      }

      if (!newsId) {
        console.error('No news ID in callback data')
        return new Response(JSON.stringify({ ok: false }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      if (action === 'publish') {
        console.log(`Publishing as ${publicationType} with ID:`, newsId)

        // Lightweight validation
        const { data: news, error: fetchError } = await supabase
          .from('news')
          .select('id, is_published, is_rewritten, title_en, title_no, title_ua, rss_analysis')
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

        // 🛡️ DUPLICATE CHECK: Prevent republishing already published content
        if (news.is_published || news.is_rewritten) {
          console.log(`⚠️ News ${newsId} is already published, preventing duplicate`)

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: '⚠️ Ця новина вже опублікована!',
                show_alert: true
              })
            }
          )

          // Remove publish buttons, show only LinkedIn buttons if content exists
          const hasContent = news.title_en || news.title_no || news.title_ua
          const updatedKeyboard = hasContent ? {
            inline_keyboard: [
              [
                { text: '🔗 LinkedIn EN', callback_data: `linkedin_en_${newsId}` },
                { text: '🔗 LinkedIn NO', callback_data: `linkedin_no_${newsId}` },
                { text: '🔗 LinkedIn UA', callback_data: `linkedin_ua_${newsId}` }
              ]
            ]
          } : undefined

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: messageText + '\n\n⚠️ <b>ВЖЕ ОПУБЛІКОВАНО</b>',
                parse_mode: 'HTML',
                reply_markup: updatedKeyboard
              })
            }
          )

          return new Response(JSON.stringify({ ok: true, duplicate: true }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // ✅ Answer callback IMMEDIATELY
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '⏳ Обробляю...',
              show_alert: false
            })
          }
        )

        // Check linkedin_score from rss_analysis to decide if LinkedIn buttons should be shown
        const linkedinScore = news.rss_analysis?.linkedin_score || 0
        const showLinkedIn = linkedinScore >= 7

        // Count today's LinkedIn posts for daily limit info
        let todayLiCount = 0
        try {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const { count } = await supabase
            .from('social_media_posts')
            .select('id', { count: 'exact', head: true })
            .eq('platform', 'linkedin')
            .in('status', ['posted', 'pending'])
            .gte('created_at', today.toISOString())
          todayLiCount = count || 0
        } catch { /* ignore */ }

        const linkedinWarning = !showLinkedIn
          ? `\n⬇️ <i>LinkedIn: score ${linkedinScore}/10 (мін. 7) — не рекомендовано</i>`
          : todayLiCount >= 2
            ? `\n⚠️ <i>LinkedIn: вже ${todayLiCount} пости сьогодні (рекомендовано макс 2)</i>`
            : `\n🔥 <i>LinkedIn: score ${linkedinScore}/10 — рекомендовано!</i>`

        // Build social keyboard with conditional LinkedIn
        const socialRows: any[][] = []

        if (showLinkedIn) {
          socialRows.push([
            { text: '🌐 Все EN', callback_data: `all_en_${newsId}` },
            { text: '🌐 Все NO', callback_data: `all_no_${newsId}` },
            { text: '🌐 Все UA', callback_data: `all_ua_${newsId}` }
          ])
          socialRows.push([
            { text: '🔗+📘+📸 EN', callback_data: `combo_li_fb_ig_en_${newsId}` },
            { text: '🔗+📘+📸 NO', callback_data: `combo_li_fb_ig_no_${newsId}` },
            { text: '🔗+📘+📸 UA', callback_data: `combo_li_fb_ig_ua_${newsId}` }
          ])
          socialRows.push([
            { text: '🔗 LinkedIn EN', callback_data: `linkedin_en_${newsId}` },
            { text: '🔗 LinkedIn NO', callback_data: `linkedin_no_${newsId}` },
            { text: '🔗 LinkedIn UA', callback_data: `linkedin_ua_${newsId}` }
          ])
        }

        socialRows.push([
          { text: '📘 Facebook EN', callback_data: `facebook_en_${newsId}` },
          { text: '📘 Facebook NO', callback_data: `facebook_no_${newsId}` },
          { text: '📘 Facebook UA', callback_data: `facebook_ua_${newsId}` }
        ])
        socialRows.push([
          { text: '📸 Instagram EN', callback_data: `instagram_en_${newsId}` },
          { text: '📸 Instagram NO', callback_data: `instagram_no_${newsId}` },
          { text: '📸 Instagram UA', callback_data: `instagram_ua_${newsId}` }
        ])
        socialRows.push([
          { text: '🐦 Twitter EN', callback_data: `twitter_en_${newsId}` },
          { text: '🐦 Twitter NO', callback_data: `twitter_no_${newsId}` },
          { text: '🐦 Twitter UA', callback_data: `twitter_ua_${newsId}` }
        ])

        // If LinkedIn not shown, add manual override button
        if (!showLinkedIn) {
          socialRows.push([
            { text: '🔗 LinkedIn (override)', callback_data: `linkedin_en_${newsId}` },
            { text: '⏭️ Skip', callback_data: `skip_social_${newsId}` }
          ])
        } else {
          socialRows.push([
            { text: '🎵 TikTok', callback_data: `tiktok_${newsId}` },
            { text: '⏭️ Skip', callback_data: `skip_social_${newsId}` }
          ])
        }

        const socialKeyboard = { inline_keyboard: socialRows }

        const typeLabel = publicationType === 'blog' ? 'блог' : 'новину'
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: truncateForTelegram(messageText, `\n\n⏳ <b>AI рерайт ${typeLabel} EN/NO/UA у фоні...</b>${linkedinWarning}\n📱 <i>Можете вже обирати соцмережі:</i>`),
              parse_mode: 'HTML',
              reply_markup: socialKeyboard
            })
          }
        )

        // 🚀 Dispatch to background worker (fire-and-forget)
        dispatchToWorker({
          action: 'publish',
          params: { newsId, publicationType },
          telegram: { chatId, messageId, messageText }
        })

      } else if (action === 'publish_rss') {
        // =================================================================
        // 📰 RSS Article Publishing Handler (Summary-style) - ASYNC
        // =================================================================
        console.log(`Publishing RSS article as ${publicationType} with ID:`, newsId)

        // Lightweight validation
        const { data: news, error: fetchError } = await supabase
          .from('news')
          .select('id, is_published, is_rewritten, rss_analysis')
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

        // Prevent duplicate publishing
        if (news.is_published || news.is_rewritten) {
          console.log(`⚠️ RSS News ${newsId} is already published, preventing duplicate`)

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: '⚠️ Ця новина вже опублікована!',
                show_alert: true
              })
            }
          )

          return new Response(JSON.stringify({ ok: true, duplicate: true }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // ✅ Answer callback IMMEDIATELY
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '⏳ Обробляю RSS...',
              show_alert: false
            })
          }
        )

        // Check linkedin_score for RSS articles
        const rssLinkedinScore = news.rss_analysis?.linkedin_score || 0
        const rssShowLinkedIn = rssLinkedinScore >= 7

        let rssLiCount = 0
        try {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const { count } = await supabase
            .from('social_media_posts')
            .select('id', { count: 'exact', head: true })
            .eq('platform', 'linkedin')
            .in('status', ['posted', 'pending'])
            .gte('created_at', today.toISOString())
          rssLiCount = count || 0
        } catch { /* ignore */ }

        const rssLinkedinWarning = !rssShowLinkedIn
          ? `\n⬇️ <i>LinkedIn: score ${rssLinkedinScore}/10 (мін. 7) — не рекомендовано</i>`
          : rssLiCount >= 2
            ? `\n⚠️ <i>LinkedIn: вже ${rssLiCount} пости сьогодні (рекомендовано макс 2)</i>`
            : `\n🔥 <i>LinkedIn: score ${rssLinkedinScore}/10 — рекомендовано!</i>`

        // Build RSS social keyboard with conditional LinkedIn
        const rssRows: any[][] = []

        if (rssShowLinkedIn) {
          rssRows.push([
            { text: '🌐 Все EN', callback_data: `all_en_${newsId}` },
            { text: '🌐 Все NO', callback_data: `all_no_${newsId}` },
            { text: '🌐 Все UA', callback_data: `all_ua_${newsId}` }
          ])
          rssRows.push([
            { text: '🔗+📘+📸 EN', callback_data: `combo_li_fb_ig_en_${newsId}` },
            { text: '🔗+📘+📸 NO', callback_data: `combo_li_fb_ig_no_${newsId}` },
            { text: '🔗+📘+📸 UA', callback_data: `combo_li_fb_ig_ua_${newsId}` }
          ])
          rssRows.push([
            { text: '🔗 LinkedIn EN', callback_data: `linkedin_en_${newsId}` },
            { text: '🔗 LinkedIn NO', callback_data: `linkedin_no_${newsId}` },
            { text: '🔗 LinkedIn UA', callback_data: `linkedin_ua_${newsId}` }
          ])
        }

        rssRows.push([
          { text: '📘 Facebook EN', callback_data: `facebook_en_${newsId}` },
          { text: '📘 Facebook NO', callback_data: `facebook_no_${newsId}` },
          { text: '📘 Facebook UA', callback_data: `facebook_ua_${newsId}` }
        ])
        rssRows.push([
          { text: '📸 Instagram EN', callback_data: `instagram_en_${newsId}` },
          { text: '📸 Instagram NO', callback_data: `instagram_no_${newsId}` },
          { text: '📸 Instagram UA', callback_data: `instagram_ua_${newsId}` }
        ])

        if (!rssShowLinkedIn) {
          rssRows.push([
            { text: '🔗 LinkedIn (override)', callback_data: `linkedin_en_${newsId}` },
            { text: '⏭️ Skip', callback_data: `skip_social_${newsId}` }
          ])
        } else {
          rssRows.push([
            { text: '⏭️ Skip', callback_data: `skip_social_${newsId}` }
          ])
        }

        const rssSocialKeyboard = { inline_keyboard: rssRows }

        const rssTypeLabel = publicationType === 'blog' ? 'блог' : 'новину'
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: truncateForTelegram(messageText, `\n\n⏳ <b>AI рерайт RSS ${rssTypeLabel} EN/NO/UA у фоні...</b>${rssLinkedinWarning}\n📱 <i>Можете вже обирати соцмережі:</i>`),
              parse_mode: 'HTML',
              reply_markup: rssSocialKeyboard
            })
          }
        )

        // 🚀 Dispatch to background worker
        dispatchToWorker({
          action: 'publish_rss',
          params: { newsId, publicationType },
          telegram: { chatId, messageId, messageText }
        })

      } else if (action === 'linkedin' && linkedinLanguage) {
        // =================================================================
        // 🔗 LinkedIn Posting Handler → DISPATCH TO WORKER
        // =================================================================
        console.log(`[async] Dispatching LinkedIn (${linkedinLanguage}) to worker for news:`, newsId)

        // Answer callback immediately
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: '⏳ Публікуємо в LinkedIn...', show_alert: false })
        })

        // Show processing state
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: messageText + `\n\n⏳ <b>Публікуємо в LinkedIn (${linkedinLanguage.toUpperCase()})...</b>`,
            parse_mode: 'HTML', disable_web_page_preview: true
          })
        })

        // Dispatch to worker
        dispatchToWorker({
          action: 'linkedin',
          params: { newsId, linkedinLanguage },
          telegram: { chatId, messageId, messageText }
        })

      } else if (action === 'social_post' && socialPlatform && socialLanguage) {
        // =================================================================
        // 📱 Facebook/Instagram Posting Handler → DISPATCH TO WORKER
        // =================================================================
        console.log(`[async] Dispatching ${socialPlatform} (${socialLanguage}) to worker for news:`, newsId)

        const platformEmoji = socialPlatform === 'facebook' ? '📘' : '📸'
        const platformName = socialPlatform.charAt(0).toUpperCase() + socialPlatform.slice(1)

        // Answer callback immediately
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: `⏳ Публікуємо в ${platformName}...`, show_alert: false })
        })

        // Show processing state
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: messageText + `\n\n⏳ <b>${platformEmoji} Публікуємо в ${platformName} (${socialLanguage.toUpperCase()})...</b>`,
            parse_mode: 'HTML', disable_web_page_preview: true
          })
        })

        // Dispatch to worker
        dispatchToWorker({
          action: 'social_post',
          params: { newsId, socialPlatform, socialLanguage },
          telegram: { chatId, messageId, messageText }
        })

      } else if (action === 'tiktok') {
        // =================================================================
        // 🎵 TikTok Content Generation → DISPATCH TO WORKER
        // =================================================================
        console.log(`[async] Dispatching TikTok to worker for news:`, newsId)

        // Answer callback immediately
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: '🎵 Generating TikTok content...', show_alert: false })
        })

        // Show processing state
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: messageText + '\n\n⏳ <b>🎵 Генерація TikTok контенту...</b>',
            parse_mode: 'HTML'
          })
        })

        // Dispatch to worker
        dispatchToWorker({
          action: 'tiktok',
          params: { newsId, chatId: chatId.toString() },
          telegram: { chatId, messageId, messageText }
        })

      } else if (action === 'twitter' && socialPlatform === 'twitter' && socialLanguage) {
        // =================================================================
        // 🐦 Twitter Share Intent Handler (with AI teaser)
        // =================================================================
        console.log(`Generating Twitter Share Intent (${socialLanguage}) for news:`, newsId)

        // Fetch news data including content for teaser generation
        const { data: news, error: fetchError } = await supabase
          .from('news')
          .select(`title_en, title_no, title_ua, slug_en, slug_no, slug_ua,
                   content_en, content_no, content_ua,
                   social_teaser_twitter_en, social_teaser_twitter_no, social_teaser_twitter_ua`)
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

        // Check if has blog post FIRST (before validation)
        const { data: blogPost } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('source_news_id', newsId)
          .single()

        const contentType = blogPost ? 'blog' : 'news'
        const checkRecord = blogPost || news

        // Check if content is published
        const titleField = `title_${socialLanguage}` as keyof typeof checkRecord
        const slugField = `slug_${socialLanguage}` as keyof typeof checkRecord
        const contentField = `content_${socialLanguage}` as keyof typeof checkRecord
        const teaserField = `social_teaser_twitter_${socialLanguage}` as keyof typeof checkRecord

        if (!checkRecord[titleField]) {
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: '❌ Content not published yet. Publish to News/Blog first!',
                show_alert: true
              })
            }
          )
          return new Response(JSON.stringify({ ok: false }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // Get title, content, and slug in the appropriate language
        const title = checkRecord[titleField] as string
        const content = (checkRecord[contentField] || '') as string
        const slug = (checkRecord[slugField] || checkRecord.slug_en || newsId.substring(0, 8)) as string
        const articleUrl = `https://vitalii.no/${contentType === 'blog' ? 'blog' : 'news'}/${slug}`

        // Check for cached teaser or generate new one
        let tweetText = checkRecord[teaserField] as string | null

        if (!tweetText) {
          console.log('🎯 No cached Twitter teaser, generating...')
          try {
            const teaserResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-social-teasers`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                newsId,
                title,
                content,
                contentType: 'news',
                platform: 'twitter',
                language: socialLanguage
              })
            })

            if (teaserResponse.ok) {
              const teaserResult = await teaserResponse.json()
              if (teaserResult.success && teaserResult.teaser) {
                tweetText = teaserResult.teaser
                console.log('✅ Twitter teaser generated:', tweetText.substring(0, 50))
              }
            }
          } catch (e) {
            console.warn('⚠️ Teaser generation failed, using title fallback')
          }
        } else {
          console.log('✅ Using cached Twitter teaser')
        }

        // Fallback to title if no teaser
        if (!tweetText) {
          tweetText = title
        }

        // Twitter has 280 character limit - account for URL and spacing
        // t.co wraps URLs to 23 chars, so max text = 280 - 23 - 2 (space + space) = 255 chars
        const maxTextLength = 255
        if (tweetText.length > maxTextLength) {
          tweetText = tweetText.substring(0, maxTextLength - 3) + '...'
        }

        // Generate Twitter Share Intent URL
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(articleUrl)}`

        // Answer callback
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '🐦 Twitter link generated!',
              show_alert: false
            })
          }
        )

        // Send message with clickable link (separate message for better UX)
        const langLabel = socialLanguage.toUpperCase()
        const shortTitle = title.length > 50 ? title.substring(0, 47) + '...' : title

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `🐦 <b>Twitter Share Ready (${langLabel})!</b>\n\n` +
                `📝 «${shortTitle}»\n\n` +
                `👉 <a href="${twitterIntentUrl}">Натисніть щоб опублікувати в Twitter</a>\n\n` +
                `<i>Відкриється Twitter з готовим текстом. Натисніть "Post" для публікації.</i>`,
              parse_mode: 'HTML',
              disable_web_page_preview: true
            })
          }
        )

        // Update original message to show Twitter was used
        const allLanguages = ['en', 'no', 'ua']
        const remainingLanguages = allLanguages.filter(lang => lang !== socialLanguage)

        // Build remaining Twitter buttons
        const remainingTwitterButtons = remainingLanguages.map(lang => ({
          text: `🐦 Twitter ${lang.toUpperCase()}`,
          callback_data: `twitter_${lang}_${newsId}`
        }))

        // Build remaining buttons (TikTok, Skip)
        const buttonRows = []
        if (remainingTwitterButtons.length > 0) {
          buttonRows.push(remainingTwitterButtons)
        }
        buttonRows.push([
          { text: '🎵 TikTok', callback_data: `tiktok_${newsId}` },
          { text: '⏭️ Skip', callback_data: `skip_social_${newsId}` }
        ])

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + `\n\n🐦 <b>Twitter (${langLabel}) link sent!</b>`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: buttonRows
              }
            })
          }
        )

      } else if (action === 'post_all' && socialLanguage) {
        // =================================================================
        // 🌐 Post to ALL socials → DISPATCH TO WORKER (parallel)
        // =================================================================
        const langLabel = socialLanguage.toUpperCase()
        console.log(`[async] Dispatching post_all (${langLabel}) to worker for news:`, newsId)

        // Answer callback immediately
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: `🌐 Публікуємо у всі соцмережі (${langLabel})...`, show_alert: false })
        })

        // Show processing state
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: messageText + `\n\n⏳ <b>🌐 Публікуємо у всі соцмережі (${langLabel})...</b>\n<i>LinkedIn + Facebook + Instagram + Twitter</i>`,
            parse_mode: 'HTML', disable_web_page_preview: true
          })
        })

        // Dispatch to worker (will use Promise.allSettled for parallel posting)
        dispatchToWorker({
          action: 'post_all',
          params: { newsId, socialLanguage },
          telegram: { chatId, messageId, messageText }
        })

      } else if (action === 'combo_li_fb_en') {
        // =================================================================
        // 🔗📘 Combo: LinkedIn EN + Facebook EN → DISPATCH TO WORKER
        // =================================================================
        console.log(`[async] Dispatching combo_li_fb_en to worker for news:`, newsId)

        // Answer callback immediately
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: '🔗📘 Публікуємо LinkedIn + Facebook EN...', show_alert: false })
        })

        // Show processing state with remaining buttons
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: messageText + '\n\n⏳ <b>Публікуємо LinkedIn + Facebook EN...</b>',
            parse_mode: 'HTML', disable_web_page_preview: true,
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🌐 Все UA', callback_data: `all_ua_${newsId}` },
                  { text: '🌐 Все NO', callback_data: `all_no_${newsId}` }
                ],
                [
                  { text: '🐦 Twitter EN', callback_data: `twitter_en_${newsId}` },
                  { text: '📸 Instagram EN', callback_data: `instagram_en_${newsId}` }
                ],
                [
                  { text: '🎵 TikTok', callback_data: `tiktok_${newsId}` },
                  { text: '⏭️ Skip', callback_data: `skip_social_${newsId}` }
                ]
              ]
            }
          })
        })

        // Dispatch to worker (will use Promise.allSettled for parallel posting)
        dispatchToWorker({
          action: 'combo_li_fb_en',
          params: { newsId },
          telegram: { chatId, messageId, messageText }
        })

      } else if (action === 'combo_li_fb_ig' && socialLanguage) {
        // =================================================================
        // 🔗📘📸 Combo: LinkedIn + Facebook + Instagram → DISPATCH TO WORKER
        // =================================================================
        const langLabel = socialLanguage.toUpperCase()
        console.log(`[async] Dispatching combo_li_fb_ig (${langLabel}) to worker for news:`, newsId)

        // Answer callback immediately
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: `🔗📘📸 Публікуємо LI+FB+IG ${langLabel}...`, show_alert: false })
        })

        // Processing buttons (exclude the current language)
        const remainingLangs = ['en', 'no', 'ua'].filter(l => l !== socialLanguage)

        // Show processing state with remaining buttons
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: messageText + `\n\n⏳ <b>Публікуємо LinkedIn + Facebook + Instagram ${langLabel}...</b>`,
            parse_mode: 'HTML', disable_web_page_preview: true,
            reply_markup: {
              inline_keyboard: [
                remainingLangs.map(l => ({
                  text: `🌐 Все ${l.toUpperCase()}`,
                  callback_data: `all_${l}_${newsId}`
                })),
                [
                  { text: `🐦 Twitter ${langLabel}`, callback_data: `twitter_${socialLanguage}_${newsId}` }
                ],
                [
                  { text: '🎵 TikTok', callback_data: `tiktok_${newsId}` },
                  { text: '⏭️ Skip', callback_data: `skip_social_${newsId}` }
                ]
              ]
            }
          })
        })

        // Dispatch to worker (will use Promise.allSettled for parallel posting)
        dispatchToWorker({
          action: 'combo_li_fb_ig',
          params: { newsId, socialLanguage },
          telegram: { chatId, messageId, messageText }
        })

      } else if (action === 'skip_social') {
        // =================================================================
        // ⏭️ Skip remaining social platforms
        // =================================================================
        console.log('User skipped remaining social platforms for news:', newsId)

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '✅ Social posting completed',
              show_alert: false
            })
          }
        )

        // Remove all buttons
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + '\n\n✅ <b>Social posting completed</b>',
              parse_mode: 'HTML'
            })
          }
        )

      } else if (callbackData.startsWith('confirm_image_')) {
        // =================================================================
        // ✅ STEP 1→2: Confirm image (existing or no image) → Show publish buttons
        // =================================================================
        const newsId = callbackData.replace('confirm_image_', '')
        console.log('User confirmed image for news:', newsId)

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '✅ Зображення підтверджено',
              show_alert: false
            })
          }
        )

        // Update message with pool keyboard (6 buttons + reject)
        const newKeyboard = buildPoolKeyboard(newsId)

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              reply_markup: newKeyboard
            })
          }
        )

        // Also update message text to show progress
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + '\n\n✅ <b>Зображення підтверджено</b>\n📝 <i>Оберіть де опублікувати...</i>',
              parse_mode: 'HTML',
              reply_markup: newKeyboard
            })
          }
        )

      } else if (callbackData.startsWith('create_custom_')) {
        // =================================================================
        // 📸 STEP 1→Upload: Initiate custom image upload
        // =================================================================
        const newsId = callbackData.replace('create_custom_', '')
        console.log('User wants to upload custom image for news:', newsId)

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '📸 Відправте фото у відповідь на це повідомлення',
              show_alert: true
            })
          }
        )

        // Edit message to show we're waiting for photo
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + `\n\n📸 <b>Очікую фото...</b>\n<i>Reply to this message with your photo</i>\n<code>newsId:${newsId}</code>`,
              parse_mode: 'HTML'
            })
          }
        )

      } else if (callbackData.startsWith('regenerate_image_')) {
        // =================================================================
        // 🔄 REGENERATE IMAGE: Redirect to variant selection
        // =================================================================
        const newsId = callbackData.replace('regenerate_image_', '')
        console.log('User wants to regenerate Telegram image for news:', newsId, '- redirecting to variant selection')

        // Check if variants exist in DB
        const { data: newsCheck } = await supabase
          .from('news')
          .select('id, image_prompt_variants')
          .eq('id', newsId)
          .single()

        const existingVariants = newsCheck?.image_prompt_variants as Array<{ label: string, description: string }> | null

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: existingVariants ? '🎨 Оберіть концепцію зображення' : '🔄 Генерація варіантів...',
              show_alert: false
            })
          }
        )

        if (existingVariants && existingVariants.length > 0) {
          // Show existing variants
          let variantsText = '\n\n🎨 Оберіть концепцію:' + formatCompactVariants(existingVariants, escapeHtml)

          const variantKeyboard = {
            inline_keyboard: [
              [
                { text: '1️⃣', callback_data: `select_variant_1_${newsId}` },
                { text: '2️⃣', callback_data: `select_variant_2_${newsId}` },
                { text: '3️⃣', callback_data: `select_variant_3_${newsId}` },
                { text: '4️⃣', callback_data: `select_variant_4_${newsId}` }
              ],
              [
                { text: '🔄 Нові варіанти', callback_data: `new_variants_${newsId}` },
                { text: '🎨 Creative Builder', callback_data: `cb_hub_${newsId}` }
              ],
              [
                { text: '📸 Завантажити своє', callback_data: `create_custom_${newsId}` },
                { text: '❌ Reject', callback_data: `reject_${newsId}` }
              ]
            ]
          }

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: truncateForTelegram(messageText, variantsText),
                parse_mode: 'HTML',
                reply_markup: variantKeyboard
              })
            }
          )
        } else {
          // No variants — show generate button
          const genKeyboard = {
            inline_keyboard: [
              [
                { text: '🎨 Згенерувати варіанти', callback_data: `new_variants_${newsId}` }
              ],
              [
                { text: '📸 Завантажити своє', callback_data: `create_custom_${newsId}` }
              ],
              [
                { text: '❌ Reject', callback_data: `reject_${newsId}` }
              ]
            ]
          }

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: truncateForTelegram(messageText, '\n\n🎨 <b>Варіанти не знайдені</b>\n<i>Натисніть для генерації...</i>'),
                parse_mode: 'HTML',
                reply_markup: genKeyboard
              })
            }
          )
        }

      } else if (action === 'keep' && callbackData.startsWith('keep_image_')) {
        // =================================================================
        // 🖼️ Keep existing image handler (OLD - kept for backward compatibility)
        // =================================================================
        console.log('User chose to keep existing image for news:', newsId)

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '✅ Поточне зображення збережено',
              show_alert: false
            })
          }
        )

        // Update message to show image was kept
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + '\n\n🖼️ <b>Зображення залишено (поточне)</b>',
              parse_mode: 'HTML'
            })
          }
        )

      } else if (action === 'upload' && callbackData.startsWith('upload_image_')) {
        // =================================================================
        // 📸 Upload custom image handler
        // =================================================================
        console.log('User wants to upload custom image for news:', newsId)

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '📸 Відправте фото у відповідь на це повідомлення',
              show_alert: true
            })
          }
        )

        // Edit message to show we're waiting for photo
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + `\n\n📸 <b>Очікую фото...</b>\n<i>Reply to this message with your photo</i>\n<code>newsId:${newsId}</code>`,
              parse_mode: 'HTML'
            })
          }
        )

        // =================================================================
        // 🖼 KEEP ORIGINAL & GALLERY MANAGEMENT
        // =================================================================

      } else if (action === 'keep_orig') {
        // 🖼 Keep original image(s) from RSS/Telegram source
        console.log('🖼 Keep original images for news:', newsId)

        const { data: newsRecord } = await supabase
          .from('news')
          .select('id, image_url, images, rss_analysis')
          .eq('id', newsId)
          .single()

        const isRssSource = !!(newsRecord?.rss_analysis)
        const originalImages: string[] = newsRecord?.images || []
        const imageUrl = newsRecord?.image_url
        const primaryImage = imageUrl || (originalImages.length > 0 ? originalImages[0] : null)

        if (!primaryImage) {
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: '⚠️ Оригінальне зображення не знайдено',
                show_alert: true
              })
            }
          )
          return new Response(JSON.stringify({ ok: true }))
        }

        // Set processed_image_url and ensure images[] is populated
        const updateData: Record<string, any> = {
          processed_image_url: primaryImage,
          image_processed_at: new Date().toISOString()
        }
        if (!originalImages.length && imageUrl) {
          updateData.images = [imageUrl]
        }
        await supabase.from('news').update(updateData).eq('id', newsId)

        const imageCount = originalImages.length || 1

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: `✅ Оригінал збережено (${imageCount} фото)`,
              show_alert: false
            })
          }
        )

        const galleryKeyboard = {
          inline_keyboard: [
            [
              { text: `✅ Готово (${imageCount} фото)`, callback_data: `gal_done_${newsId}` },
              { text: '➕ + AI зображення', callback_data: `add_more_${newsId}` }
            ],
            [
              { text: '📸 Завантажити своє', callback_data: isRssSource ? `upload_rss_image_${newsId}` : `create_custom_${newsId}` }
            ],
            [
              { text: '❌ Skip', callback_data: `reject_${newsId}` }
            ]
          ]
        }

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: truncateForTelegram(messageText, `\n\n🖼 <b>Оригінал збережено!</b> Галерея: ${imageCount} фото\n<i>Можете додати AI зображення або завантажити своє</i>`),
              parse_mode: 'HTML',
              reply_markup: galleryKeyboard
            })
          }
        )

      } else if (action === 'gal_done') {
        // ✅ Gallery finalized → show publish buttons
        console.log('✅ Gallery done for news:', newsId)

        const { data: newsRecord } = await supabase
          .from('news')
          .select('id, images, rss_analysis')
          .eq('id', newsId)
          .single()

        const isRssSource = !!(newsRecord?.rss_analysis)
        const imageCount = newsRecord?.images?.length || 0

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: `✅ Галерея готова (${imageCount} фото)`,
              show_alert: false
            })
          }
        )

        const publishKeyboard = buildPoolKeyboard(newsId)

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: truncateForTelegram(messageText, `\n\n✅ <b>Галерея готова!</b> ${imageCount} фото\n📝 <i>Оберіть де опублікувати...</i>`),
              parse_mode: 'HTML',
              reply_markup: publishKeyboard
            })
          }
        )

      } else if (action === 'add_more') {
        // ➕ Add more images → redirect to variant selection (same as back_to_variants)
        console.log('➕ Add more images for news:', newsId)

        const { data: newsRecord } = await supabase
          .from('news')
          .select('id, image_prompt_variants, images, rss_analysis')
          .eq('id', newsId)
          .single()

        const isRssSource = !!(newsRecord?.rss_analysis)
        const currentImages: string[] = newsRecord?.images || []
        const existingVariants = newsRecord?.image_prompt_variants as Array<{ label: string, description: string }> | null

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: `➕ Додати зображення (зараз: ${currentImages.length})`,
              show_alert: false
            })
          }
        )

        if (existingVariants && existingVariants.length > 0) {
          let variantsText = `\n\n🎨 Додайте зображення (в галереї: ${currentImages.length})` + formatCompactVariants(existingVariants, escapeHtml)

          const variantKeyboard = {
            inline_keyboard: [
              [
                { text: '1️⃣', callback_data: `select_variant_1_${newsId}` },
                { text: '2️⃣', callback_data: `select_variant_2_${newsId}` },
                { text: '3️⃣', callback_data: `select_variant_3_${newsId}` },
                { text: '4️⃣', callback_data: `select_variant_4_${newsId}` }
              ],
              [
                { text: '🔄 Нові варіанти', callback_data: `new_variants_${newsId}` },
                { text: '🎨 Creative Builder', callback_data: `cb_hub_${newsId}` }
              ],
              [
                { text: `✅ Готово (${currentImages.length})`, callback_data: `gal_done_${newsId}` },
                { text: '📸 Завантажити', callback_data: isRssSource ? `upload_rss_image_${newsId}` : `create_custom_${newsId}` }
              ],
              [
                { text: '❌ Skip', callback_data: `reject_${newsId}` }
              ]
            ]
          }

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: truncateForTelegram(messageText, variantsText),
                parse_mode: 'HTML',
                reply_markup: variantKeyboard
              })
            }
          )
        } else {
          const genKeyboard = {
            inline_keyboard: [
              [
                { text: '🎲 Згенерувати варіанти', callback_data: `new_variants_${newsId}` },
                { text: '🎨 Creative Builder', callback_data: `cb_hub_${newsId}` }
              ],
              [
                { text: `✅ Готово (${currentImages.length})`, callback_data: `gal_done_${newsId}` },
                { text: '📸 Завантажити', callback_data: isRssSource ? `upload_rss_image_${newsId}` : `create_custom_${newsId}` }
              ],
              [
                { text: '❌ Skip', callback_data: `reject_${newsId}` }
              ]
            ]
          }

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: truncateForTelegram(messageText, `\n\n➕ <b>Додайте зображення</b> (в галереї: ${currentImages.length} фото)`),
                parse_mode: 'HTML',
                reply_markup: genKeyboard
              })
            }
          )
        }

        // =================================================================
        // 🔄 RSS IMAGE WORKFLOW: confirm_rss_image, regenerate_rss_image, upload_rss_image
        // =================================================================

      } else if (action === 'confirm_rss_image') {
        // ✅ RSS: Confirm existing image → set processed_image_url → Show publish buttons
        console.log('User confirmed RSS image for news:', newsId)

        // Set processed_image_url to original image for SEO/social media
        const { data: newsRecord } = await supabase
          .from('news')
          .select('id, image_url, images')
          .eq('id', newsId)
          .single()

        if (newsRecord?.image_url) {
          const updateData: Record<string, any> = {
            processed_image_url: newsRecord.image_url,
            image_processed_at: new Date().toISOString()
          }
          if (!newsRecord.images?.length) {
            updateData.images = [newsRecord.image_url]
          }
          await supabase.from('news').update(updateData).eq('id', newsId)
        }

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '✅ Зображення підтверджено',
              show_alert: false
            })
          }
        )

        // Update message with pool keyboard
        const rssPublishKeyboard = buildPoolKeyboard(newsId)

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + '\n\n✅ <b>Зображення підтверджено</b>\n📝 <i>Оберіть де опублікувати...</i>',
              parse_mode: 'HTML',
              reply_markup: rssPublishKeyboard
            })
          }
        )

      } else if (action === 'regenerate_rss_image') {
        // 🔄 RSS: Redirect to variant selection
        console.log('User wants to regenerate RSS image for news:', newsId, '- redirecting to variant selection')

        // Validate newsId before creating buttons
        if (!newsId) {
          console.error('❌ CRITICAL: newsId is undefined when creating variant buttons!')
        }

        // Verify news record exists and get variants
        const { data: newsCheck, error: newsCheckError } = await supabase
          .from('news')
          .select('id, original_title, image_prompt_variants')
          .eq('id', newsId)
          .single()

        if (newsCheckError || !newsCheck) {
          console.error('❌ News record not found for regeneration:', newsId, newsCheckError?.message)

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: `❌ Помилка: новина не знайдена в базі даних`,
                show_alert: true
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
                text: messageText + `\n\n❌ <b>Помилка:</b> Новина не знайдена в базі даних.\n<code>${newsId}</code>\n\n<i>Можливо запис був видалений або не був створений.</i>`,
                parse_mode: 'HTML'
              })
            }
          )

          return new Response(JSON.stringify({ ok: true }))
        }

        console.log('✅ News record verified for regeneration:', newsCheck.id)

        const existingVariants = newsCheck.image_prompt_variants as Array<{ label: string, description: string }> | null

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: existingVariants ? '🎨 Оберіть концепцію зображення' : '🔄 Генерація варіантів...',
              show_alert: false
            })
          }
        )

        if (existingVariants && existingVariants.length > 0) {
          let variantsText = '\n\n🎨 Оберіть концепцію:' + formatCompactVariants(existingVariants, escapeHtml)

          const variantKeyboard = {
            inline_keyboard: [
              [
                { text: '1️⃣', callback_data: `select_variant_1_${newsId}` },
                { text: '2️⃣', callback_data: `select_variant_2_${newsId}` },
                { text: '3️⃣', callback_data: `select_variant_3_${newsId}` },
                { text: '4️⃣', callback_data: `select_variant_4_${newsId}` }
              ],
              [
                { text: '🔄 Нові варіанти', callback_data: `new_variants_${newsId}` },
                { text: '🎨 Creative Builder', callback_data: `cb_hub_${newsId}` }
              ],
              [
                { text: '📸 Завантажити своє', callback_data: `upload_rss_image_${newsId}` },
                { text: '❌ Skip', callback_data: `reject_${newsId}` }
              ]
            ]
          }

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: truncateForTelegram(messageText, variantsText),
                parse_mode: 'HTML',
                reply_markup: variantKeyboard
              })
            }
          )
        } else {
          // No variants — show generate button
          const genKeyboard = {
            inline_keyboard: [
              [
                { text: '🎨 Згенерувати варіанти', callback_data: `new_variants_${newsId}` }
              ],
              [
                { text: '📸 Завантажити своє', callback_data: `upload_rss_image_${newsId}` }
              ],
              [
                { text: '❌ Skip', callback_data: `reject_${newsId}` }
              ]
            ]
          }

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: truncateForTelegram(messageText, '\n\n🎨 <b>Варіанти не знайдені</b>\n<i>Натисніть для генерації...</i>'),
                parse_mode: 'HTML',
                reply_markup: genKeyboard
              })
            }
          )
        }

      } else if (action === 'regen_img_with_lang') {
        // 🔄 Generate new AI image with selected language (works for both RSS and Telegram)
        const selectedLang = imageLanguage || 'en'
        const langNames: Record<string, string> = { ua: 'українською', no: 'норвезькою', en: 'англійською' }
        console.log('User selected language for image:', selectedLang, 'for news:', newsId)

        // Verify news record exists and determine source type
        const { data: newsCheck, error: newsCheckError } = await supabase
          .from('news')
          .select('id, original_title, rss_analysis')
          .eq('id', newsId)
          .single()

        // Determine if this is RSS or Telegram source
        const isRssSource = !!(newsCheck?.rss_analysis)

        if (newsCheckError || !newsCheck) {
          console.error('❌ News record not found for regeneration:', newsId, newsCheckError?.message)

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: `❌ Помилка: новина не знайдена в базі даних (${newsId.substring(0, 8)}...)`,
                show_alert: true
              })
            }
          )

          // Update message to show error
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: messageText + `\n\n❌ <b>Помилка:</b> Новина не знайдена в базі даних.\n<code>${newsId}</code>\n\n<i>Можливо запис був видалений або не був створений.</i>`,
                parse_mode: 'HTML'
              })
            }
          )

          return new Response(JSON.stringify({ ok: true }))
        }

        console.log('✅ News record verified:', newsCheck.id, newsCheck.original_title?.substring(0, 50))

        // Get today's image generation count for provider info
        let todayImageCount = 0
        let activeProvider = 'Nano Banana Pro'
        try {
          const today = new Date().toISOString().split('T')[0]
          const { data: usageData } = await supabase
            .from('image_provider_usage')
            .select('provider_name, success_count')
            .eq('usage_date', today)
          if (usageData) {
            todayImageCount = usageData.reduce((sum: number, r: any) => sum + (r.success_count || 0), 0)
          }
        } catch (e) {
          console.log('⚠️ Could not fetch image count:', e)
        }
        const todayDateStr = new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })

        // Show "generating" message
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: `🎨 Генерую зображення (${activeProvider})...`,
              show_alert: false
            })
          }
        )

        // Update message to show progress with provider info
        const progressEditResponse = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: truncateForTelegram(messageText, `\n\n⏳ <b>Генерація зображення ${langNames[selectedLang] || selectedLang}...</b>\n🤖 Провайдер: <b>${activeProvider}</b>\n📊 Згенеровано сьогодні (${todayDateStr}): <b>${todayImageCount}</b> зображень\n<i>Це може зайняти до 30 секунд</i>`),
              parse_mode: 'HTML'
            })
          }
        )
        const progressEditResult = await progressEditResponse.json()
        if (!progressEditResult.ok) {
          console.error('❌ Failed to edit message (progress):', progressEditResult.description || progressEditResult)
        }

        // Clear existing processed images before regenerating (both formats)
        await supabase
          .from('news')
          .update({ processed_image_url: null, processed_image_url_wide: null })
          .eq('id', newsId)

        // Call process-image for BOTH aspect ratios (1:1 for Instagram, 16:9 for LinkedIn/Facebook)
        try {
          // Generate 1:1 (square) image first
          const imageGenResponse = await fetch(
            `${SUPABASE_URL}/functions/v1/process-image`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                newsId: newsId,
                generateFromPrompt: true,
                language: selectedLang,
                aspectRatio: '1:1'
              })
            }
          )

          const imageGenResult = await imageGenResponse.json()

          // Generate 16:9 (wide) image in parallel (don't wait for result to show first image)
          let wideImageUrl: string | null = null
          const wideImagePromise = fetch(
            `${SUPABASE_URL}/functions/v1/process-image`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                newsId: newsId,
                generateFromPrompt: true,
                language: selectedLang,
                aspectRatio: '16:9'
              })
            }
          ).then(res => res.json()).then(result => {
            if (result.success && result.processedImageUrl) {
              wideImageUrl = result.processedImageUrl
              console.log(`✅ Wide image (16:9) generated: ${wideImageUrl}`)
            } else {
              console.warn(`⚠️ Wide image (16:9) generation failed:`, result.error || 'unknown error')
            }
            return result
          }).catch(err => {
            console.error(`❌ Wide image (16:9) generation error:`, err)
            return null
          })

          if (imageGenResult.success && imageGenResult.processedImageUrl) {
            // Wait for wide image to complete before showing result
            await wideImagePromise

            // Extract provider name from response
            const providerUsed = imageGenResult.provider || imageGenResult.debug?.provider || 'AI'

            // Success! Show both images with appropriate buttons based on source type
            const newImageUrl = imageGenResult.processedImageUrl

            // Append generated image to gallery
            const { data: galNews } = await supabase.from('news').select('images').eq('id', newsId).single()
            const galImages: string[] = galNews?.images || []
            if (!galImages.includes(newImageUrl)) {
              await supabase.from('news').update({ images: [...galImages, newImageUrl] }).eq('id', newsId)
            }
            const galleryCount = galImages.includes(newImageUrl) ? galImages.length : galImages.length + 1

            // Use different callbacks for RSS vs Telegram sources
            const newKeyboard = isRssSource ? {
              inline_keyboard: [
                [
                  { text: `✅ Готово (${galleryCount} фото)`, callback_data: `gal_done_${newsId}` },
                  { text: '➕ Ще', callback_data: `add_more_${newsId}` }
                ],
                [
                  { text: '🖼 + Оригінал', callback_data: `keep_orig_${newsId}` },
                  { text: '📸 Завантажити', callback_data: `upload_rss_image_${newsId}` }
                ],
                [
                  { text: '❌ Skip', callback_data: `reject_${newsId}` }
                ]
              ]
            } : {
              inline_keyboard: [
                [
                  { text: `✅ Готово (${galleryCount} фото)`, callback_data: `gal_done_${newsId}` },
                  { text: '➕ Ще', callback_data: `add_more_${newsId}` }
                ],
                [
                  { text: '🖼 + Оригінал', callback_data: `keep_orig_${newsId}` },
                  { text: '📸 Завантажити', callback_data: `create_custom_${newsId}` }
                ],
                [
                  { text: '❌ Reject', callback_data: `reject_${newsId}` }
                ]
              ]
            }

            // Build message with both image links
            const squareImageLink = `🖼️ <b>1:1</b> (Instagram): ${escapeHtml(newImageUrl)}`
            const wideImageLink = wideImageUrl
              ? `\n📐 <b>16:9</b> (LinkedIn/FB): ${escapeHtml(wideImageUrl)}`
              : '\n📐 <b>16:9</b>: ⚠️ не вдалося згенерувати'

            const successEditResponse = await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  message_id: messageId,
                  text: truncateForTelegram(messageText, `\n\n✅ <b>Зображення згенеровано (${selectedLang.toUpperCase()})!</b>\n🤖 <i>${providerUsed}</i>\n${squareImageLink}${wideImageLink}`),
                  parse_mode: 'HTML',
                  reply_markup: newKeyboard
                })
              }
            )
            const successEditResult = await successEditResponse.json()
            if (!successEditResult.ok) {
              console.error('❌ Failed to edit message (success):', successEditResult.description || successEditResult)
            }
          } else {
            // Failed - show error and keep regenerate button (appropriate for source type)
            const errorMsg = imageGenResult.error || 'Невідома помилка'
            const debugInfo = imageGenResult.debug
              ? `\n\n🔍 <b>Debug:</b> v${imageGenResult.debug.version}, ${imageGenResult.debug.lastApiError || 'no details'}`
              : ''

            const newKeyboard = isRssSource ? {
              inline_keyboard: [
                [
                  { text: '🔄 Спробувати ще раз', callback_data: `regenerate_rss_image_${newsId}` }
                ],
                [
                  { text: '📸 Завантажити своє', callback_data: `upload_rss_image_${newsId}` }
                ],
                [
                  { text: '❌ Skip', callback_data: `reject_${newsId}` }
                ]
              ]
            } : {
              inline_keyboard: [
                [
                  { text: '🔄 Спробувати ще раз', callback_data: `regenerate_image_${newsId}` }
                ],
                [
                  { text: '📸 Завантажити своє', callback_data: `create_custom_${newsId}` }
                ],
                [
                  { text: '❌ Reject', callback_data: `reject_${newsId}` }
                ]
              ]
            }

            const errorEditResponse = await fetch(
              `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  message_id: messageId,
                  text: truncateForTelegram(messageText, `\n\n❌ <b>Помилка генерації:</b> ${errorMsg}${debugInfo}\n\n<i>Спробуйте ще раз або завантажте своє зображення</i>`),
                  parse_mode: 'HTML',
                  reply_markup: newKeyboard
                })
              }
            )
            const errorEditResult = await errorEditResponse.json()
            if (!errorEditResult.ok) {
              console.error('❌ Failed to edit message (gen error):', errorEditResult.description || errorEditResult)
            }
          }
        } catch (genError: any) {
          console.error('Error regenerating image:', genError)

          const newKeyboard = isRssSource ? {
            inline_keyboard: [
              [
                { text: '🔄 Спробувати ще раз', callback_data: `regenerate_rss_image_${newsId}` }
              ],
              [
                { text: '📸 Завантажити своє', callback_data: `upload_rss_image_${newsId}` }
              ],
              [
                { text: '❌ Skip', callback_data: `reject_${newsId}` }
              ]
            ]
          } : {
            inline_keyboard: [
              [
                { text: '🔄 Спробувати ще раз', callback_data: `regenerate_image_${newsId}` }
              ],
              [
                { text: '📸 Завантажити своє', callback_data: `create_custom_${newsId}` }
              ],
              [
                { text: '❌ Reject', callback_data: `reject_${newsId}` }
              ]
            ]
          }

          const catchEditResponse = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: truncateForTelegram(messageText, `\n\n❌ <b>Помилка:</b> ${genError.message}\n\n<i>Спробуйте ще раз або завантажте своє зображення</i>`),
                parse_mode: 'HTML',
                reply_markup: newKeyboard
              })
            }
          )
          const catchEditResult = await catchEditResponse.json()
          if (!catchEditResult.ok) {
            console.error('❌ Failed to edit message (catch error):', catchEditResult.description || catchEditResult)
          }
        }

      } else if (action === 'back_to_rss') {
        // ← Back to RSS image options
        console.log('User wants to go back to RSS image options for news:', newsId)

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '← Назад',
              show_alert: false
            })
          }
        )

        const rssKeyboard = {
          inline_keyboard: [
            [
              { text: '✅ Використати', callback_data: `confirm_rss_image_${newsId}` },
              { text: '🔄 Перегенерувати', callback_data: `regenerate_rss_image_${newsId}` }
            ],
            [
              { text: '📸 Завантажити своє', callback_data: `upload_rss_image_${newsId}` }
            ],
            [
              { text: '❌ Skip', callback_data: `reject_${newsId}` }
            ]
          ]
        }

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText,
              parse_mode: 'HTML',
              reply_markup: rssKeyboard
            })
          }
        )

      } else if (action === 'upload_rss_image') {
        // 📸 RSS: Upload custom image - prompt user to send photo
        console.log('User wants to upload custom RSS image for news:', newsId)

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '📸 Відправте фото у відповідь на це повідомлення',
              show_alert: true
            })
          }
        )

        // Edit message to show we're waiting for photo
        // Note: The existing photo reply handler will detect newsId from message and handle the upload
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: messageText + `\n\n📸 <b>Очікую фото...</b>\n<i>Reply to this message with your photo</i>\n<code>newsId:${newsId}</code>\n<code>rss_workflow:true</code>`,
              parse_mode: 'HTML'
            })
          }
        )

        // =================================================================
        // 🎨 IMAGE VARIANT WORKFLOW: select_variant, new_variants
        // =================================================================

      } else if (action === 'select_variant') {
        // Moderator selected a visual concept variant → show language selection
        const variantIndex = parseInt(imageLanguage || '1')
        console.log(`🎨 User selected variant ${variantIndex} for news:`, newsId)

        // 1. Read variants from DB
        const { data: newsRecord, error: newsError } = await supabase
          .from('news')
          .select('id, image_prompt_variants')
          .eq('id', newsId)
          .single()

        if (newsError || !newsRecord) {
          console.error('❌ News not found for variant selection:', newsId)
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: '❌ Новина не знайдена',
                show_alert: true
              })
            }
          )
          return new Response(JSON.stringify({ ok: true }))
        }

        const variants = newsRecord.image_prompt_variants as Array<{ label: string, description: string }> | null

        if (!variants || variants.length < variantIndex) {
          console.error('❌ Variant not found:', variantIndex, 'available:', variants?.length)
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: '❌ Варіант не знайдено',
                show_alert: true
              })
            }
          )
          return new Response(JSON.stringify({ ok: true }))
        }

        const selectedVariant = variants[variantIndex - 1]
        console.log(`✅ Selected variant: "${selectedVariant.label}"`)

        // 2. Show language selection buttons
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: `🎨 Обрано: "${selectedVariant.label}" — оберіть мову`,
              show_alert: false
            })
          }
        )

        const langKeyboard = {
          inline_keyboard: [
            [
              { text: '🇺🇦 UA', callback_data: `vl_${variantIndex}_ua_${newsId}` },
              { text: '🇳🇴 NO', callback_data: `vl_${variantIndex}_no_${newsId}` },
              { text: '🇬🇧 EN', callback_data: `vl_${variantIndex}_en_${newsId}` }
            ],
            [
              { text: '← Назад до варіантів', callback_data: `back_to_variants_${newsId}` }
            ]
          ]
        }

        const editLangResponse = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: truncateForTelegram(messageText, `\n\n🎨 Обрано: "${escapeHtml(selectedVariant.label)}"\n\n🌐 <b>Оберіть мову:</b>`),
              parse_mode: 'HTML',
              reply_markup: langKeyboard
            })
          }
        )
        if (!editLangResponse.ok) {
          const editErr = await editLangResponse.text()
          console.error('❌ editMessageText failed (select_variant):', editErr)
        }

      } else if (action === 'variant_with_lang') {
        // =================================================================
        // 🎨 Variant + Language → DISPATCH TO WORKER (optimistic: gallery buttons immediately)
        // =================================================================
        const variantIndex = parseInt(socialLanguage || '1')
        const selectedLang = imageLanguage || 'en'
        const langNames: Record<string, string> = { ua: 'UA', no: 'NO', en: 'EN' }
        console.log(`[async] Dispatching variant_with_lang (variant ${variantIndex}, ${selectedLang}) to worker for news:`, newsId)

        // Lightweight DB query for gallery state
        const { data: galleryRecord } = await supabase
          .from('news')
          .select('id, images, rss_analysis')
          .eq('id', newsId)
          .single()

        const isRssSource = !!(galleryRecord?.rss_analysis)
        const imageCount = galleryRecord?.images?.length || 0

        // Gallery buttons shown IMMEDIATELY (optimistic pipeline)
        const galleryKeyboard = isRssSource ? {
          inline_keyboard: [
            [{ text: `✅ Готово (${imageCount} фото)`, callback_data: `gal_done_${newsId}` }, { text: '➕ Ще', callback_data: `add_more_${newsId}` }],
            [{ text: '🖼 + Оригінал', callback_data: `keep_orig_${newsId}` }, { text: '📸 Завантажити', callback_data: `upload_rss_image_${newsId}` }],
            [{ text: '❌ Skip', callback_data: `reject_${newsId}` }]
          ]
        } : {
          inline_keyboard: [
            [{ text: `✅ Готово (${imageCount} фото)`, callback_data: `gal_done_${newsId}` }, { text: '➕ Ще', callback_data: `add_more_${newsId}` }],
            [{ text: '🖼 + Оригінал', callback_data: `keep_orig_${newsId}` }, { text: '📸 Завантажити', callback_data: `create_custom_${newsId}` }],
            [{ text: '❌ Reject', callback_data: `reject_${newsId}` }]
          ]
        }

        // Answer callback immediately
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: `🎨 Генерація варіанту ${variantIndex} (${langNames[selectedLang] || selectedLang})...`, show_alert: false })
        })

        // Show gallery buttons + processing state
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: truncateForTelegram(messageText, `\n\n⏳ <b>Генерація зображення (варіант ${variantIndex}, ${langNames[selectedLang] || selectedLang})...</b>\n<i>Можете продовжити далі або дочекатися результату</i>`),
            parse_mode: 'HTML',
            reply_markup: galleryKeyboard
          })
        })

        // Dispatch to worker
        dispatchToWorker({
          action: 'variant_with_lang',
          params: { newsId, variantIndex, selectedLang },
          telegram: { chatId, messageId, messageText }
        })

      } else if (action === 'back_to_variants') {
        // ← Back to variant selection: show existing variants from DB
        console.log('← Back to variants for news:', newsId)

        const { data: newsRecord, error: newsError } = await supabase
          .from('news')
          .select('id, image_prompt_variants, rss_analysis')
          .eq('id', newsId)
          .single()

        const isRssSource = !!(newsRecord?.rss_analysis)
        const existingVariants = newsRecord?.image_prompt_variants as Array<{ label: string, description: string }> | null

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '← Назад до варіантів',
              show_alert: false
            })
          }
        )

        if (existingVariants && existingVariants.length > 0) {
          // Show existing variants
          let variantsText = '\n\n🎨 Оберіть концепцію:' + formatCompactVariants(existingVariants, escapeHtml)

          const variantKeyboard = {
            inline_keyboard: [
              [
                { text: '1️⃣', callback_data: `select_variant_1_${newsId}` },
                { text: '2️⃣', callback_data: `select_variant_2_${newsId}` },
                { text: '3️⃣', callback_data: `select_variant_3_${newsId}` },
                { text: '4️⃣', callback_data: `select_variant_4_${newsId}` }
              ],
              [
                { text: '🔄 Нові варіанти', callback_data: `new_variants_${newsId}` },
                { text: '🎨 Creative Builder', callback_data: `cb_hub_${newsId}` }
              ],
              [
                { text: '🖼 Оригінал', callback_data: `keep_orig_${newsId}` },
                { text: '📸 Завантажити', callback_data: isRssSource ? `upload_rss_image_${newsId}` : `create_custom_${newsId}` }
              ],
              [
                { text: '❌ Reject', callback_data: `reject_${newsId}` }
              ]
            ]
          }

          const editBackResponse = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: truncateForTelegram(messageText, variantsText),
                parse_mode: 'HTML',
                reply_markup: variantKeyboard
              })
            }
          )
          if (!editBackResponse.ok) {
            const editErr = await editBackResponse.text()
            console.error('❌ editMessageText failed (back_to_variants):', editErr)
          }
        } else {
          // No variants stored — generate new ones or use Creative Builder
          const genKeyboard = {
            inline_keyboard: [
              [
                { text: '🎲 Random Variants', callback_data: `new_variants_${newsId}` },
                { text: '🎨 Creative Builder', callback_data: `cb_hub_${newsId}` }
              ],
              [
                { text: '🖼 Оригінал', callback_data: `keep_orig_${newsId}` },
                { text: '📸 Завантажити', callback_data: isRssSource ? `upload_rss_image_${newsId}` : `create_custom_${newsId}` }
              ],
              [
                { text: '❌ Reject', callback_data: `reject_${newsId}` }
              ]
            ]
          }

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: truncateForTelegram(messageText, '\n\n⚠️ <b>Варіанти не знайдені</b>\n<i>Натисніть "Згенерувати варіанти" для створення нових</i>'),
                parse_mode: 'HTML',
                reply_markup: genKeyboard
              })
            }
          )
        }

      } else if (action === 'new_variants') {
        // =================================================================
        // 🔄 Generate new variants → DISPATCH TO WORKER
        // =================================================================
        console.log(`[async] Dispatching new_variants to worker for news:`, newsId)

        // Answer callback immediately
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: '🔄 Генерація нових варіантів...', show_alert: false })
        })

        // Show processing state
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: truncateForTelegram(messageText, '\n\n⏳ <b>Генерація нових візуальних концепцій...</b>'),
            parse_mode: 'HTML'
          })
        })

        // Dispatch to worker
        dispatchToWorker({
          action: 'new_variants',
          params: { newsId },
          telegram: { chatId, messageId, messageText }
        })

        // ═══════════════════════════════════════════════════════════════════
        // CREATIVE BUILDER HANDLERS
        // ═══════════════════════════════════════════════════════════════════
      } else if (action === 'cb_hub') {
        // Show/return to Creative Builder hub screen
        console.log('🎨 Creative Builder hub for news:', newsId)

        const { data: newsRecord, error: newsError } = await supabase
          .from('news')
          .select('id, original_title, creative_builder_state, rss_analysis')
          .eq('id', newsId)
          .single()

        if (newsError || !newsRecord) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackId, text: '❌ Новина не знайдена', show_alert: true })
          })
          return new Response(JSON.stringify({ ok: true }))
        }

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: '🎨 Creative Builder', show_alert: false })
        })

        const state = (newsRecord.creative_builder_state || {}) as Record<string, any>
        const isRssSource = !!(newsRecord.rss_analysis)

        // Category map: code → { key, label, emoji }
        const categories = [
          { key: 'style', code: 'ST', label: 'Стиль', emoji: '🎨' },
          { key: 'color', code: 'CL', label: 'Тон', emoji: '🌈' },
          { key: 'object', code: 'OB', label: "Об'єкт", emoji: '🔮' },
          { key: 'action', code: 'AC', label: 'Дія', emoji: '💫' },
          { key: 'background', code: 'BG', label: 'Фон', emoji: '🌆' },
          { key: 'effects', code: 'FX', label: 'Ефекти', emoji: '✨' },
          { key: 'text', code: 'TX', label: 'Текст', emoji: '📝' },
        ]

        // Build status text
        let selectedCount = 0
        let statusLines = ''
        for (const cat of categories) {
          const sel = state[cat.key]
          if (sel && sel.label) {
            statusLines += `\n✅ ${cat.label}: ${escapeHtml(sel.label)}`
            selectedCount++
          } else {
            statusLines += `\n⬜ ${cat.label}: --`
          }
        }

        const articleTitle = newsRecord.original_title
          ? escapeHtml(newsRecord.original_title.substring(0, 60)) + (newsRecord.original_title.length > 60 ? '...' : '')
          : 'N/A'

        const hubText = `\n\n🎨 <b>Creative Builder</b>\n\n📰 "${articleTitle}"\n\n<b>Ваші вибори:</b>${statusLines}`

        // Build keyboard: 2 per row for first 6, then text alone, then generate/reset/back
        const catButtons = categories.map(cat => {
          const sel = state[cat.key]
          const checkmark = sel && sel.label ? ' ✅' : ''
          return { text: `${cat.emoji} ${cat.label}${checkmark}`, callback_data: `cb_c_${cat.code}_${newsId}` }
        })

        const hubKeyboard = {
          inline_keyboard: [
            [catButtons[0], catButtons[1]],
            [catButtons[2], catButtons[3]],
            [catButtons[4], catButtons[5]],
            [catButtons[6]],
            [
              { text: `🚀 Генерувати (${selectedCount}/7)`, callback_data: `cb_gen_${newsId}` },
              { text: '🔄 Скинути', callback_data: `cb_rst_${newsId}` }
            ],
            [
              { text: '🎲 Random Variants', callback_data: `new_variants_${newsId}` }
            ],
            [
              { text: '← Назад', callback_data: `back_to_variants_${newsId}` }
            ]
          ]
        }

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: truncateForTelegram(messageText, hubText),
            parse_mode: 'HTML',
            reply_markup: hubKeyboard
          })
        })

      } else if (action === 'cb_category') {
        // Show options for a specific category
        const catCode = socialLanguage || ''
        console.log(`🎨 Creative Builder: showing category ${catCode} for news:`, newsId)

        const catMap: Record<string, string> = {
          'ST': 'style', 'CL': 'color', 'OB': 'object',
          'AC': 'action', 'BG': 'background', 'FX': 'effects', 'TX': 'text'
        }
        const catLabelMap: Record<string, string> = {
          'ST': '🎨 Стиль', 'CL': '🌈 Тон', 'OB': "🔮 Об'єкт",
          'AC': '💫 Дія', 'BG': '🌆 Фон', 'FX': '✨ Ефекти', 'TX': '📝 Текст'
        }
        const categoryName = catMap[catCode]

        if (!categoryName) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackId, text: '❌ Невідома категорія', show_alert: true })
          })
          return new Response(JSON.stringify({ ok: true }))
        }

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: catLabelMap[catCode] || categoryName, show_alert: false })
        })

        // Special handling for Object category — dynamically generated
        if (catCode === 'OB') {
          const { data: newsRecord } = await supabase
            .from('news')
            .select('id, original_title, original_content, creative_builder_state')
            .eq('id', newsId)
            .single()

          if (!newsRecord) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId, message_id: messageId,
                text: truncateForTelegram(messageText, '\n\n❌ Новина не знайдена'),
                parse_mode: 'HTML'
              })
            })
            return new Response(JSON.stringify({ ok: true }))
          }

          const state = (newsRecord.creative_builder_state || {}) as Record<string, any>
          let suggestedObjects = state.suggested_objects as Array<{ label: string; prompt_fragment: string }> | null

          // If no cached objects, extract them via GPT
          if (!suggestedObjects || suggestedObjects.length === 0) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId, message_id: messageId,
                text: truncateForTelegram(messageText, "\n\n⏳ <b>Аналізую статтю для визначення об'єктів...</b>"),
                parse_mode: 'HTML'
              })
            })

            try {
              const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
              const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
              const objResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-image-prompt`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  newsId,
                  title: (newsRecord.original_title || '').substring(0, 200),
                  content: (newsRecord.original_content || '').substring(0, 2000),
                  mode: 'extract_objects'
                })
              })

              if (objResponse.ok) {
                const objResult = await objResponse.json()
                suggestedObjects = objResult.objects || []

                // Cache in DB
                await supabase
                  .from('news')
                  .update({
                    creative_builder_state: { ...state, suggested_objects: suggestedObjects }
                  })
                  .eq('id', newsId)
              }
            } catch (objErr: any) {
              console.error('❌ Error extracting objects:', objErr)
            }
          }

          if (!suggestedObjects || suggestedObjects.length === 0) {
            suggestedObjects = [{ label: 'Default Object', prompt_fragment: 'A symbolic object representing the article topic' }]
          }

          // Build object selection buttons (1 per row)
          const selectedObj = state.object
          const objButtons = suggestedObjects.map((obj, i) => {
            const isSelected = selectedObj && selectedObj.label === obj.label
            return [{ text: `${isSelected ? '✅ ' : ''}${obj.label}`, callback_data: `cb_s_OB_${i}_${newsId}` }]
          })
          objButtons.push([{ text: '← Назад', callback_data: `cb_hub_${newsId}` }])

          let objText = "\n\n🔮 <b>Оберіть центральний об'єкт:</b>\n"
          suggestedObjects.forEach((obj, i) => {
            const isSelected = selectedObj && selectedObj.label === obj.label
            objText += `\n${isSelected ? '✅' : `${i + 1}.`} <b>${escapeHtml(obj.label)}</b>\n<i>${escapeHtml(obj.prompt_fragment)}</i>\n`
          })

          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId, message_id: messageId,
              text: truncateForTelegram(messageText, objText),
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: objButtons }
            })
          })

          return new Response(JSON.stringify({ ok: true }))
        }

        // Regular categories: fetch from creative_elements table
        const { data: elements } = await supabase
          .from('creative_elements')
          .select('code, label_ua, label_en, prompt_fragment, emoji, sort_order')
          .eq('category', categoryName)
          .eq('is_active', true)
          .order('sort_order', { ascending: true })

        if (!elements || elements.length === 0) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId, message_id: messageId,
              text: truncateForTelegram(messageText, `\n\n⚠️ Елементи для категорії "${categoryName}" не знайдені`),
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: [[{ text: '← Назад', callback_data: `cb_hub_${newsId}` }]] }
            })
          })
          return new Response(JSON.stringify({ ok: true }))
        }

        // Get current selection
        const { data: newsRecord } = await supabase
          .from('news')
          .select('creative_builder_state')
          .eq('id', newsId)
          .single()

        const currentState = (newsRecord?.creative_builder_state || {}) as Record<string, any>
        const currentSelection = currentState[categoryName]

        // Build buttons (2 per row)
        const optionButtons: any[][] = []
        let row: any[] = []
        elements.forEach((el: any, i: number) => {
          const isSelected = currentSelection && currentSelection.code === el.code
          const btnText = `${isSelected ? '✅ ' : ''}${el.emoji || ''} ${el.label_ua}`
          row.push({ text: btnText, callback_data: `cb_s_${catCode}_${i}_${newsId}` })
          if (row.length === 2 || i === elements.length - 1) {
            optionButtons.push([...row])
            row = []
          }
        })
        optionButtons.push([{ text: '← Назад', callback_data: `cb_hub_${newsId}` }])

        let catText = `\n\n${catLabelMap[catCode]} <b>— оберіть:</b>\n`
        elements.forEach((el: any) => {
          const isSelected = currentSelection && currentSelection.code === el.code
          catText += `\n${isSelected ? '✅' : '○'} ${el.emoji || ''} <b>${escapeHtml(el.label_ua)}</b> — <i>${escapeHtml(el.label_en)}</i>`
        })

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: truncateForTelegram(messageText, catText),
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: optionButtons }
          })
        })

      } else if (action === 'cb_select') {
        // Select an option within a category
        const catCode = socialLanguage || ''
        const optionIndex = parseInt(imageLanguage || '0')
        console.log(`🎨 Creative Builder: select option ${optionIndex} in category ${catCode} for news:`, newsId)

        const catMap: Record<string, string> = {
          'ST': 'style', 'CL': 'color', 'OB': 'object',
          'AC': 'action', 'BG': 'background', 'FX': 'effects', 'TX': 'text'
        }
        const categoryName = catMap[catCode]

        if (!categoryName) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackId, text: '❌ Невідома категорія', show_alert: true })
          })
          return new Response(JSON.stringify({ ok: true }))
        }

        // Get current state
        const { data: newsRecord } = await supabase
          .from('news')
          .select('creative_builder_state')
          .eq('id', newsId)
          .single()

        const currentState = (newsRecord?.creative_builder_state || {}) as Record<string, any>

        let selectedElement: { code: string; label: string; prompt_fragment: string } | null = null

        if (catCode === 'OB') {
          // Object: get from cached suggested_objects
          const suggestedObjects = currentState.suggested_objects as Array<{ label: string; prompt_fragment: string }> | null
          if (suggestedObjects && suggestedObjects[optionIndex]) {
            const obj = suggestedObjects[optionIndex]
            selectedElement = { code: `ob_${optionIndex}`, label: obj.label, prompt_fragment: obj.prompt_fragment }
          }
        } else {
          // Regular category: fetch from creative_elements by sort order index
          const { data: elements } = await supabase
            .from('creative_elements')
            .select('code, label_ua, label_en, prompt_fragment')
            .eq('category', categoryName)
            .eq('is_active', true)
            .order('sort_order', { ascending: true })

          if (elements && elements[optionIndex]) {
            const el = elements[optionIndex]
            selectedElement = { code: el.code, label: el.label_ua, prompt_fragment: el.prompt_fragment }
          }
        }

        if (!selectedElement) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackId, text: '❌ Елемент не знайдено', show_alert: true })
          })
          return new Response(JSON.stringify({ ok: true }))
        }

        // Update state
        const newState = { ...currentState, [categoryName]: selectedElement }
        await supabase
          .from('news')
          .update({ creative_builder_state: newState })
          .eq('id', newsId)

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: `✅ ${selectedElement.label}`, show_alert: false })
        })

        // Return to hub (simulate cb_hub action by re-rendering hub)
        // Re-read updated state
        const { data: updatedNews } = await supabase
          .from('news')
          .select('id, original_title, creative_builder_state, rss_analysis')
          .eq('id', newsId)
          .single()

        const updatedState = (updatedNews?.creative_builder_state || {}) as Record<string, any>

        const categories = [
          { key: 'style', code: 'ST', label: 'Стиль', emoji: '🎨' },
          { key: 'color', code: 'CL', label: 'Тон', emoji: '🌈' },
          { key: 'object', code: 'OB', label: "Об'єкт", emoji: '🔮' },
          { key: 'action', code: 'AC', label: 'Дія', emoji: '💫' },
          { key: 'background', code: 'BG', label: 'Фон', emoji: '🌆' },
          { key: 'effects', code: 'FX', label: 'Ефекти', emoji: '✨' },
          { key: 'text', code: 'TX', label: 'Текст', emoji: '📝' },
        ]

        let selectedCount = 0
        let statusLines = ''
        for (const cat of categories) {
          const sel = updatedState[cat.key]
          if (sel && sel.label) {
            statusLines += `\n✅ ${cat.label}: ${escapeHtml(sel.label)}`
            selectedCount++
          } else {
            statusLines += `\n⬜ ${cat.label}: --`
          }
        }

        const articleTitle = updatedNews?.original_title
          ? escapeHtml(updatedNews.original_title.substring(0, 60)) + (updatedNews.original_title.length > 60 ? '...' : '')
          : 'N/A'

        const hubText = `\n\n🎨 <b>Creative Builder</b>\n\n📰 "${articleTitle}"\n\n<b>Ваші вибори:</b>${statusLines}`

        const catButtons = categories.map(cat => {
          const sel = updatedState[cat.key]
          const checkmark = sel && sel.label ? ' ✅' : ''
          return { text: `${cat.emoji} ${cat.label}${checkmark}`, callback_data: `cb_c_${cat.code}_${newsId}` }
        })

        const hubKeyboard = {
          inline_keyboard: [
            [catButtons[0], catButtons[1]],
            [catButtons[2], catButtons[3]],
            [catButtons[4], catButtons[5]],
            [catButtons[6]],
            [
              { text: `🚀 Генерувати (${selectedCount}/7)`, callback_data: `cb_gen_${newsId}` },
              { text: '🔄 Скинути', callback_data: `cb_rst_${newsId}` }
            ],
            [
              { text: '🎲 Random Variants', callback_data: `new_variants_${newsId}` }
            ],
            [
              { text: '← Назад', callback_data: `back_to_variants_${newsId}` }
            ]
          ]
        }

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: truncateForTelegram(messageText, hubText),
            parse_mode: 'HTML',
            reply_markup: hubKeyboard
          })
        })

      } else if (action === 'cb_generate') {
        // Show language selection before generating from Creative Builder
        console.log('🚀 Creative Builder: generate for news:', newsId)

        const { data: newsRecord } = await supabase
          .from('news')
          .select('creative_builder_state')
          .eq('id', newsId)
          .single()

        const state = (newsRecord?.creative_builder_state || {}) as Record<string, any>

        // Count selections
        const catKeys = ['style', 'color', 'object', 'action', 'background', 'effects', 'text']
        const selectedCount = catKeys.filter(k => state[k] && state[k].label).length

        if (selectedCount === 0) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackId, text: '⚠️ Оберіть хоча б 1 елемент!', show_alert: true })
          })
          return new Response(JSON.stringify({ ok: true }))
        }

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: '🚀 Оберіть мову', show_alert: false })
        })

        const langKeyboard = {
          inline_keyboard: [
            [
              { text: '🇺🇦 UA', callback_data: `cb_lg_ua_${newsId}` },
              { text: '🇳🇴 NO', callback_data: `cb_lg_no_${newsId}` },
              { text: '🇬🇧 EN', callback_data: `cb_lg_en_${newsId}` }
            ],
            [
              { text: '← Назад до конструктора', callback_data: `cb_hub_${newsId}` }
            ]
          ]
        }

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: truncateForTelegram(messageText, `\n\n🚀 <b>Генерація зображення</b> (${selectedCount}/7 елементів)\n\n🌐 <b>Оберіть мову тексту на зображенні:</b>`),
            parse_mode: 'HTML',
            reply_markup: langKeyboard
          })
        })

      } else if (action === 'cb_lang') {
        // =================================================================
        // 🎨 Creative Builder Language → DISPATCH TO WORKER
        // =================================================================
        const selectedLang = imageLanguage || 'en'
        const langNames: Record<string, string> = { ua: 'UA', no: 'NO', en: 'EN' }
        console.log(`[async] Dispatching cb_lang (${selectedLang}) to worker for news:`, newsId)

        // Answer callback immediately
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: `🎨 Створюю промпт...`, show_alert: false })
        })

        // Show processing state
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: truncateForTelegram(messageText, `\n\n⏳ <b>Creative Builder: створюю промпт (${langNames[selectedLang] || selectedLang})...</b>`),
            parse_mode: 'HTML'
          })
        })

        // Dispatch to worker
        dispatchToWorker({
          action: 'cb_lang',
          params: { newsId, selectedLang },
          telegram: { chatId, messageId, messageText }
        })

      } else if (action === 'cb_go') {
        // =================================================================
        // 🖼️ Creative Builder Go → DISPATCH TO WORKER (optimistic: gallery buttons immediately)
        // =================================================================
        const selectedLang = imageLanguage || 'en'
        const langNames: Record<string, string> = { ua: 'UA', no: 'NO', en: 'EN' }
        console.log(`[async] Dispatching cb_go (${selectedLang}) to worker for news:`, newsId)

        // Lightweight DB query for gallery state
        const { data: cbGalleryRecord } = await supabase
          .from('news')
          .select('id, images, rss_analysis')
          .eq('id', newsId)
          .single()

        const cbIsRss = !!(cbGalleryRecord?.rss_analysis)
        const cbImageCount = cbGalleryRecord?.images?.length || 0

        // Gallery buttons shown IMMEDIATELY (optimistic pipeline)
        const cbGalleryKeyboard = cbIsRss ? {
          inline_keyboard: [
            [{ text: `✅ Готово (${cbImageCount} фото)`, callback_data: `gal_done_${newsId}` }, { text: '➕ Ще', callback_data: `add_more_${newsId}` }],
            [{ text: '🖼 + Оригінал', callback_data: `keep_orig_${newsId}` }, { text: '📸 Завантажити', callback_data: `upload_rss_image_${newsId}` }],
            [{ text: '❌ Skip', callback_data: `reject_${newsId}` }]
          ]
        } : {
          inline_keyboard: [
            [{ text: `✅ Готово (${cbImageCount} фото)`, callback_data: `gal_done_${newsId}` }, { text: '➕ Ще', callback_data: `add_more_${newsId}` }],
            [{ text: '🖼 + Оригінал', callback_data: `keep_orig_${newsId}` }, { text: '📸 Завантажити', callback_data: `create_custom_${newsId}` }],
            [{ text: '❌ Reject', callback_data: `reject_${newsId}` }]
          ]
        }

        // Answer callback immediately
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: `🖼️ Генерація зображення...`, show_alert: false })
        })

        // Show gallery buttons + processing state
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: truncateForTelegram(messageText, `\n\n⏳ <b>Генерація зображення (${langNames[selectedLang] || selectedLang})...</b>\n<i>Можете продовжити далі або дочекатися результату</i>`),
            parse_mode: 'HTML',
            reply_markup: cbGalleryKeyboard
          })
        })

        // Dispatch to worker
        dispatchToWorker({
          action: 'cb_go',
          params: { newsId, selectedLang },
          telegram: { chatId, messageId, messageText }
        })

      } else if (action === 'cb_reset') {
        // Reset all Creative Builder selections
        console.log('🔄 Creative Builder: reset for news:', newsId)

        await supabase
          .from('news')
          .update({ creative_builder_state: {} })
          .eq('id', newsId)

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: '🔄 Скинуто', show_alert: false })
        })

        // Re-render hub with empty state (simulate cb_hub)
        const { data: newsRecord } = await supabase
          .from('news')
          .select('id, original_title, rss_analysis')
          .eq('id', newsId)
          .single()

        const articleTitle = newsRecord?.original_title
          ? escapeHtml(newsRecord.original_title.substring(0, 60)) + (newsRecord.original_title.length > 60 ? '...' : '')
          : 'N/A'

        const categories = [
          { key: 'style', code: 'ST', label: 'Стиль', emoji: '🎨' },
          { key: 'color', code: 'CL', label: 'Тон', emoji: '🌈' },
          { key: 'object', code: 'OB', label: "Об'єкт", emoji: '🔮' },
          { key: 'action', code: 'AC', label: 'Дія', emoji: '💫' },
          { key: 'background', code: 'BG', label: 'Фон', emoji: '🌆' },
          { key: 'effects', code: 'FX', label: 'Ефекти', emoji: '✨' },
          { key: 'text', code: 'TX', label: 'Текст', emoji: '📝' },
        ]

        let statusLines = ''
        for (const cat of categories) {
          statusLines += `\n⬜ ${cat.label}: --`
        }

        const hubText = `\n\n🎨 <b>Creative Builder</b>\n\n📰 "${articleTitle}"\n\n<b>Ваші вибори:</b>${statusLines}`

        const catButtons = categories.map(cat => ({
          text: `${cat.emoji} ${cat.label}`,
          callback_data: `cb_c_${cat.code}_${newsId}`
        }))

        const hubKeyboard = {
          inline_keyboard: [
            [catButtons[0], catButtons[1]],
            [catButtons[2], catButtons[3]],
            [catButtons[4], catButtons[5]],
            [catButtons[6]],
            [
              { text: '🚀 Генерувати (0/7)', callback_data: `cb_gen_${newsId}` },
              { text: '🔄 Скинути', callback_data: `cb_rst_${newsId}` }
            ],
            [
              { text: '🎲 Random Variants', callback_data: `new_variants_${newsId}` }
            ],
            [
              { text: '← Назад', callback_data: `back_to_variants_${newsId}` }
            ]
          ]
        }

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: truncateForTelegram(messageText, hubText),
            parse_mode: 'HTML',
            reply_markup: hubKeyboard
          })
        })

      // ═══ Preset one-click publishing handler (scheduled queue) ═══
      } else if (action === 'preset') {
        console.log(`🚀 Preset triggered: variant=${socialLanguage}, type=${publicationType}, lang=${imageLanguage}, newsId=${newsId}`)

        // Map encoded lang code to full language
        const langMap: Record<string, string> = { 'e': 'en', 'n': 'no', 'u': 'ua' }
        const presetLang = langMap[imageLanguage || ''] || 'en'
        const presetVariant = socialLanguage === 'a' ? null : parseInt(socialLanguage || '1')
        const presetType = publicationType || 'news'

        // Build descriptive labels
        const variantLabel = presetVariant ? `Варіант #${presetVariant}` : 'AI авто-вибір'
        const variantShort = presetVariant ? `V${presetVariant}` : 'AI'
        const typeLabel = presetType === 'blog' ? 'Блог' : 'Новини'
        const typeEmoji = presetType === 'blog' ? '📝' : '📰'
        const langFlags: Record<string, string> = { 'en': '🇬🇧', 'no': '🇳🇴', 'ua': '🇺🇦' }
        const langLabel = `${langFlags[presetLang] || ''} ${presetLang.toUpperCase()}`

        // Answer callback immediately
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: callbackId,
            text: `📅 ${variantShort} → ${typeLabel} → ${presetLang.toUpperCase()}`,
            show_alert: false
          })
        })

        // Load news record for content classification + variants
        const { data: presetNews } = await supabase
          .from('news')
          .select('video_url, original_video_url, original_content, rss_source_url, source_type, image_prompt_variants')
          .eq('id', newsId)
          .single()

        // Build variants summary line
        const variants = presetNews?.image_prompt_variants as Array<{label: string}> | null
        const selectedVariantName = presetVariant && variants?.[presetVariant - 1]?.label
          ? variants[presetVariant - 1].label
          : null
        const variantLabel2 = selectedVariantName
          ? `Обрано: ${presetVariant}.${selectedVariantName}`
          : variantLabel
        const variantsSummary = !presetVariant && variants?.length
          ? '\n🎨 ' + variants.map((v: {label: string}, i: number) => `${i+1}.${v.label}`).join(' | ')
          : ''

        // Classify content weight & compute scheduled slot
        const weight = classifyContentWeight(presetNews || {})
        const schedConfig = await loadScheduleConfig(supabase)
        const presetConfig = {
          variantIndex: presetVariant,
          imageLanguage: presetLang,
          publicationType: presetType,
          socialLanguages: [presetLang],
          socialPlatforms: ['linkedin', 'facebook', 'instagram'],
          skipQueue: false
        }

        if (schedConfig.enabled) {
          const { scheduledAt, window: winId, windowLabel } = await computeScheduledTime(weight, schedConfig, supabase)
          const timeStr = formatScheduledTime(scheduledAt)

          // Store in DB (preset click = approve + schedule)
          await supabase.from('news').update({
            pre_moderation_status: 'approved',
            auto_publish_status: 'scheduled',
            scheduled_publish_at: scheduledAt.toISOString(),
            content_weight: weight,
            schedule_window: winId,
            preset_config: presetConfig,
            telegram_message_id: messageId,
          }).eq('id', newsId)

          // Edit message: show scheduled time + immediate/cancel buttons
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: truncateForTelegram(messageText, `\n\n📅 <b>Заплановано на ${timeStr}</b> (${windowLabel})\n🎨 ${variantLabel2} | ${typeEmoji} ${typeLabel} | ${langLabel}${variantsSummary}`),
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '⚡ Негайно', callback_data: `imm_${newsId}` },
                    { text: '❌ Скасувати', callback_data: `cs_${newsId}` }
                  ]
                ]
              }
            })
          })
        } else {
          // Schedule disabled — fire immediately (preset click = approve + publish)
          await supabase.from('news').update({
            pre_moderation_status: 'approved',
            telegram_message_id: messageId,
          }).eq('id', newsId)

          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: truncateForTelegram(messageText, `\n\n🚀 <b>Публікація:</b> ${variantLabel2} | ${typeEmoji} ${typeLabel} | ${langLabel}${variantsSummary}\n⏳ <i>Обробка...</i>`),
              parse_mode: 'HTML'
            })
          })

          fetch(`${SUPABASE_URL}/functions/v1/auto-publish-news`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              newsId,
              telegramMessageId: messageId,
              preset: { ...presetConfig, skipQueue: true }
            })
          }).catch(e => console.warn('⚠️ Preset auto-publish fire error:', e))
        }

      // ═══ Schedule: Immediate publish ═══
      } else if (action === 'schedule_immediate') {
        console.log(`⚡ Immediate publish requested: ${newsId}`)

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: '⚡ Публікую зараз...', show_alert: false })
        })

        // Check no in-flight
        const inFlightCount = await countInFlight(supabase)
        if (inFlightCount > 0) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackId, text: `⏳ ${inFlightCount} стаття вже обробляється, зачекайте`, show_alert: true })
          })
        } else {
          // Load preset_config from DB
          const { data: immNews } = await supabase
            .from('news')
            .select('preset_config, telegram_message_id')
            .eq('id', newsId)
            .single()

          // Update status to queued + approve (auto-publish-news will set 'pending' on entry)
          await supabase.from('news').update({
            pre_moderation_status: 'approved',
            auto_publish_status: 'queued',
            auto_publish_started_at: new Date().toISOString(),
            scheduled_publish_at: null,
          }).eq('id', newsId)

          // Edit message
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: truncateForTelegram(messageText, `\n\n⚡ <b>Негайна публікація...</b>\n⏳ <i>Обробка...</i>`),
              parse_mode: 'HTML'
            })
          })

          // Fire auto-publish
          const immPreset = immNews?.preset_config || undefined
          fetch(`${SUPABASE_URL}/functions/v1/auto-publish-news`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              newsId,
              telegramMessageId: messageId,
              preset: immPreset ? { ...immPreset, skipQueue: true } : undefined
            })
          }).catch(e => console.warn('⚠️ Immediate publish fire error:', e))
        }

      // ═══ Schedule: Cancel ═══
      } else if (action === 'schedule_cancel') {
        console.log(`❌ Schedule cancelled: ${newsId}`)

        await supabase.from('news').update({
          auto_publish_status: null,
          scheduled_publish_at: null,
          content_weight: null,
          schedule_window: null,
          preset_config: null,
        }).eq('id', newsId)

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: '❌ Публікацію скасовано', show_alert: false })
        })

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: truncateForTelegram(messageText, `\n\n❌ <b>Публікацію скасовано</b>`),
            parse_mode: 'HTML'
          })
        })

      // ═══ Manual mode handler ═══
      } else if (action === 'manual') {
        console.log(`🔧 Manual mode requested for: ${newsId}`)

        // Load news record to determine content state
        const { data: manualNews, error: manualError } = await supabase
          .from('news')
          .select('id, image_url, processed_image_url, video_url, video_type, image_prompt_variants, source_type, rss_source_url')
          .eq('id', newsId)
          .single()

        if (manualError || !manualNews) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackId, text: '❌ News not found', show_alert: true })
          })
        } else {
          const hasVideo = !!(manualNews.video_url && manualNews.video_type)
          const variants = manualNews.image_prompt_variants as Array<{ label: string; description: string }> | null
          const hasVariants = Array.isArray(variants) && variants.length > 0
          const hasImage = !!(manualNews.processed_image_url || manualNews.image_url)
          const isRss = !!(manualNews.rss_source_url || manualNews.source_type === 'rss')

          const manualKeyboard = buildManualKeyboard(newsId, {
            hasVideo,
            hasVariants,
            variantCount: variants?.length || 0,
            hasImage,
            isRss,
            hasDuplicates: false
          })

          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackId, text: '🔧 Ручний режим', show_alert: false })
          })

          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              reply_markup: manualKeyboard
            })
          })
        }

      } else if (action === 'skip_dup') {
        // Skip as duplicate - reject with reason
        console.log('News skipped as duplicate, ID:', newsId)

        const { error: updateError } = await supabase
          .from('news')
          .update({
            pre_moderation_status: 'rejected',
            rejection_reason: 'Duplicate (moderator confirmed)'
          })
          .eq('id', newsId)

        if (updateError) {
          console.error('Failed to update news as duplicate:', updateError)
        }

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '🔁 Skipped as duplicate',
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
              text: messageText + '\n\n🔁 <b>SKIPPED (Duplicate)</b>',
              parse_mode: 'HTML'
            })
          }
        )

      // ── Daily Video action handlers ──
      // newsId contains target_date (YYYY-MM-DD) for all dv_* actions
      } else if (action.startsWith('dv_')) {
        const targetDate = newsId  // In dv_* callbacks, newsId = target_date
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
        const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

        // Map action to daily-video-bot action
        const dvActionMap: Record<string, string> = {
          'dv_ok': 'generate_script',      // Digest approved → generate script
          'dv_skip': 'skip',               // Skip this day
          'dv_sok': 'generate_scenario',   // Media approved → generate scenario
          'dv_srg': 'regenerate_script',   // Regenerate script
          'dv_rsi': 'show_research_options', // Show article list for image re-search
          'dv_rsa': 'research_article',    // Re-search images for specific article
          'dv_ren': 'prepare_images',      // Scenario approved → show images for approval
          'dv_rok': 'trigger_render',      // Images approved → render
          'dv_vrg': 'regenerate_scenario', // Regenerate scenario
          'dv_toggle': 'toggle_article',   // Toggle article inclusion
          'dv_th': 'select_thumbnail',     // Select thumbnail variant
          'dv_thr': 'regenerate_thumbnails', // Regenerate all thumbnail variants
        }

        const dvAction = dvActionMap[action] || action
        console.log(`📺 Daily Video: ${action} → ${dvAction} for ${targetDate}`)

        // Answer callback immediately
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: '⏳ Обробляю...',
              show_alert: false
            })
          }
        )

        // Fire-and-forget dispatch to daily-video-bot
        fetch(`${SUPABASE_URL}/functions/v1/daily-video-bot?action=${dvAction}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            target_date: targetDate,
            chat_id: chatId,
            message_id: messageId,
            ...(action === 'dv_toggle' ? { article_index: Number(socialLanguage) } : {}),
            ...(action === 'dv_rsa' ? { article_index: Number(socialLanguage) } : {}),
            ...(action === 'dv_th' ? { variant_index: Number(socialLanguage) } : {}),
          })
        }).catch(err => console.error('❌ Daily video bot dispatch failed:', err))

      // ── Custom Video action handlers ──
      } else if (action.startsWith('cv_')) {
        const draftId = newsId  // In cv_* callbacks, newsId = draft UUID
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
        const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        const cvActionMap: Record<string, string> = {
          'cv_sok': 'generate_script',
          'cv_srg': 'regenerate_script',
          'cv_ren': 'generate_scenario',
          'cv_img': 'prepare_images',
          'cv_rok': 'trigger_render',
          'cv_vrg': 'generate_scenario',
          'cv_skip': 'cancel',
          'cv_fmt': 'toggle_format',
          'cv_dur': 'toggle_duration',
          'cv_lu': 'set_language',
          'cv_ln': 'set_language',
          'cv_le': 'set_language',
        }

        // Extract language from language selection callbacks
        const cvLangMap: Record<string, string> = { 'cv_lu': 'ua', 'cv_ln': 'no', 'cv_le': 'en' }

        const cvAction = cvActionMap[action] || action
        console.log(`🎬 Custom Video: ${action} → ${cvAction} for ${draftId}`)

        // Answer callback immediately
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackId, text: '⏳...', show_alert: false })
          }
        )

        // Build dispatch body — include language for set_language action
        const cvDispatchBody: Record<string, any> = { draftId: draftId, chatId: chatId }
        if (cvLangMap[action]) {
          cvDispatchBody.language = cvLangMap[action]
        }

        // Fire-and-forget dispatch to custom-video-bot
        fetch(`${SUPABASE_URL}/functions/v1/custom-video-bot?action=${cvAction}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(cvDispatchBody)
        }).catch(err => console.error('❌ Custom video bot dispatch failed:', err))

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
