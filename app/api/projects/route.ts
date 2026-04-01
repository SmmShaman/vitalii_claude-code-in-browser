import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function GET() {
  if (!supabaseUrl || !supabaseAnonKey) {
    const { projects } = await import('@/data/features')
    return NextResponse.json({ projects, source: 'static' })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: rows, error } = await supabase
      .from('feature_projects')
      .select('*')
      .eq('is_active', true)
      .order('name_en', { ascending: true })

    if (error) throw error

    // Count features per project for display
    const { data: featureCounts } = await supabase
      .from('features')
      .select('project_id')
      .eq('status', 'published')

    const countMap: Record<string, number> = {}
    for (const f of featureCounts || []) {
      countMap[f.project_id] = (countMap[f.project_id] || 0) + 1
    }

    const projects = (rows || []).map(r => ({
      id: r.id,
      name: { en: r.name_en, no: r.name_no, ua: r.name_ua },
      description: { en: r.description_en, no: r.description_no, ua: r.description_ua },
      url: r.repo_url || undefined,
      badge: r.badge || r.id.charAt(0).toUpperCase(),
      color: {
        bg: r.color_bg || 'bg-gray-500/20',
        text: r.color_text || 'text-gray-400',
      },
      imageUrl: r.image_url || undefined,
      featureCount: countMap[r.id] || 0,
    }))

    return NextResponse.json({ projects, source: 'database', total: projects.length })
  } catch (err) {
    console.error('Projects API error:', err)
    const { projects } = await import('@/data/features')
    return NextResponse.json({ projects, source: 'static_fallback' })
  }
}
