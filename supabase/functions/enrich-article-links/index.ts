import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface EnrichRequest {
  articleId: string
  type: 'news' | 'blog'
}

interface RelatedArticle {
  title: string
  slug: string
  route: string // '/news' or '/blog'
}

interface RelatedByLang {
  en: RelatedArticle[]
  no: RelatedArticle[]
  ua: RelatedArticle[]
}

/**
 * Enrich article content with internal cross-links to related articles.
 * Finds related published articles by overlapping tags and appends
 * a "Related articles" section with internal links.
 */
serve(async (req) => {
  console.log('🔗 Enrich Article Links v1.0.0 started')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { articleId, type }: EnrichRequest = await req.json()
    console.log(`🔗 Enriching ${type} article: ${articleId}`)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Fetch the article to get its tags and current content
    const table = type === 'blog' ? 'blog_posts' : 'news'
    const { data: article, error: fetchError } = await supabase
      .from(table)
      .select('id, tags, content_en, content_no, content_ua, slug_en, slug_no, slug_ua')
      .eq('id', articleId)
      .single()

    if (fetchError || !article) {
      console.error('Failed to fetch article:', fetchError)
      throw new Error(`Article not found: ${articleId}`)
    }

    const tags = article.tags
    if (!tags || tags.length === 0) {
      console.log('⚠️ No tags found, skipping cross-linking')
      return new Response(
        JSON.stringify({ success: true, linksAdded: 0, reason: 'no tags' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📌 Tags: ${tags.join(', ')}`)

    // 2. Find related articles from both news and blog_posts
    const related: RelatedByLang = { en: [], no: [], ua: [] }

    // Query related news (exclude self if type is news)
    const newsQuery = supabase
      .from('news')
      .select('id, title_en, title_no, title_ua, slug_en, slug_no, slug_ua')
      .overlaps('tags', tags)
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(4)

    if (type === 'news') {
      newsQuery.neq('id', articleId)
    }

    const { data: relatedNews } = await newsQuery

    if (relatedNews) {
      for (const n of relatedNews) {
        if (n.slug_en && n.title_en) related.en.push({ title: n.title_en, slug: n.slug_en, route: '/news' })
        if (n.slug_no && n.title_no) related.no.push({ title: n.title_no, slug: n.slug_no, route: '/news' })
        if (n.slug_ua && n.title_ua) related.ua.push({ title: n.title_ua, slug: n.slug_ua, route: '/news' })
      }
    }

    // Query related blog posts (exclude self if type is blog)
    const blogQuery = supabase
      .from('blog_posts')
      .select('id, title_en, title_no, title_ua, slug_en, slug_no, slug_ua')
      .overlaps('tags', tags)
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(4)

    if (type === 'blog') {
      blogQuery.neq('id', articleId)
    }

    const { data: relatedBlog } = await blogQuery

    if (relatedBlog) {
      for (const b of relatedBlog) {
        if (b.slug_en && b.title_en) related.en.push({ title: b.title_en, slug: b.slug_en, route: '/blog' })
        if (b.slug_no && b.title_no) related.no.push({ title: b.title_no, slug: b.slug_no, route: '/blog' })
        if (b.slug_ua && b.title_ua) related.ua.push({ title: b.title_ua, slug: b.slug_ua, route: '/blog' })
      }
    }

    // Limit to 3 related articles per language
    related.en = related.en.slice(0, 3)
    related.no = related.no.slice(0, 3)
    related.ua = related.ua.slice(0, 3)

    if (related.en.length === 0 && related.no.length === 0 && related.ua.length === 0) {
      console.log('⚠️ No related articles found')
      return new Response(
        JSON.stringify({ success: true, linksAdded: 0, reason: 'no related articles' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📎 Found related: EN=${related.en.length}, NO=${related.no.length}, UA=${related.ua.length}`)

    // 3. Build markdown sections and append to content
    const buildSection = (articles: RelatedArticle[], header: string): string => {
      if (articles.length === 0) return ''
      const links = articles.map(a => `[${a.title}](${a.route}/${a.slug})`).join('  |  ')
      return `\n\n---\n\n**${header}:** ${links}`
    }

    const updateData: Record<string, string> = {}

    if (related.en.length > 0 && article.content_en) {
      updateData.content_en = article.content_en + buildSection(related.en, 'Related articles')
    }
    if (related.no.length > 0 && article.content_no) {
      updateData.content_no = article.content_no + buildSection(related.no, 'Relaterte artikler')
    }
    if (related.ua.length > 0 && article.content_ua) {
      updateData.content_ua = article.content_ua + buildSection(related.ua, 'Пов\'язані статті')
    }

    if (Object.keys(updateData).length === 0) {
      console.log('⚠️ No content to update')
      return new Response(
        JSON.stringify({ success: true, linksAdded: 0, reason: 'no content fields to update' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Update article with enriched content
    const { error: updateError } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', articleId)

    if (updateError) {
      console.error('Failed to update article:', updateError)
      throw updateError
    }

    const totalLinks = related.en.length + related.no.length + related.ua.length
    console.log(`✅ Article enriched with ${totalLinks} cross-links`)

    return new Response(
      JSON.stringify({
        success: true,
        linksAdded: totalLinks,
        related: {
          en: related.en.length,
          no: related.no.length,
          ua: related.ua.length
        }
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
