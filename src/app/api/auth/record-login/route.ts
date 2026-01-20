import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const headers = req.headers

    // Verify the caller has a valid session via server client (reads cookies)
    const serverClient = await createSupabaseServerClient()
    const { data: sessionData } = await serverClient.auth.getUser()
    const currentUserId = sessionData?.user?.id || null
    if (!currentUserId) {
      return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })
    }

    const userAgent = body?.userAgent || headers.get('user-agent') || null
    const maybeXff = headers.get('x-forwarded-for')
    const ip = (maybeXff && maybeXff.split(',')[0].trim()) || headers.get('cf-connecting-ip') || headers.get('x-real-ip') || headers.get('x-client-ip') || null

    const admin = createSupabaseAdminClient()
    const insertV2 = {
      user_id: currentUserId,
      ip,
      user_agent: userAgent,
      event: 'LOGIN',
      success: true,
      email: sessionData?.user?.email || null,
      error: null,
    }
    const insertV1 = {
      user_id: currentUserId,
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
