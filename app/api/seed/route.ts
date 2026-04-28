import { NextResponse } from 'next/server';
import { initSeedIfNeeded } from '../../_lib/seed';

export async function POST() {
  try {
    await initSeedIfNeeded();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[seed] errore:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
