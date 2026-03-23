import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function GET() {
  if (!supabaseUrl || !supabaseAnonKey) {
    // Fallback to static data if Supabase not configured
    const { allFeatures } = await import('@/data/features')
    return NextResponse.json({ features: allFeatures, source: 'static' })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: features, error } = await supabase
      .from('features')
      .select('*')
      .eq('status', 'published')
      .order('feature_id', { ascending: true })

    if (error) throw error

    // Transform DB rows to Feature interface format
    const formatted = (features || []).map(f => ({
      id: f.feature_id,
      projectId: f.project_id,
      category: f.category,
      title: { en: f.title_en, no: f.title_no, ua: f.title_ua },
      shortDescription: { en: f.short_description_en, no: f.short_description_no, ua: f.short_description_ua },
      problem: { en: f.problem_en, no: f.problem_no, ua: f.problem_ua },
      solution: { en: f.solution_en, no: f.solution_no, ua: f.solution_ua },
      result: { en: f.result_en, no: f.result_no, ua: f.result_ua },
      techStack: f.tech_stack || [],
      hashtags: f.hashtags || [],
    }))

    return NextResponse.json({ features: formatted, source: 'database', total: formatted.length })
  } catch (err) {
    console.error('Features API error:', err)
    // Fallback to static
    const { allFeatures } = await import('@/data/features')
    return NextResponse.json({ features: allFeatures, source: 'static_fallback' })
  }
}
