import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Vitalii Berbeha - E-commerce & Marketing Expert'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Logo V */}
        <div
          style={{
            fontSize: 160,
            fontWeight: 900,
            color: '#fbbf24',
            lineHeight: 1,
            marginBottom: 20,
            textShadow: '4px 4px 8px rgba(0,0,0,0.3)',
            display: 'flex',
          }}
        >
          V
        </div>

        {/* Name */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: '#ffffff',
            marginBottom: 12,
            display: 'flex',
          }}
        >
          Vitalii Berbeha
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.85)',
            display: 'flex',
          }}
        >
          E-commerce & Marketing Expert | AI Project Leader
        </div>

        {/* URL */}
        <div
          style={{
            fontSize: 20,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.6)',
            marginTop: 24,
            display: 'flex',
          }}
        >
          vitalii.no
        </div>
      </div>
    ),
    { ...size }
  )
}
