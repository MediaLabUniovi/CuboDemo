import { NextRequest, NextResponse } from 'next/server'
import { deleteMac, setAlias } from '@/lib/store'

// DELETE /api/macs  { mac }  → elimina MAC y su alias
export async function DELETE(req: NextRequest) {
  try {
    const { mac } = await req.json()
    if (!mac) return NextResponse.json({ error: 'Missing mac' }, { status: 400 })
    await deleteMac(mac)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

// PATCH /api/macs  { mac, alias }  → guarda o borra alias
export async function PATCH(req: NextRequest) {
  try {
    const { mac, alias } = await req.json()
    if (!mac) return NextResponse.json({ error: 'Missing mac' }, { status: 400 })
    await setAlias(mac, alias ?? '')
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
