import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    '';
  const model = (
    process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash'
  ).replace(/^models\//, '');

  return NextResponse.json(
    {
      configured: Boolean(apiKey),
      provider: 'Google Gemini',
      model,
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
