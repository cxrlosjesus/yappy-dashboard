import http from 'http'
import { exec } from 'child_process'

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI  = 'http://localhost:3333'
const SCOPE         = 'https://www.googleapis.com/auth/gmail.readonly'

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth` +
  `?client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPE)}` +
  `&access_type=offline` +
  `&prompt=consent`

console.log('\n🔐 Abriendo Google para autorizar...\n')

// Abrir el navegador
const cmd = process.platform === 'win32' ? `start "" "${authUrl}"` : `open "${authUrl}"`
exec(cmd)

// Servidor local para recibir el callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI)
  const code = url.searchParams.get('code')

  if (!code) {
    res.end('No se recibió código.')
    return
  }

  res.end('<h2>✅ Autorizado. Puedes cerrar esta ventana.</h2>')
  server.close()

  // Intercambiar código por tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
      grant_type:    'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()

  if (tokens.refresh_token) {
    console.log('✅ ¡Listo! Agrega estas variables en Vercel:\n')
    console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`)
    console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`)
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`)
    console.log('\n')
  } else {
    console.log('❌ Error:', JSON.stringify(tokens, null, 2))
  }
})

server.listen(3333, () => {
  console.log('Esperando autorización en http://localhost:3333...')
})
