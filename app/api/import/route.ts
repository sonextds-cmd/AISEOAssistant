import { NextRequest } from 'next/server';
import { IMPORT_STORAGE_KEY } from '@/lib/importQueue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Receives a page captured by the bookmarklet (form POST from the user's browser),
// queues it in localStorage, then hands off to the dashboard which picks it up.
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const url = String(form.get('url') ?? '');
  const html = String(form.get('html') ?? '');

  const payload = JSON.stringify({ url, html }).replace(/</g, '\\u003c');
  const page = `<!doctype html><meta charset="utf-8"><title>SEO Audit import</title>
<body style="font-family:sans-serif;background:#020617;color:#e2e8f0;padding:24px">กำลังส่งหน้าเว็บไปวิเคราะห์...
<script>
try {
  var key = ${JSON.stringify(IMPORT_STORAGE_KEY)};
  var queue = JSON.parse(localStorage.getItem(key) || '[]');
  queue.push(${payload});
  localStorage.setItem(key, JSON.stringify(queue));
  location.replace('/');
} catch (e) {
  document.body.textContent = 'นำเข้าไม่สำเร็จ: ' + e.message;
}
</script>`;

  return new Response(page, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
