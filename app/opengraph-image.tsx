import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'GitHub Architecture Visualizer'
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center',
              letterSpacing: '-0.02em',
            }}
          >
            GitHub Architecture
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center',
              letterSpacing: '-0.02em',
            }}
          >
            Visualizer
          </div>
          <div
            style={{
              fontSize: 32,
              color: 'rgba(255, 255, 255, 0.9)',
              textAlign: 'center',
              marginTop: '20px',
            }}
          >
            Analyze your organization&apos;s tech stack
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            display: 'flex',
            gap: '20px',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: 24,
              color: 'rgba(255, 255, 255, 0.8)',
            }}
          >
            🔍 Detect Frameworks
          </div>
          <div
            style={{
              fontSize: 24,
              color: 'rgba(255, 255, 255, 0.8)',
            }}
          >
            📊 Visualize Stack
          </div>
          <div
            style={{
              fontSize: 24,
              color: 'rgba(255, 255, 255, 0.8)',
            }}
          >
            🚀 Track Infrastructure
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
