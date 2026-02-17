import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { triggerVideoProcessing, isGitHubActionsEnabled } from '../_shared/github-actions.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || SUPABASE_SERVICE_ROLE_KEY
const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT')
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY')
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

const VERSION = '2026-02-16-v6-norway-language-detection'

interface AutoPublishRequest {
  newsId: string
  source: 'telegram' | 'rss'
  telegramMessageId?: number | null
}

/**
 * Auto-publish news pipeline — fully automated:
 * 1. AI selects best image variant
 * 2. Generate full image prompt
 * 3. Generate images for all configured languages
 * 4. Rewrite content to 3 languages
 * 5. Post to all configured social platforms × languages
 * 6. Send summary to Telegram
 */
serve(async (req) => {
  console.log(`🤖 Auto-Publish News ${VERSION} started`)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  let newsId = ''
  let reqMsgId: number | null = null

  try {
    const requestBody: AutoPublishRequest = await req.json()
    newsId = requestBody.newsId
    reqMsgId = requestBody.telegramMessageId || null
    const source = requestBody.source
    console.log(`📰 Auto-publishing news: ${newsId} (source: ${source})`)

    // Update status: pipeline started
    await updateStatus(supabase, newsId, 'pending')

    // Load news record
    const { data: news, error: newsError } = await supabase
      .from('news')
      .select('*')
      .eq('id', newsId)
      .single()

    if (newsError || !news) {
      throw new Error(`News not found: ${newsId}`)
    }

    // Resolve telegram message ID for editing (prefer request param, fallback to DB)
    const tgMessageId = reqMsgId || news.telegram_message_id || null

    // Lookup source name
    let sourceName = 'RSS'
    if (news.rss_source_url) {
      const { data: srcData } = await supabase
        .from('news_sources')
        .select('name')
        .eq('rss_url', news.rss_source_url)
        .single()
      if (srcData?.name) sourceName = srcData.name
    }

    const summary = (news.rss_analysis as any)?.summary || ''

    // Load settings
    const settings = await loadAutoPublishSettings(supabase)
    const languages = settings.languages as Array<'en' | 'no' | 'ua'>
    const platforms = settings.platforms
    console.log(`⚙️ Settings: platforms=[${platforms}], languages=[${languages}]`)

    // ═══════════════════════════════════════════════════
    // Norway Detection: Override language to Norwegian if article is Norway-related
    // ═══════════════════════════════════════════════════
    const isNorwayRelated = detectNorwayArticle(news)
    if (isNorwayRelated) {
      console.log('🇳🇴 Norway-related article detected — publishing in Norwegian only')
      languages.length = 0
      languages.push('no')

      // Persist flag if not already set
      if (!news.is_norway_related) {
        await supabase
          .from('news')
          .update({ is_norway_related: true })
          .eq('id', newsId)
      }
    }
    console.log(`⚙️ Final languages: [${languages}]`)

    const isVideoPost = !!news.video_url || !!news.original_video_url

    // ═══════════════════════════════════════════════════
    // STEP 1: AI Variant Selection + Image Generation
    // Always generate images — serves as fallback if video processing fails
    // (video posts used to skip this, but false positives left articles with nothing)
    // ═══════════════════════════════════════════════════
    await updateStatus(supabase, newsId, 'variant_selection')

    // Check if variants already exist
    let variants = news.image_prompt_variants
    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      console.log('🎨 No variants found, generating...')
      try {
        const variantResponse = await callFunction('generate-image-prompt', {
          newsId,
          title: news.original_title || '',
          content: news.original_content || '',
          mode: 'variants'
        })
        if (variantResponse.ok) {
          const result = await variantResponse.json()
          variants = result.variants || []
          console.log(`✅ Generated ${variants.length} variants`)
        }
      } catch (e) {
        console.warn('⚠️ Variant generation failed, will use default')
      }
    }

    // AI selects best variant (fallback to article-based variant if none)
    let selectedVariant = variants?.[0] || null
    if (variants && variants.length > 1) {
      const aiChoice = await aiSelectBestVariant(
        news.original_title || '',
        news.original_content || '',
        variants
      )
      if (aiChoice >= 0 && aiChoice < variants.length) {
        selectedVariant = variants[aiChoice]
        console.log(`🎯 AI selected variant #${aiChoice + 1}: ${selectedVariant.label}`)
      } else {
        console.log('⚠️ AI selection failed, using variant #1')
      }
    }

    // Fallback: create basic variant from article title if none available
    if (!selectedVariant) {
      console.log('⚠️ No variants available, creating fallback from article title')
      selectedVariant = {
        label: 'Article Visual',
        description: `Professional infographic for: ${(news.original_title || 'Tech News').substring(0, 100)}`
      }
    }

    // ═══════════════════════════════════════════════════
    // STEP 2: Generate full image prompt
    // ═══════════════════════════════════════════════════
    await updateStatus(supabase, newsId, 'image_generation')

    console.log('📝 Generating full image prompt...')
    try {
      const fullPromptResponse = await callFunction('generate-image-prompt', {
        newsId,
        title: news.original_title || '',
        content: news.original_content || '',
        mode: 'full',
        selectedVariant
      })
      if (fullPromptResponse.ok) {
        console.log('✅ Full image prompt generated')
      } else {
        console.warn('⚠️ Full prompt generation failed:', await fullPromptResponse.text())
      }
    } catch (e) {
      console.warn('⚠️ Full prompt generation error:', e)
    }

    // ═══════════════════════════════════════════════════
    // STEP 3: Generate images
    // ═══════════════════════════════════════════════════
    // Generate ONE image (1:1) — reused across all social platforms
    // Only one language image stored in processed_image_url (last wins)
    console.log(`🖼️ Generating image for primary language...`)
    let imageGenSuccess = false

    // Generate single image using first available language
    const primaryLang = languages[0] || 'en'
    try {
      console.log(`  🖼️ Generating 1:1 image (${primaryLang})...`)
      const imageResponse = await callFunction('process-image', {
        newsId,
        generateFromPrompt: true,
        language: primaryLang,
        aspectRatio: '1:1'
      })
      if (imageResponse.ok) {
        imageGenSuccess = true
        console.log(`  ✅ Image generated (${primaryLang})`)
      } else {
        console.warn(`  ⚠️ Image generation failed:`, await imageResponse.text())
      }
    } catch (e) {
      console.warn(`  ❌ Image generation error:`, e)
    }

    console.log(`🖼️ Image: ${imageGenSuccess ? '✅ success' : '❌ failed'}`)

    // ═══════════════════════════════════════════════════
    // STEP 3b: Trigger YouTube upload for video posts
    // Image is already generated as fallback above
    // ═══════════════════════════════════════════════════
    if (isVideoPost) {
      console.log('🎬 Video post — image generated as fallback, triggering YouTube upload...')
      if (news.video_type === 'telegram_embed' && news.video_url && isGitHubActionsEnabled()) {
        const triggerResult = await triggerVideoProcessing({
          newsId,
          mode: 'single'
        })
        if (triggerResult.success) {
          console.log('✅ GitHub Action triggered — video will be uploaded to YouTube in background')
        } else {
          console.log(`⚠️ GitHub Action trigger failed: ${triggerResult.error} — video will remain as Telegram embed until cron picks it up`)
        }
      }
    }

    // ═══════════════════════════════════════════════════
    // STEP 4: Content rewrite (CRITICAL — fail = fallback)
    // ═══════════════════════════════════════════════════
    await updateStatus(supabase, newsId, 'content_rewrite')
    console.log('📝 Rewriting content...')

    // Reload news to get latest image URLs after Step 3
    const { data: freshNews } = await supabase
      .from('news')
      .select('processed_image_url, processed_image_url_wide, image_url')
      .eq('id', newsId)
      .single()

    const latestImageUrl = freshNews?.processed_image_url || freshNews?.image_url || news.image_url || null
    console.log(`🖼️ Image URL for rewrite: ${latestImageUrl ? 'found' : 'none'}`)

    const processingEndpoint = source === 'rss' ? 'process-rss-news' : 'process-news'

    const rewriteBody: Record<string, any> = {
      newsId,
      title: news.original_title || '',
      content: news.original_content || '',
      url: news.original_url || '',
      imageUrl: latestImageUrl,
      videoUrl: news.video_url || null,
      videoType: news.video_type || null
    }

    // Add source links for Telegram sources
    if (source === 'telegram') {
      rewriteBody.sourceLink = news.source_link || null
      rewriteBody.sourceLinks = news.source_links || []
    }

    // Add RSS-specific fields
    if (source === 'rss') {
      rewriteBody.images = news.images || null
      rewriteBody.imagesWithMeta = news.images_with_meta || null
    }

    const rewriteResponse = await callFunction(processingEndpoint, rewriteBody)

    if (!rewriteResponse.ok) {
      const errorText = await rewriteResponse.text()
      console.error('❌ CRITICAL: Content rewrite failed:', errorText)
      // Fall back to manual Telegram bot
      throw new Error(`Content rewrite failed: ${errorText}`)
    }

    console.log('✅ Content rewritten and published')

    // ═══════════════════════════════════════════════════
    // STEP 5: Post to social media
    // ═══════════════════════════════════════════════════
    await updateStatus(supabase, newsId, 'social_posting')

    // Build all social post tasks, then execute in parallel
    const socialTasks: Array<{ platform: string; lang: string; promise: Promise<Response> }> = []
    for (const platform of platforms) {
      for (const lang of languages) {
        console.log(`📤 Queuing ${platform} (${lang})...`)
        socialTasks.push({
          platform,
          lang,
          promise: callFunction(`post-to-${platform}`, { newsId, language: lang, contentType: 'news' })
        })
      }
    }

    // Execute all social posts in parallel
    console.log(`📤 Posting to ${socialTasks.length} social targets in parallel...`)
    const socialResponses = await Promise.allSettled(socialTasks.map(t => t.promise))

    const socialResults: Array<{ platform: string; lang: string; success: boolean; error?: string; postUrl?: string }> = []
    for (let i = 0; i < socialTasks.length; i++) {
      const task = socialTasks[i]
      const result = socialResponses[i]
      if (result.status === 'fulfilled') {
        try {
          const postResult = await result.value.json()
          if (result.value.ok && postResult.success) {
            socialResults.push({ platform: task.platform, lang: task.lang, success: true, postUrl: postResult.postUrl })
            console.log(`  ✅ ${task.platform} (${task.lang}) posted: ${postResult.postUrl || 'no url'}`)
          } else {
            socialResults.push({ platform: task.platform, lang: task.lang, success: false, error: postResult.error || 'Unknown' })
            console.warn(`  ⚠️ ${task.platform} (${task.lang}) failed:`, postResult.error)
          }
        } catch (e: any) {
          socialResults.push({ platform: task.platform, lang: task.lang, success: false, error: 'Parse error' })
        }
      } else {
        socialResults.push({ platform: task.platform, lang: task.lang, success: false, error: result.reason?.message || 'Network error' })
        console.warn(`  ❌ ${task.platform} (${task.lang}) error:`, result.reason?.message)
      }
    }

    const successfulPosts = socialResults.filter(r => r.success).length
    const totalPosts = socialResults.length
    console.log(`📱 Social: ${successfulPosts}/${totalPosts} posted`)

    // ═══════════════════════════════════════════════════
    // STEP 6: Complete — send summary to Telegram
    // ═══════════════════════════════════════════════════
    await updateStatus(supabase, newsId, 'completed')

    await supabase
      .from('news')
      .update({ auto_publish_completed_at: new Date().toISOString() })
      .eq('id', newsId)

    // Build summary message
    const title = news.original_title?.substring(0, 80) || 'Untitled'
    const videoLabel = isVideoPost ? ' + 🎬 Video' : ''
    const imageStatus = (freshNews?.processed_image_url ? '✅ Image generated' : '⚠️ No image') + videoLabel
    const platformEmoji: Record<string, string> = { linkedin: '🔗', facebook: '📘', instagram: '📸' }
    const socialSummary = socialResults
      .map(r => {
        const emoji = r.success ? '✅' : '❌'
        const icon = platformEmoji[r.platform] || '📱'
        const link = r.success && r.postUrl ? ` <a href="${r.postUrl}">→ open</a>` : ''
        const err = r.error ? ': ' + r.error.substring(0, 30) : ''
        return `${emoji} ${icon} ${r.platform} (${r.lang.toUpperCase()})${link}${err}`
      })
      .join('\n')

    const norwayLabel = isNorwayRelated ? '\n🇳🇴 <b>Norway article → Norwegian only</b>' : ''
    const summaryLine = summary ? `\n💬 <i>${escapeHtml(summary.substring(0, 200))}</i>` : ''
    const summaryMessage = `🤖 <b>Auto-Published</b>${norwayLabel}\n\n📰 ${escapeHtml(title)}\n📌 ${escapeHtml(sourceName)}\n📊 Score: ${(news.rss_analysis as any)?.relevance_score || '?'}/10${summaryLine}\n🖼️ ${imageStatus}\n\n📱 <b>Social Media (${successfulPosts}/${totalPosts}):</b>\n${socialSummary}\n\n${successfulPosts === totalPosts ? '✅ All done!' : `⚠️ ${successfulPosts}/${totalPosts} succeeded`}`

    await editOrSendTelegramMessage(tgMessageId, summaryMessage)

    console.log('🎉 Auto-publish pipeline completed successfully!')

    return new Response(
      JSON.stringify({
        success: true,
        newsId,
        socialResults,
        message: `Auto-published: ${successfulPosts}/${totalPosts} social posts`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Auto-publish pipeline failed:', error)

    // Update status to failed
    if (newsId) {
      await supabase
        .from('news')
        .update({
          auto_publish_status: 'failed',
          auto_publish_error: error.message || 'Unknown error'
        })
        .eq('id', newsId)
    }

    // Edit original message with failure (or send new if no message to edit)
    const errorTitle = newsId ? `News ID: ${newsId.substring(0, 8)}...` : 'Unknown'
    // Try to get telegramMessageId from DB if not available from request
    let failMsgId = reqMsgId || null
    if (!failMsgId && newsId) {
      const { data: failNews } = await supabase
        .from('news')
        .select('telegram_message_id, original_title, rss_source_url')
        .eq('id', newsId)
        .single()
      failMsgId = failNews?.telegram_message_id || null
      // Try to show article title instead of just ID
      if (failNews?.original_title) {
        const failTitle = escapeHtml(failNews.original_title.substring(0, 80))
        let failSourceName = ''
        if (failNews?.rss_source_url) {
          const { data: fSrc } = await supabase
            .from('news_sources')
            .select('name')
            .eq('rss_url', failNews.rss_source_url)
            .single()
          if (fSrc?.name) failSourceName = `\n📌 ${escapeHtml(fSrc.name)}`
        }
        await editOrSendTelegramMessage(
          failMsgId,
          `❌ <b>Auto-Publish Failed</b>\n\n📰 ${failTitle}${failSourceName}\n💥 ${escapeHtml(error.message?.substring(0, 200) || 'Unknown error')}\n\n⚠️ <i>Потребує ручної модерації в Telegram боті</i>`
        )
        return new Response(
          JSON.stringify({ success: false, newsId, error: error.message || 'Unknown error' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    await editOrSendTelegramMessage(
      failMsgId,
      `❌ <b>Auto-Publish Failed</b>\n\n📰 ${escapeHtml(errorTitle)}\n💥 ${escapeHtml(error.message?.substring(0, 200) || 'Unknown error')}\n\n⚠️ <i>Потребує ручної модерації в Telegram боті</i>`
    )

    return new Response(
      JSON.stringify({
        success: false,
        newsId,
        error: error.message || 'Unknown error'
      }),
      {
        status: 200, // Return 200 to not trigger retry
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// ═══════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════

async function updateStatus(supabase: any, newsId: string, status: string) {
  const update: Record<string, any> = { auto_publish_status: status }
  if (status === 'pending') {
    update.auto_publish_started_at = new Date().toISOString()
  }
  await supabase.from('news').update(update).eq('id', newsId)
  console.log(`📊 Status: ${status}`)
}

async function loadAutoPublishSettings(supabase: any) {
  const { data: settings } = await supabase
    .from('api_settings')
    .select('key_name, key_value')
    .in('key_name', ['AUTO_PUBLISH_PLATFORMS', 'AUTO_PUBLISH_LANGUAGES'])

  const platformsSetting = settings?.find((s: any) => s.key_name === 'AUTO_PUBLISH_PLATFORMS')
  const languagesSetting = settings?.find((s: any) => s.key_name === 'AUTO_PUBLISH_LANGUAGES')

  return {
    platforms: (platformsSetting?.key_value || 'linkedin,facebook,instagram').split(',').map((s: string) => s.trim()),
    languages: (languagesSetting?.key_value || 'en,no,ua').split(',').map((s: string) => s.trim())
  }
}

async function callFunction(name: string, body: any): Promise<Response> {
  return fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
}

/**
 * AI selects the best image variant using Azure OpenAI
 * Returns 0-based index, or -1 on failure
 */
async function aiSelectBestVariant(
  title: string,
  content: string,
  variants: Array<{ label: string; description: string }>
): Promise<number> {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
    console.warn('⚠️ Azure OpenAI not configured, defaulting to variant #1')
    return 0
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Load AI prompt
    const { data: prompts } = await supabase
      .from('ai_prompts')
      .select('prompt_text')
      .eq('prompt_type', 'image_variant_auto_select')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (!prompts || prompts.length === 0) {
      console.warn('⚠️ No image_variant_auto_select prompt found')
      return 0
    }

    const variantsText = variants
      .map((v, i) => `${i + 1}. [${v.label}] ${v.description}`)
      .join('\n')

    const promptText = prompts[0].prompt_text
      .replace('{title}', title.substring(0, 200))
      .replace('{content}', content.substring(0, 500))
      .replace('{variants}', variantsText)

    const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/Jobbot-gpt-4.1-mini/chat/completions?api-version=2024-02-15-preview`

    const response = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'api-key': AZURE_OPENAI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a visual editor. Respond ONLY with valid JSON.' },
          { role: 'user', content: promptText }
        ],
        temperature: 0.3,
        max_tokens: 150
      })
    })

    if (!response.ok) {
      console.warn('⚠️ AI variant selection API error:', response.status)
      return 0
    }

    const result = await response.json()
    const aiContent = result.choices[0]?.message?.content || ''
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/)

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const index = parsed.selected_index
      if (index >= 1 && index <= variants.length) {
        console.log(`🎯 AI selected variant #${index}: ${parsed.reason || 'no reason'}`)
        return index - 1 // Convert to 0-based
      }
    }

    return 0
  } catch (e) {
    console.warn('⚠️ AI variant selection error:', e)
    return 0
  }
}

async function sendTelegramMessage(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML'
      })
    })
  } catch (e) {
    console.warn('⚠️ Failed to send Telegram message:', e)
  }
}

/**
 * Edit existing Telegram message, fallback to sending new message if edit fails
 */
async function editOrSendTelegramMessage(messageId: number | null, text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return

  if (messageId) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          message_id: messageId,
          text,
          parse_mode: 'HTML'
        })
      })
      const result = await response.json()
      if (result.ok) {
        console.log(`✏️ Edited Telegram message ${messageId}`)
        return
      }
      console.warn(`⚠️ Edit failed (${result.description}), sending new message`)
    } catch (e) {
      console.warn('⚠️ Edit failed, sending new message:', e)
    }
  }

  // Fallback: send new message
  await sendTelegramMessage(text)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Detect if article is Norway-related using 3 signals:
 * 1. AI flag (from rss_analysis or persisted is_norway_related)
 * 2. Source domain (.no TLD or known Norwegian domains)
 * 3. Content keyword scan (for Telegram sources without rss_analysis)
 */
