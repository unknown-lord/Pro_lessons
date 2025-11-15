import { NextResponse } from 'next/server';

export async function GET() {
  // Only return whether the key exists; do NOT expose the key itself
  const hasKey = !!process.env.GEMINI_API_KEY;
  return NextResponse.json({ ok: true, hasKey });
}