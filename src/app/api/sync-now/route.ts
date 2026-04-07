import { NextResponse } from 'next/server'
import { runGmailSync } from '@/lib/gmail-sync-logic'

export async function POST() {
  try {
    const result = await runGmailSync()
    return NextResponse.json({ ok: true, ...result })
  } catch (error: any) {
    console.error('Error en sync-now:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
