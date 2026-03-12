import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/setup?error=${encodeURIComponent(error)}`, req.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/setup?error=missing_code', req.url))
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.APP_URL}/api/auth/google`,
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('Google token exchange failed:', text)
    return NextResponse.redirect(new URL('/setup?error=token_exchange_failed', req.url))
  }

  const data = await res.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  const expiresAt = Date.now() + data.expires_in * 1000 - 60_000

  await Promise.all([
    db.setting.upsert({
      where: { key: 'google_access_token' },
      update: { value: data.access_token },
      create: { key: 'google_access_token', value: data.access_token },
    }),
    db.setting.upsert({
      where: { key: 'google_refresh_token' },
      update: { value: data.refresh_token },
      create: { key: 'google_refresh_token', value: data.refresh_token },
    }),
    db.setting.upsert({
      where: { key: 'google_token_expires_at' },
      update: { value: String(expiresAt) },
      create: { key: 'google_token_expires_at', value: String(expiresAt) },
    }),
  ])

  return NextResponse.redirect(new URL('/setup?connected=google', req.url))
}
