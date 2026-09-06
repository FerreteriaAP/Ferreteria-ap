import { ImageResponse } from 'next/og'

export const size        = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      // Fondo blanco
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Octágono exterior — borde negro grueso */}
        <div
          style={{
            width: 166,
            height: 166,
            background: '#1C1C1C',
            clipPath:
              'polygon(33.5% 5%, 66.5% 5%, 95% 33.5%, 95% 66.5%, 66.5% 95%, 33.5% 95%, 5% 66.5%, 5% 33.5%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Interior blanco del octágono */}
          <div
            style={{
              width: 148,
              height: 148,
              background: 'white',
              clipPath:
                'polygon(33.5% 5%, 66.5% 5%, 95% 33.5%, 95% 66.5%, 66.5% 95%, 33.5% 95%, 5% 66.5%, 5% 33.5%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Segundo anillo negro fino */}
            <div
              style={{
                width: 140,
                height: 140,
                background: '#1C1C1C',
                clipPath:
                  'polygon(33.5% 5%, 66.5% 5%, 95% 33.5%, 95% 66.5%, 66.5% 95%, 33.5% 95%, 5% 66.5%, 5% 33.5%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Relleno blanco interior */}
              <div
                style={{
                  width: 134,
                  height: 134,
                  background: 'white',
                  clipPath:
                    'polygon(33.5% 5%, 66.5% 5%, 95% 33.5%, 95% 66.5%, 66.5% 95%, 33.5% 95%, 5% 66.5%, 5% 33.5%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* AP en naranja — bien grueso */}
                <span
                  style={{
                    color: '#EC6E00',
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
