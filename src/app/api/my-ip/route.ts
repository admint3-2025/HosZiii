import { NextRequest, NextResponse } from 'next/server'

export function GET(req: NextRequest) {
  const headers = req.headers

  const maybeXff = headers.get('x-forwarded-for')
  const ip = (maybeXff && maybeXff.split(',')[0].trim()) || headers.get('cf-connecting-ip') || headers.get('x-real-ip') || headers.get('x-client-ip') || 'unknown'

  return NextResponse.json({ ip })
}
