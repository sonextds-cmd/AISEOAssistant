'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ActionPlanItem, AnalysisResult, CheckItem, Status, YoastItem } from '@/lib/analyzer';
import { AlertCircle, CheckCircle2, ChevronRight, FileText, Gauge, LayoutList, Plus, Search, Table2, Trash2 } from 'lucide-react';

type ExportFormat = 'csv' | 'docx';
type UrlKeywordRow = { id: number; url: string; keyword: string };

function scoreTone(score: number) {
  if (score >= 80) {
    return {
      badge: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
      text: 'text-emerald-300',
      bar: 'bg-emerald-400'
    };
  }
  if (score >= 55) {
    return {
      badge: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
      text: 'text-amber-300',
      bar: 'bg-amber-400'
    };
  }
  return {
    badge: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
    text: 'text-rose-300',
    bar: 'bg-rose-400'
  };
}

function statusTone(status: Status) {
  if (status === 'good') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  if (status === 'needs-work') return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
}

function statusLabel(status: Status) {
  if (status === 'good') return 'ผ่าน';
  if (status === 'needs-work') return 'ควรปรับ';
  return 'ต้องแก้';
}

function YoastLight({ label }: { label: AnalysisResult['yoastLabel'] }) {
  const map = {
    Green: 'bg-emerald-400',
    Orange: 'bg-amber-400',
    Red: 'bg-rose-400'
  } as const;
  return <span className={`inline-block h-3 w-3 rounded-full ${map[label]}`} />;
}

function MetricBar({ value }: { value: number }) {
  const tone = scoreTone(value);
  return (
    <div className="space-y-2">
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <div className={`text-sm font-medium ${tone.text}`}>{value}/100</div>
    </div>
  );
}

function ScoreCard({ title, score, subtitle }: { title: string; score: number; subtitle: string }) {
  const tone = scoreTone(score);
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-400">{title}</div>
          <div className="mt-2 text-4xl font-semibold text-white">{score}</div>
          <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-medium ${tone.badge}`}>{score >= 80 ? 'Strong' : score >= 55 ? 'Average' : 'Needs work'}</div>
      </div>
      <div className="mt-4">
        <MetricBar value={score} />
      </div>
    </div>
  );
}

function ActionPlanCard({ item }: { item: ActionPlanItem }) {
  const badge = item.priority === 'High'
    ? 'border-rose-500/20 bg-rose-500/10 text-rose-300'
    : 'border-amber-500/20 bg-amber-500/10 text-amber-300';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-base font-semibold text-white">{item.label}</div>
        <div className={`rounded-full border px-3 py-1 text-xs font-medium ${badge}`}>{item.priority}</div>
      </div>
      <div className="mt-4 space-y-3 text-sm leading-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-slate-200"><span className="font-semibold text-white">ขาดอะไร:</span> {item.missing}</div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-slate-200"><span className="font-semibold text-white">ควรแก้ตรงไหน:</span> {item.location}</div>
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-cyan-100"><span className="font-semibold">ต้องทำอะไรต่อ:</span> {item.nextStep}</div>
      </div>
    </div>
  );
}

function ZoneItemCard({ item }: { item: CheckItem }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-white">{item.label}</div>
          <div className="mt-2 text-sm leading-6 text-slate-300">{item.details}</div>
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone(item.status)}`}>{item.score}/{item.maxScore}</div>
      </div>
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm leading-6 text-slate-200">
        <span className="font-semibold text-white">วิธีแก้:</span> {item.fix}
      </div>
    </div>
  );
}

