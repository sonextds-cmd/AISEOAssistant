import { NextRequest, NextResponse } from 'next/server';
import { analyzeHtml } from '@/lib/analyzer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('กรุณาใส่ URL');
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

export async function POST(req: NextRequest) {
  try {
    const { url, focusKeyword } = await req.json();
    const normalizedUrl = normalizeUrl(url);
    const target = new URL(normalizedUrl);

    const response = await fetch(target.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-SEO-Assistant/2.0; +https://vercel.com)'
      },
      redirect: 'follow',
      cache: 'no-store'
    });

    if (!response.ok) {
      return NextResponse.json({ error: `ไม่สามารถดึงหน้าเว็บได้ (${response.status})` }, { status: 400 });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return NextResponse.json({ error: 'URL นี้ไม่ได้ส่งกลับเป็นหน้า HTML ที่วิเคราะห์ได้' }, { status: 400 });
    }

    const html = await response.text();
    const result = analyzeHtml(html, response.url || target.toString(), typeof focusKeyword === 'string' ? focusKeyword : '');

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
