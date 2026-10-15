import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';
import { NextRequest, NextResponse } from 'next/server';
import { analyzeHtml } from '@/lib/analyzer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; AI-SEO-Assistant/2.0; +https://vercel.com)',
  Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br'
};
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 20000;

type FetchedPage = { status: number; url: string; headers: http.IncomingHttpHeaders; body: string };

function decode(res: http.IncomingMessage) {
  switch (res.headers['content-encoding']) {
    case 'gzip':
      return res.pipe(zlib.createGunzip());
    case 'deflate':
      return res.pipe(zlib.createInflate());
    case 'br':
      return res.pipe(zlib.createBrotliDecompress());
    default:
      return res;
  }
}

// Uses node:https instead of global fetch (undici): on Node 22+ Cloudflare challenges
// undici requests to some sites (e.g. sonext.asia) that it lets through from node:https.
function fetchPage(url: string, redirectsLeft = MAX_REDIRECTS): Promise<FetchedPage> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('http://') ? http : https;
    const req = client.get(url, { headers: REQUEST_HEADERS, timeout: TIMEOUT_MS }, (res) => {
      const status = res.statusCode ?? 0;
      const location = res.headers.location;
      if (status >= 300 && status < 400 && location) {
        res.resume();
        if (redirectsLeft === 0) return reject(new Error('Redirect มากเกินไป'));
        return resolve(fetchPage(new URL(location, url).toString(), redirectsLeft - 1));
      }
      const chunks: Buffer[] = [];
      decode(res)
        .on('data', (chunk: Buffer) => chunks.push(chunk))
        .on('end', () => resolve({ status, url, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }))
        .on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('หมดเวลาในการดึงหน้าเว็บ')));
    req.on('error', reject);
  });
}

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('กรุณาใส่ URL');
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

export async function POST(req: NextRequest) {
  try {
    const { url, focusKeyword, html: providedHtml } = await req.json();
    const normalizedUrl = normalizeUrl(url);
    const target = new URL(normalizedUrl);
    const keyword = typeof focusKeyword === 'string' ? focusKeyword : '';

    // HTML captured by the user's browser (bookmarklet) — used for sites that block server-side fetches
    if (typeof providedHtml === 'string' && providedHtml.trim()) {
      return NextResponse.json(analyzeHtml(providedHtml, target.toString(), keyword));
    }

    const page = await fetchPage(target.toString());

    if (page.status === 403 || page.status === 429) {
      const pageTitle = page.body.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? '';
      const mitigated = page.headers['cf-mitigated'];
      return NextResponse.json(
        {
          error: `เว็บไซต์ปลายทางบล็อกการดึงข้อมูลอัตโนมัติ (${page.status}) — เปิดหน้านั้นในเบราว์เซอร์แล้วกด bookmarklet "ส่งไป SEO Audit" แทน`,
          blockedBy: mitigated ? `Cloudflare (${mitigated})` : page.headers.server || 'unknown',
          cfRay: page.headers['cf-ray'] ?? null,
          pageTitle,
          bodySnippet: page.body.replace(/\s+/g, ' ').slice(0, 300)
        },
        { status: 400 }
      );
    }

    if (page.status < 200 || page.status >= 300) {
      return NextResponse.json({ error: `ไม่สามารถดึงหน้าเว็บได้ (${page.status})` }, { status: 400 });
    }

    const contentType = page.headers['content-type'] || '';
    if (!contentType.includes('text/html')) {
      return NextResponse.json({ error: 'URL นี้ไม่ได้ส่งกลับเป็นหน้า HTML ที่วิเคราะห์ได้' }, { status: 400 });
    }

    const result = analyzeHtml(page.body, page.url, keyword);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
