import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSafeServerUser } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const headers = req.headers

    // Verify the caller has a valid session without triggering refresh-token rotation.
    const user = await getSafeServerUser()
    if (!user?.id) {
      return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })
    }

    const userAgent = body?.userAgent || headers.get('user-agent') || null
    const maybeXff = headers.get('x-forwarded-for')
    const ip = (maybeXff && maybeXff.split(',')[0].trim()) || headers.get('cf-connecting-ip') || headers.get('x-real-ip') || headers.get('x-client-ip') || null

    const admin = createSupabaseAdminClient()
    const insertV2 = {
      user_id: user.id,
      ip,
      user_agent: userAgent,
      event: 'LOGIN',
      success: true,
      email: user.email || null,
      error: null,
    }
    const insertV1 = {
      user_id: user.id,
      ip,
      user_agent: userAgent,
    }

    const { error: insertErr } = await admin.from('login_audits').insert(insertV2 as any)
    if (insertErr) {
      await admin.from('login_audits').insert(insertV1 as any)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
