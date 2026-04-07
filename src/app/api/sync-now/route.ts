import { NextResponse } from 'next/server'

// Este endpoint es llamado desde el dashboard (protegido por cookie de sesión via middleware)
// Internamente llama al gmail-sync con el secret
export async function POST(req: Request) {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  const res = await fetch(`${baseUrl}/api/gmail-sync`, {
    headers: { 'Authorization': `Bearer ${process.env.AUTH_SECRET}` },
  })

  const data = await res.json()
  return NextResponse.json(data)
}
