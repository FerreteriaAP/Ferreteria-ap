import { ImageResponse } from 'next/og'

export const size        = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      // Fondo negro
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#1C1C1C',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Octágono exterior — borde blanco grueso */}
        <div
          style={{
            width: 168,
            height: 168,
            background: 'white',
            clipPath:
              'polygon(33.5% 5%, 66.5% 5%, 95% 33.5%, 95% 66.5%, 66.5% 95%, 33.5% 95%, 5% 66.5%, 5% 33.5%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Relleno negro interior */}
          <div
            style={{
              width: 154,
              height: 154,
              background: '#1C1C1C',
              clipPath:
                'polygon(33.5% 5%, 66.5% 5%, 95% 33.5%, 95% 66.5%, 66.5% 95%, 33.5% 95%, 5% 66.5%, 5% 33.5%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Segundo anillo blanco fino */}
            <div
              style={{
                width: 146,
                height: 146,
                background: 'white',
                clipPath:
                  'polygon(33.5% 5%, 66.5% 5%, 95% 33.5%, 95% 66.5%, 66.5% 95%, 33.5% 95%, 5% 66.5%, 5% 33.5%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Relleno negro interior final */}
              <div
                style={{
                  width: 138,
                  height: 138,
                  background: '#1C1C1C',
                  clipPath:
                    'polygon(33.5% 5%, 66.5% 5%, 95% 33.5%, 95% 66.5%, 66.5% 95%, 33.5% 95%, 5% 66.5%, 5% 33.5%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* AP en blanco — bien grueso */}
                <span
                  style={{
                    color: 'white',
                    fontSize: 62,
                    fontWeight: 900,
                    fontFamily: 'Arial Black, Arial, sans-serif',
                    letterSpacing: '-3px',
                    lineHeight: 1,
                    marginTop: 6,
                  }}
                >
                  AP
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
