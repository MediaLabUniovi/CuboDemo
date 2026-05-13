import { NextRequest, NextResponse } from 'next/server'
import { setState } from '@/lib/store'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const image = String(body.image ?? '').trim()
    const mac = String(body.mac ?? '').trim()

    if (!image) {
      return NextResponse.json(
        { error: 'Missing "image" field' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    await setState(image, mac)

    return NextResponse.json(
      { ok: true, image, mac },
      { status: 200, headers: CORS_HEADERS }
    )
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400, headers: CORS_HEADERS }
    )
  }
}
