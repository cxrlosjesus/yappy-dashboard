import { NextRequest, NextResponse } from 'next/server'
import { runGmailSync } from '@/lib/gmail-sync-logic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.AUTH_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const result = await runGmailSync()
    return NextResponse.json({ ok: true, ...result })
  } catch (error: any) {
    console.error('Error en sync:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
