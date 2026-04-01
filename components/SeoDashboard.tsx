'use client';

import { useMemo, useState } from 'react';
import type { AnalysisResult, CheckItem, Status, YoastItem } from '@/lib/analyzer';
import { AlertCircle, CheckCircle2, Download, FileText, Gauge, Search, Table2 } from 'lucide-react';

type ExportFormat = 'csv' | 'docx';

function scoreTone(score: number) {
  if (score >= 80) {
    return {
      badge: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
      text: 'text-emerald-300',
      bar: 'bg-emerald-400'
    };
  }
  if (score >= 55) {
    return {
      badge: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
      text: 'text-amber-300',
      bar: 'bg-amber-400'
    };
  }
  return {
    badge: 'border-rose-400/30 bg-rose-500/10 text-rose-100',
    text: 'text-rose-300',
    bar: 'bg-rose-400'
  };
}

function statusTone(status: Status) {
  if (status === 'good') return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200';
  if (status === 'needs-work') return 'border-amber-400/30 bg-amber-500/10 text-amber-100';
  return 'border-rose-400/30 bg-rose-500/10 text-rose-100';
}

function statusLabel(status: Status) {
  if (status === 'good') return 'ผ่าน';
  if (status === 'needs-work') return 'ควรปรับ';
  return 'ต้องแก้';
}

function YoastLight({ label }: { label: AnalysisResult['yoastLabel'] }) {
  const map = {
    Green: 'bg-emerald-400 shadow-[0_0_24px_rgba(74,222,128,0.45)]',
    Orange: 'bg-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.45)]',
    Red: 'bg-rose-400 shadow-[0_0_24px_rgba(251,113,133,0.45)]'
  } as const;
  return <span className={`inline-block h-3.5 w-3.5 rounded-full ${map[label]}`} />;
}

function MetricBar({ value }: { value: number }) {
  const tone = scoreTone(value);
  return (
    <div className="space-y-2">
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <div className={`text-sm font-medium ${tone.text}`}>{value}/100</div>
    </div>
  );
}

