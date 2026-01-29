import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { ok: false, error: 'Supabase not configured' },
      { status: 500 }
    )
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/monitor-rss-sources`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ source: 'dashboard' })
      }
    )

    const result = await response.json()

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('RSS sync error:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
