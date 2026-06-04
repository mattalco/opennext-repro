import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function GET() {
  revalidateTag('pages', { expire: 0 });

  return NextResponse.json({
    revalidated: true,
    tag: 'pages',
    now: Date.now(),
  });
}