function detectNorwayArticle(news: any): boolean {
  // Signal 1: AI-detected flag
  if (news.is_norway_related === true) {
    console.log('🇳🇴 Norway signal: is_norway_related flag in DB')
    return true
  }
  if (news.rss_analysis?.is_norway_related === true) {
    console.log('🇳🇴 Norway signal: rss_analysis.is_norway_related')
    return true
  }

  // Signal 2: Source domain check
  const urls = [
    news.original_url,
    news.rss_source_url,
    news.source_link,
    ...(Array.isArray(news.source_links) ? news.source_links : [])
  ].filter(Boolean)

  for (const url of urls) {
    const urlLower = url.toLowerCase()
    // Check .no TLD (matches domain.no, domain.no/, domain.no?query, etc.)
    if (/\.no(?:[/?#]|$)/.test(urlLower)) {
      console.log(`🇳🇴 Norway signal: .no domain in ${url}`)
      return true
    }
    // Known Norwegian domains on non-.no TLDs
    if (urlLower.includes('lifeinnorway.net')) {
      console.log(`🇳🇴 Norway signal: known Norwegian domain in ${url}`)
      return true
    }
  }

  // Signal 3: Content keyword scan
  const text = `${news.original_title || ''} ${news.original_content || ''}`.toLowerCase()
  const norwayKeywords = [
    'norway', 'norwegian', 'norge', 'norsk',
    'oslo', 'bergen', 'trondheim', 'stavanger', 'tromsø', 'tromsoe', 'tromso',
    'skatteetaten', 'finanstilsynet', 'altinn', 'brønnøysund',
    'equinor', 'telenor', 'dnb bank', 'kongsberg', 'yara',
    'stortinget', 'regjeringen', 'statsbudsjettet',
    'innovasjon norge', 'forskningsrådet', 'norges bank',
  ]

  for (const kw of norwayKeywords) {
    if (text.includes(kw)) {
      console.log(`🇳🇴 Norway signal: keyword "${kw}" found in content`)
      return true
    }
  }

  return false
}