function ScoreCard({ title, score, subtitle }: { title: string; score: number; subtitle: string }) {
  const tone = scoreTone(score);
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-400">{title}</div>
          <div className="mt-2 text-4xl font-bold text-white">{score}</div>
          <div className="mt-1 text-sm text-slate-400">{subtitle}</div>
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone.badge}`}>{score >= 80 ? 'ดีมาก' : score >= 55 ? 'กลาง' : 'ต้องแก้'}</div>
      </div>
      <div className="mt-4">
        <MetricBar value={score} />
      </div>
    </div>
  );
}

function YoastChecklist({ items }: { items: YoastItem[] }) {
  const grouped = {
    poor: items.filter((item) => item.status === 'poor'),
    needs: items.filter((item) => item.status === 'needs-work'),
    good: items.filter((item) => item.status === 'good')
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-lg font-semibold text-white">Yoast-style Checklist</div>
        <div className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-100">ต้องแก้ {grouped.poor.length}</div>
        <div className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-100">ควรปรับ {grouped.needs.length}</div>
        <div className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">ผ่าน {grouped.good.length}</div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className={`rounded-2xl border p-4 ${statusTone(item.status)}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">{item.label}</div>
              <div className="text-xs font-semibold uppercase">{statusLabel(item.status)}</div>
            </div>
            <div className="mt-2 text-sm leading-6 opacity-90">{item.details}</div>
            {typeof item.value !== 'undefined' ? <div className="mt-3 text-xs opacity-80">ค่า: {String(item.value)}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ZoneItemCard({ item }: { item: CheckItem }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-white">{item.label}</div>
          <div className="mt-2 text-sm leading-6 text-slate-300">{item.details}</div>
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(item.status)}`}>{item.score}/{item.maxScore}</div>
      </div>
      <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-3 text-sm leading-6 text-cyan-100">
        <span className="font-semibold">วิธีแก้:</span> {item.fix}
      </div>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

export default function SeoDashboard() {
  const [urlInput, setUrlInput] = useState('');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<AnalysisResult[]>([]);

  const primary = results[0] ?? null;
  const urls = useMemo(
    () => Array.from(new Set(urlInput.split(/\n+/).map((item) => item.trim()).filter(Boolean))).slice(0, 5),
    [urlInput]
  );

  const compareRows = useMemo(() => {
    return results.map((item) => ({
      url: item.analyzedUrl,
      title: item.title,
      overall: item.overallScore,
      yoast: item.yoastScore,
      readability: Number(item.raw.readabilityScore ?? 0),
      wordCount: Number(item.raw.wordCount ?? 0),
      titleLength: Number(item.raw.titleLength ?? 0),
      metaLength: Number(item.raw.metaDescriptionLength ?? 0),
      keywordDensity: Number(item.raw.keywordDensity ?? 0),
      internalLinks: Number(item.raw.internalLinks ?? 0),
      externalLinks: Number(item.raw.externalLinks ?? 0),
      altCoverage: Number(item.raw.altCoverage ?? 0)
    }));
  }, [results]);

  async function analyzeOne(targetUrl: string) {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl, focusKeyword })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `วิเคราะห์ ${targetUrl} ไม่สำเร็จ`);
    }
    return data as AnalysisResult;
  }

  async function handleAnalyze() {
    if (urls.length === 0) {
      setError('กรุณาใส่ URL อย่างน้อย 1 รายการ');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const analyzed: AnalysisResult[] = [];
      for (const targetUrl of urls) {
        // sequential to keep serverless requests gentle and avoid confusing errors for non-technical users
        const data = await analyzeOne(targetUrl);
        analyzed.push(data);
      }
      analyzed.sort((a, b) => b.overallScore - a.overallScore);
      setResults(analyzed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format: ExportFormat) {
    if (results.length === 0) return;

    const response = await fetch(`/api/export/${format}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analyses: results })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error || `export ${format} ไม่สำเร็จ`);
      return;
    }

    const blob = await response.blob();
    downloadBlob(blob, format === 'csv' ? 'ai-seo-report.csv' : 'ai-seo-report.docx');
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        <section className="rounded-[32px] border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">
                <Gauge className="h-4 w-4" /> AI SEO Assistant
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-5xl">ตรวจ SEO, Yoast-style score และเปรียบเทียบหลาย URL ในหน้าเดียว</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
                ใส่ได้สูงสุด 5 URL พร้อม Focus Keyword ระบบจะตรวจโครงสร้าง SEO, canonical, robots, Open Graph, Twitter Cards,
                heading hierarchy, keyword density, schema และสรุปออกมาให้อ่านง่ายแบบไฟเขียว-ไฟส้ม-ไฟแดง
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="text-sm font-semibold text-cyan-200">วิธีใช้</div>
              <ol className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
                <li>1. วาง URL แยกบรรทัดละ 1 ลิงก์</li>
                <li>2. ใส่คีย์เวิร์ดหลักที่อยากตรวจแบบ Yoast</li>
                <li>3. กด Analyze เพื่อดูคะแนนรวม + checklist</li>
                <li>4. Export รายงานเป็น CSV หรือ DOCX ได้ทันที</li>
              </ol>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1fr,320px]">
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">URLs (1 บรรทัดต่อ 1 URL, สูงสุด 5 URL)</label>
              <textarea
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={`https://example.com/article-1\nhttps://example.com/article-2`}
                className="min-h-[170px] w-full rounded-3xl border border-white/10 bg-slate-900/80 px-5 py-4 text-sm text-white outline-none ring-0 placeholder:text-slate-500"
              />
              <div className="text-xs text-slate-500">ตอนนี้พร้อมวิเคราะห์ {urls.length} URL</div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300">Focus Keyword</label>
                <input
                  value={focusKeyword}
                  onChange={(e) => setFocusKeyword(e.target.value)}
                  placeholder="เช่น ai seo"
                  className="mt-3 h-12 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 text-sm text-white outline-none placeholder:text-slate-500"
                />
              </div>
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Search className="h-4 w-4" />
                {loading ? 'กำลังวิเคราะห์...' : 'Analyze URLs'}
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleExport('csv')}
                  disabled={results.length === 0}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] text-sm font-semibold text-white disabled:opacity-40"
                >
                  <Table2 className="h-4 w-4" /> CSV
                </button>
                <button
                  onClick={() => handleExport('docx')}
                  disabled={results.length === 0}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] text-sm font-semibold text-white disabled:opacity-40"
                >
                  <FileText className="h-4 w-4" /> DOCX
                </button>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
              <div className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" /> {error}</div>
            </div>
          ) : null}
        </section>

        {results.length > 0 ? (
          <section className="mt-8 grid gap-4 xl:grid-cols-4">
            <ScoreCard title="คะแนนรวม" score={primary?.overallScore ?? 0} subtitle={primary?.scoreLabel ?? '-'} />
            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-slate-400">Yoast SEO Score</div>
                  <div className="mt-2 flex items-center gap-3 text-4xl font-bold text-white">
                    {primary?.yoastScore ?? 0}
                    {primary ? <YoastLight label={primary.yoastLabel} /> : null}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">อ่านง่ายขึ้นด้วยไฟเขียว-ไฟส้ม-ไฟแดง</div>
                </div>
                <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${scoreTone(primary?.yoastScore ?? 0).badge}`}>{primary?.yoastLabel ?? '-'}</div>
              </div>
              <div className="mt-4"><MetricBar value={primary?.yoastScore ?? 0} /></div>
            </div>
            <ScoreCard title="Readability" score={Number(primary?.raw.readabilityScore ?? 0)} subtitle="ยิ่งสูงยิ่งอ่านง่าย" />
            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
              <div className="text-sm text-slate-400">Top page</div>
              <div className="mt-3 line-clamp-2 text-lg font-semibold text-white">{primary?.title}</div>
              <div className="mt-3 text-sm text-slate-300">{primary?.analyzedUrl}</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-slate-300">Words {String(primary?.raw.wordCount ?? '-')}</span>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-slate-300">Internal {String(primary?.raw.internalLinks ?? '-')}</span>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-slate-300">External {String(primary?.raw.externalLinks ?? '-')}</span>
              </div>
            </div>
          </section>
        ) : null}

        {results.length > 1 ? (
          <section className="mt-8 rounded-[28px] border border-white/10 bg-slate-950/65 p-5">
            <div className="flex items-center gap-2 text-lg font-semibold text-white"><Table2 className="h-5 w-5 text-cyan-300" /> Compare URLs</div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-200">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="px-3 py-3">URL</th>
                    <th className="px-3 py-3">Overall</th>
                    <th className="px-3 py-3">Yoast</th>
                    <th className="px-3 py-3">Readability</th>
                    <th className="px-3 py-3">Words</th>
                    <th className="px-3 py-3">Title</th>
                    <th className="px-3 py-3">Meta</th>
                    <th className="px-3 py-3">Density</th>
                    <th className="px-3 py-3">Links</th>
                    <th className="px-3 py-3">Alt</th>
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row) => (
                    <tr key={row.url} className="border-b border-white/5 align-top">
                      <td className="max-w-[280px] px-3 py-4 text-slate-300">{row.url}</td>
                      <td className="px-3 py-4"><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${scoreTone(row.overall).badge}`}>{row.overall}</span></td>
                      <td className="px-3 py-4"><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${scoreTone(row.yoast).badge}`}>{row.yoast}</span></td>
                      <td className="px-3 py-4">{row.readability}</td>
                      <td className="px-3 py-4">{row.wordCount}</td>
                      <td className="px-3 py-4">{row.titleLength}</td>
                      <td className="px-3 py-4">{row.metaLength}</td>
                      <td className="px-3 py-4">{row.keywordDensity}%</td>
                      <td className="px-3 py-4">{row.internalLinks}/{row.externalLinks}</td>
                      <td className="px-3 py-4">{row.altCoverage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {primary ? (
          <div className="mt-8 grid gap-8 xl:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-8">
              <section className="rounded-[28px] border border-white/10 bg-slate-950/65 p-5">
                <div className="flex items-center gap-2 text-lg font-semibold text-white"><CheckCircle2 className="h-5 w-5 text-cyan-300" /> สรุปทั้ง 4 ZONE</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">{primary.overallZoneSummary}</div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {primary.zones.map((zone) => (
                    <div key={`${zone.zone}-summary`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">{zone.title}</div>
                          <div className="mt-2 text-sm leading-6 text-slate-300">{zone.summary}</div>
                        </div>
                        <div className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${scoreTone(zone.score).badge}`}>{zone.score}/100</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <YoastChecklist items={primary.yoastItems} />

              <section className="rounded-[28px] border border-white/10 bg-slate-950/65 p-5">
                <div className="flex items-center gap-2 text-lg font-semibold text-white"><Download className="h-5 w-5 text-cyan-300" /> Quick Wins</div>
                <div className="mt-4 grid gap-3">
                  {primary.quickWins.map((win) => (
                    <div key={win} className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4 text-sm leading-6 text-cyan-100">{win}</div>
                  ))}
                </div>
              </section>

              <section className="space-y-5">
                {primary.zones.map((zone) => (
                  <div key={zone.zone} className="rounded-[28px] border border-white/10 bg-slate-950/65 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold text-white">{zone.title}</div>
                        <div className="mt-1 text-sm text-slate-400">คะแนนโซน {zone.score}/100</div>
                        <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{zone.summary}</div>
                      </div>
                      <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${scoreTone(zone.score).badge}`}>{zone.score}/100</div>
                    </div>
                    <div className="mt-4"><MetricBar value={zone.score} /></div>
                    <div className="mt-5 grid gap-4">
                      {zone.items.map((item) => <ZoneItemCard key={item.id} item={item} />)}
                    </div>
                  </div>
                ))}
              </section>
            </div>

            <aside className="space-y-6">
              <div className="rounded-[28px] border border-white/10 bg-slate-950/65 p-5">
                <div className="flex items-center gap-2 text-lg font-semibold text-white"><CheckCircle2 className="h-5 w-5 text-emerald-300" /> Technical Snapshot</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {[
                    ['Canonical', String(primary.raw.canonical || 'missing')],
                    ['Robots', String(primary.raw.robots || 'missing')],
                    ['Open Graph', `${primary.raw.og && typeof primary.raw.og === 'object' ? [
                      (primary.raw.og as { title?: boolean }).title ? 'title' : null,
                      (primary.raw.og as { description?: boolean }).description ? 'description' : null,
                      (primary.raw.og as { image?: boolean }).image ? 'image' : null,
                      (primary.raw.og as { url?: boolean }).url ? 'url' : null
                    ].filter(Boolean).join(', ') : '-'}`],
                    ['Twitter Cards', `${primary.raw.twitter && typeof primary.raw.twitter === 'object' ? [
                      (primary.raw.twitter as { card?: boolean }).card ? 'card' : null,
                      (primary.raw.twitter as { title?: boolean }).title ? 'title' : null,
                      (primary.raw.twitter as { description?: boolean }).description ? 'description' : null,
                      (primary.raw.twitter as { image?: boolean }).image ? 'image' : null
                    ].filter(Boolean).join(', ') : '-'}`],
                    ['Schema', Array.isArray(primary.raw.schemaTypes) ? (primary.raw.schemaTypes as string[]).join(', ') || 'none' : 'none'],
                    ['Heading hierarchy', `${String(primary.raw.h1Count)} / ${String(primary.raw.h2Count)} / ${String(primary.raw.h3Count)}`],
                    ['Hierarchy issues', Array.isArray(primary.raw.headingHierarchyIssues) ? (primary.raw.headingHierarchyIssues as string[]).join(' | ') || 'none' : 'none']
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
                      <div className="mt-2 text-sm leading-6 text-white break-words">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-slate-950/65 p-5">
                <div className="text-lg font-semibold text-white">Keyword Focus Snapshot</div>
                <div className="mt-4 grid gap-3">
                  {[
                    ['Focus keyword', String(primary.raw.focusKeyword || '-')],
                    ['Occurrences', String(primary.raw.keywordOccurrences || 0)],
                    ['Density', `${String(primary.raw.keywordDensity || 0)}%`],
                    ['In title', primary.raw.keywordInTitle ? 'Yes' : 'No'],
                    ['In meta description', primary.raw.keywordInDescription ? 'Yes' : 'No'],
                    ['In intro', primary.raw.keywordInIntro ? 'Yes' : 'No'],
                    ['In H1', primary.raw.keywordInH1 ? 'Yes' : 'No'],
                    ['In H2/H3', primary.raw.keywordInSubheading ? 'Yes' : 'No'],
                    ['In image alt', primary.raw.keywordInImageAlt ? 'Yes' : 'No']
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
                      <span className="text-slate-400">{label}</span>
                      <span className="font-semibold text-white">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </main>
  );
}
