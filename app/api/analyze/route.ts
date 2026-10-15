import { NextRequest, NextResponse } from 'next/server';
import { analyzeHtml } from '@/lib/analyzer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Upgrade-Insecure-Requests': '1'
};

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
      headers: BROWSER_HEADERS,
      redirect: 'follow',
      cache: 'no-store'
    });

    if (response.status === 403 || response.status === 429) {
      const body = await response.text().catch(() => '');
      const pageTitle = body.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? '';
      const blockedBy = response.headers.get('cf-mitigated')
        ? `Cloudflare (${response.headers.get('cf-mitigated')})`
        : response.headers.get('server') || 'unknown';
      return NextResponse.json(
        {
          error: `เว็บไซต์ปลายทางบล็อกการดึงข้อมูลอัตโนมัติ (${response.status}) — ตรวจสอบว่า Cloudflare/Firewall หรือปลั๊กอินความปลอดภัยไม่ได้บล็อก bot หรือ IP ของ Vercel`,
          blockedBy,
          cfRay: response.headers.get('cf-ray'),
          pageTitle,
          bodySnippet: body.replace(/\s+/g, ' ').slice(0, 300)
        },
        { status: 400 }
      );
    }

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