function PriorityChecklist({ items }: { items: YoastItem[] }) {
  const visibleItems = items.filter((item) => item.status !== 'good');

  if (visibleItems.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-300">
        ทุกจุดสำคัญผ่านเกณฑ์แล้ว
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-white">Priority fixes</div>
          <div className="mt-1 text-sm text-slate-400">แสดงเฉพาะรายการที่ยังต้องแก้หรือควรปรับ</div>
        </div>
        <div className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">{visibleItems.length} items</div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {visibleItems.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-white">{item.label}</div>
              <div className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone(item.status)}`}>{statusLabel(item.status)}</div>
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-300">{item.details}</div>
            {item.suggestion ? <div className="mt-3 text-sm leading-6 text-cyan-100">→ {item.suggestion}</div> : null}
          </div>
        ))}
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
  const [rows, setRows] = useState<UrlKeywordRow[]>([{ id: 1, url: '', keyword: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [selectedUrl, setSelectedUrl] = useState('');

  useEffect(() => {
    if (results.length === 0) {
      setSelectedUrl('');
      return;
    }
    if (!results.some((item) => item.analyzedUrl === selectedUrl)) {
      setSelectedUrl(results[0].analyzedUrl);
    }
  }, [results, selectedUrl]);

  const primary = useMemo(
    () => results.find((item) => item.analyzedUrl === selectedUrl) ?? results[0] ?? null,
    [results, selectedUrl]
  );
  const activeRows = useMemo(
    () => rows.map((row) => ({ ...row, url: row.url.trim(), keyword: row.keyword.trim() })).filter((row) => row.url).slice(0, 5),
    [rows]
  );

  const compareRows = useMemo(() => {
    return results.map((item) => ({
      url: item.analyzedUrl,
      keyword: String(item.raw.focusKeyword ?? ''),
      overall: item.overallScore,
      yoast: item.yoastScore,
      readability: Number(item.raw.readabilityScore ?? 0),
      wordCount: Number(item.raw.wordCount ?? 0),
      titleLength: Number(item.raw.titleLength ?? 0),
      isSelected: item.analyzedUrl === selectedUrl
    }));
  }, [results, selectedUrl]);

  function updateRow(id: number, field: 'url' | 'keyword', value: string) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setRows((current) => {
      if (current.length >= 5) return current;
      const nextId = current.length ? Math.max(...current.map((row) => row.id)) + 1 : 1;
      return [...current, { id: nextId, url: '', keyword: '' }];
    });
  }

  function removeRow(id: number) {
    setRows((current) => {
      if (current.length === 1) return [{ ...current[0], url: '', keyword: '' }];
      return current.filter((row) => row.id !== id);
    });
  }

  async function analyzeOne(targetUrl: string, keyword: string) {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl, focusKeyword: keyword })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `วิเคราะห์ ${targetUrl} ไม่สำเร็จ`);
    }
    return data as AnalysisResult;
  }

  async function handleAnalyze() {
    if (activeRows.length === 0) {
      setError('กรุณาใส่ URL อย่างน้อย 1 รายการ');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const analyzed: AnalysisResult[] = [];
      for (const row of activeRows) {
        const data = await analyzeOne(row.url, row.keyword);
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
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-800  p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-cyan-200">
                <Gauge className="h-4 w-4" /> SEO Content Auditor
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">วิเคราะห์บทความหลาย URL แบบเรียบง่าย ใช้งานไว และอ่านผลลัพธ์ง่าย</h1>
              <p className="mt-4 text-base leading-7 text-slate-400 md:text-lg">
                ใส่ URL และ keyword เป็นคู่กันได้สูงสุด 5 แถว จากนั้นดูคะแนนรวม รายการที่ต้องแก้ และ action plan ที่พร้อมลงมือทำต่อได้ทันที
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Rows</div>
                <div className="mt-2 text-2xl font-semibold">{rows.length}/5</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Ready</div>
                <div className="mt-2 text-2xl font-semibold">{activeRows.length}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Mode</div>
                <div className="mt-2 text-sm font-medium text-cyan-200">Modern audit</div>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-950 p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">URL + Keyword pairs</div>
                <div className="mt-1 text-sm text-slate-400">เพิ่มหรือลบแถวได้ตามต้องการ ระบบจะวิเคราะห์เฉพาะแถวที่มี URL</div>
              </div>
              <button
                type="button"
                onClick={addRow}
                disabled={rows.length >= 5}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> เพิ่มแถว
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {rows.map((row, index) => (
                <div key={row.id} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 lg:grid-cols-[1fr_260px_56px]">
                  <div>
                    <label className="text-xs uppercase tracking-[0.16em] text-slate-500">URL {index + 1}</label>
                    <input
                      value={row.url}
                      onChange={(e) => updateRow(row.id, 'url', e.target.value)}
                      placeholder="https://example.com/article"
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm outline-none placeholder:text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.16em] text-slate-500">Keyword</label>
                    <input
                      value={row.keyword}
                      onChange={(e) => updateRow(row.id, 'keyword', e.target.value)}
                      placeholder="primary keyword"
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm outline-none placeholder:text-slate-600"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-slate-300 transition hover:bg-slate-800"
                      aria-label={`ลบ URL ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-400">พร้อมวิเคราะห์ {activeRows.length} URL</div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Search className="h-4 w-4" />
                  {loading ? 'กำลังวิเคราะห์...' : 'Analyze'}
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  disabled={results.length === 0}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-40"
                >
                  <Table2 className="h-4 w-4" /> CSV
                </button>
                <button
                  onClick={() => handleExport('docx')}
                  disabled={results.length === 0}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-40"
                >
                  <FileText className="h-4 w-4" /> DOCX
                </button>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">
              <div className="flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4" /> {error}</div>
            </div>
          ) : null}
        </section>

        {primary ? (
          <section className="mt-8 grid gap-4 xl:grid-cols-4">
            <ScoreCard title="Overall score" score={primary.overallScore} subtitle={primary.scoreLabel} />
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="text-sm text-slate-400">Yoast score</div>
              <div className="mt-2 flex items-center gap-3 text-4xl font-semibold text-white">
                {primary.yoastScore}
                <YoastLight label={primary.yoastLabel} />
              </div>
              <div className="mt-1 text-sm text-slate-500">{primary.yoastLabel}</div>
              <div className="mt-4"><MetricBar value={primary.yoastScore} /></div>
            </div>
            <ScoreCard title="Readability" score={Number(primary.raw.readabilityScore ?? 0)} subtitle="ยิ่งสูงยิ่งอ่านง่าย" />
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="text-sm text-slate-400">Top URL</div>
              <div className="mt-2 line-clamp-2 text-lg font-semibold text-white">{primary.title}</div>
              <div className="mt-3 text-sm text-slate-400 break-all">{primary.analyzedUrl}</div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">Keyword: {String(primary.raw.focusKeyword || '-')}</span>
                <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">Words: {String(primary.raw.wordCount ?? '-')}</span>
                <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">Title: {String(primary.raw.titleLength ?? '-')}</span>
              </div>
            </div>
          </section>
        ) : null}

        {results.length > 1 ? (
          <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-950 p-5">
            <div className="flex items-center gap-2 text-lg font-semibold text-white"><Table2 className="h-5 w-5 text-cyan-300" /> Compare URLs</div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-200">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="px-3 py-3">URL</th>
                    <th className="px-3 py-3">Keyword</th>
                    <th className="px-3 py-3">Overall</th>
                    <th className="px-3 py-3">Yoast</th>
                    <th className="px-3 py-3">Readability</th>
                    <th className="px-3 py-3">Words</th>
                    <th className="px-3 py-3">Title</th>
                    <th className="px-3 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row) => (
                    <tr key={row.url} className={`border-b border-slate-900 align-top transition ${row.isSelected ? 'bg-slate-900/60' : 'hover:bg-slate-900/30'}`}>
                      <td className="max-w-[320px] px-3 py-4 text-slate-300">{row.url}</td>
                      <td className="px-3 py-4">{row.keyword || '-'}</td>
                      <td className="px-3 py-4"><span className={`rounded-full border px-3 py-1 text-xs font-medium ${scoreTone(row.overall).badge}`}>{row.overall}</span></td>
                      <td className="px-3 py-4"><span className={`rounded-full border px-3 py-1 text-xs font-medium ${scoreTone(row.yoast).badge}`}>{row.yoast}</span></td>
                      <td className="px-3 py-4">{row.readability}</td>
                      <td className="px-3 py-4">{row.wordCount}</td>
                      <td className="px-3 py-4">{row.titleLength}</td>
                      <td className="px-3 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedUrl(row.url)}
                          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${row.isSelected ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100' : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'}`}
                        >
                          {row.isSelected ? 'กำลังดูอยู่' : 'ดูรายละเอียด'}
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {primary ? (
          <>
          <section className="mt-8 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-medium uppercase tracking-[0.16em] text-cyan-200">Selected URL details</div>
                <div className="mt-2 text-base font-semibold text-white break-all">{primary.analyzedUrl}</div>
                <div className="mt-1 text-sm text-slate-300">Keyword: {String(primary.raw.focusKeyword ?? '-') || '-'}</div>
              </div>
              <div className="rounded-full border border-cyan-500/20 bg-slate-950 px-4 py-2 text-sm text-cyan-100">คลิก “ดูรายละเอียด” ในตารางด้านบนเพื่อสลับบทความที่ต้องการดู</div>
            </div>
          </section>
          <div className="mt-8 grid gap-8 xl:grid-cols-[1.05fr,0.95fr]">
            <div className="space-y-8">
              <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <div className="flex items-center gap-2 text-lg font-semibold text-white"><LayoutList className="h-5 w-5 text-cyan-300" /> Executive summary</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">{primary.overallZoneSummary}</div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {primary.zones.map((zone) => (
                    <div key={`${zone.zone}-summary`} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">{zone.title}</div>
                          <div className="mt-2 text-sm leading-6 text-slate-300">{zone.summary}</div>
                        </div>
                        <div className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${scoreTone(zone.score).badge}`}>{zone.score}/100</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <div className="flex items-center gap-2 text-lg font-semibold text-white"><CheckCircle2 className="h-5 w-5 text-cyan-300" /> Action plan</div>
                <div className="mt-2 text-sm leading-6 text-slate-400">ดูเฉพาะสิ่งที่บทความยังขาด จุดที่ต้องแก้ และขั้นตอนถัดไป</div>
                <div className="mt-4 grid gap-4">
                  {primary.actionPlan.map((item) => (
                    <ActionPlanCard key={item.id} item={item} />
                  ))}
                </div>
                <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <div className="text-sm font-semibold text-white">Quick wins</div>
                  <div className="mt-3 grid gap-3">
                    {primary.quickWins.map((win) => (
                      <div key={win} className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm leading-6 text-cyan-100">{win}</div>
                    ))}
                  </div>
                </div>
              </section>

              <PriorityChecklist items={primary.yoastItems} />
            </div>

            <div className="space-y-8">
              {primary.zones.map((zone) => (
                <section key={zone.zone} className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-white">{zone.title}</div>
                      <div className="mt-1 text-sm text-slate-400">คะแนนโซน {zone.score}/100</div>
                    </div>
                    <div className={`rounded-full border px-3 py-1 text-xs font-medium ${scoreTone(zone.score).badge}`}>{zone.score}/100</div>
                  </div>
                  <div className="mt-3 text-sm leading-6 text-slate-300">{zone.summary}</div>
                  <div className="mt-4"><MetricBar value={zone.score} /></div>
                  <div className="mt-5 grid gap-4">
                    {zone.items.slice(0, 4).map((item) => <ZoneItemCard key={item.id} item={item} />)}
                  </div>
                </section>
              ))}
            </div>
          </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
