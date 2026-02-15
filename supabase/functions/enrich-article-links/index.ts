import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT')!
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY')!

interface EnrichRequest {
  articleId: string
  type: 'news' | 'blog'
}

interface ArticleLink {
  title: string
  slug: string
  route: string
}

/**
 * Enrich article content with Wikipedia-style inline hyperlinks.
 * Uses AI to find phrases in the text that semantically match
 * existing articles on the site and converts them to internal links.
 */
serve(async (req) => {
  // Version: 2.0.0 - AI-powered inline contextual linking (Wikipedia-style)
  console.log('🔗 Enrich Article Links v2.0.0 - Inline Wikipedia-style')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { articleId, type }: EnrichRequest = await req.json()
    console.log(`🔗 Enriching ${type} article: ${articleId}`)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Fetch the article
    const table = type === 'blog' ? 'blog_posts' : 'news'
    const { data: article, error: fetchError } = await supabase
      .from(table)
      .select('id, tags, content_en, content_no, content_ua')
      .eq('id', articleId)
      .single()

    if (fetchError || !article) {
      throw new Error(`Article not found: ${articleId}`)
    }

    const tags = article.tags
    if (!tags || tags.length === 0) {
      return new Response(
        JSON.stringify({ success: true, linksAdded: 0, reason: 'no tags' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Find related articles by overlapping tags
    const relatedByLang: { en: ArticleLink[], no: ArticleLink[], ua: ArticleLink[] } = { en: [], no: [], ua: [] }

    // Query news
    const newsQuery = supabase
      .from('news')
      .select('id, title_en, title_no, title_ua, slug_en, slug_no, slug_ua')
      .overlaps('tags', tags)
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(10)

    if (type === 'news') newsQuery.neq('id', articleId)
    const { data: relatedNews } = await newsQuery

    if (relatedNews) {
      for (const n of relatedNews) {
        if (n.slug_en && n.title_en) relatedByLang.en.push({ title: n.title_en, slug: n.slug_en, route: '/news' })
        if (n.slug_no && n.title_no) relatedByLang.no.push({ title: n.title_no, slug: n.slug_no, route: '/news' })
        if (n.slug_ua && n.title_ua) relatedByLang.ua.push({ title: n.title_ua, slug: n.slug_ua, route: '/news' })
      }
    }

    // Query blog posts
    const blogQuery = supabase
      .from('blog_posts')
      .select('id, title_en, title_no, title_ua, slug_en, slug_no, slug_ua')
      .overlaps('tags', tags)
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(10)

    if (type === 'blog') blogQuery.neq('id', articleId)
    const { data: relatedBlog } = await blogQuery

    if (relatedBlog) {
      for (const b of relatedBlog) {
        if (b.slug_en && b.title_en) relatedByLang.en.push({ title: b.title_en, slug: b.slug_en, route: '/blog' })
        if (b.slug_no && b.title_no) relatedByLang.no.push({ title: b.title_no, slug: b.slug_no, route: '/blog' })
        if (b.slug_ua && b.title_ua) relatedByLang.ua.push({ title: b.title_ua, slug: b.slug_ua, route: '/blog' })
      }
    }

    if (relatedByLang.en.length === 0) {
      return new Response(
        JSON.stringify({ success: true, linksAdded: 0, reason: 'no related articles' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📎 Related candidates: EN=${relatedByLang.en.length}, NO=${relatedByLang.no.length}, UA=${relatedByLang.ua.length}`)

    // 3. Use AI to insert inline links for each language
    const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/Jobbot-gpt-4.1-mini/chat/completions?api-version=2024-02-15-preview`
    const updateData: Record<string, string> = {}
    let totalLinksInserted = 0

    const langs: Array<{ key: 'en' | 'no' | 'ua', contentField: string }> = [
      { key: 'en', contentField: 'content_en' },
      { key: 'no', contentField: 'content_no' },
      { key: 'ua', contentField: 'content_ua' },
    ]

    for (const { key, contentField } of langs) {
      const content = article[contentField as keyof typeof article] as string
      const links = relatedByLang[key]

      if (!content || links.length === 0) continue

      // Build the available articles list for AI
      const articlesListForAI = links.map((l, i) =>
        `${i + 1}. "${l.title}" → ${l.route}/${l.slug}`
      ).join('\n')

      const response = await fetch(azureUrl, {
        method: 'POST',
        headers: {
          'api-key': AZURE_OPENAI_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are a Wikipedia-style editor. Your task is to find phrases in the article text that semantically relate to the given list of existing articles, and convert those phrases into markdown hyperlinks.

Rules:
- Insert 2-5 inline links maximum (don't overlink)
- Link natural phrases that already exist in the text — do NOT add new text
- The anchor text should be a short phrase (2-6 words) that naturally exists in the article
- Use the exact URL provided for each article
- Do NOT link the same article twice
- Do NOT link phrases inside existing markdown links, headings, or bold/italic markers
- Do NOT add any "Related articles" section at the bottom
- Keep all existing formatting, paragraphs, and structure exactly the same
- Return ONLY the modified article text, nothing else — no explanations, no preamble`
            },
            {
              role: 'user',
              content: `ARTICLE TEXT:
${content}

AVAILABLE ARTICLES TO LINK TO:
${articlesListForAI}

Return the article text with inline hyperlinks inserted where relevant phrases match the available articles.`
            }
          ],
          temperature: 0.2,
          max_tokens: 4000
        })
      })

      if (!response.ok) {
        console.error(`AI error for ${key}:`, await response.text())
        continue
      }

      const data = await response.json()
      const enrichedContent = data.choices[0]?.message?.content?.trim()

      if (!enrichedContent) {
        console.error(`Empty AI response for ${key}`)
        continue
      }

      // Count how many links were added (compare markdown link patterns)
      const originalLinks = (content.match(/\[([^\]]+)\]\(\/(?:news|blog)\/[^)]+\)/g) || []).length
      const newLinks = (enrichedContent.match(/\[([^\]]+)\]\(\/(?:news|blog)\/[^)]+\)/g) || []).length
      const linksAdded = newLinks - originalLinks

      if (linksAdded > 0) {
        updateData[contentField] = enrichedContent
        totalLinksInserted += linksAdded
        console.log(`✅ ${key}: +${linksAdded} inline links`)
      } else {
        console.log(`⏭️ ${key}: no links inserted`)
      }
    }

    // 4. Save updated content
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', articleId)

      if (updateError) {
        console.error('Failed to update article:', updateError)
        throw updateError
      }

      console.log(`✅ Article enriched with ${totalLinksInserted} inline links`)
    } else {
      console.log('⚠️ No inline links were inserted')
    }

    return new Response(
      JSON.stringify({
        success: true,
        linksAdded: totalLinksInserted
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error enriching article links:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
