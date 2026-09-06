import { ImageResponse } from 'next/og'

export const size        = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      // Fondo negro (igual que el stroke del octágono)
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
        {/* Octágono exterior — anillo blanco */}
        <div
          style={{
            width: 158,
            height: 158,
            background: 'white',
            clipPath:
              'polygon(33.5% 5%, 66.5% 5%, 95% 33.5%, 95% 66.5%, 66.5% 95%, 33.5% 95%, 5% 66.5%, 5% 33.5%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Octágono interior — anillo oscuro (efecto doble borde) */}
          <div
            style={{
              width: 148,
              height: 148,
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
                width: 136,
                height: 136,
                background: 'white',
                clipPath:
                  'polygon(33.5% 5%, 66.5% 5%, 95% 33.5%, 95% 66.5%, 66.5% 95%, 33.5% 95%, 5% 66.5%, 5% 33.5%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Letras AP en naranja */}
              <span
                style={{
                  color: '#EC6E00',
                  fontSize: 58,
                  fontWeight: 900,
                  fontFamily: 'Arial Black, Arial, sans-serif',
                  letterSpacing: '-2px',
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
    ),
    { ...size },
  )
}
