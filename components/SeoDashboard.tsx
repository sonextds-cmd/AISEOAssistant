'use client';

import { useEffect, useMemo, useState, type ClipboardEvent, type ReactNode } from 'react';
import type { ActionPlanItem, AnalysisResult, CheckItem, Status, YoastItem } from '@/lib/analyzer';
import { Logo } from '@/components/Logo';
import { AlertCircle, ChevronRight, FileText, Minus, Plus, Sparkles, Table2 } from 'lucide-react';

type ExportFormat = 'csv' | 'docx';
type UrlKeywordRow = { id: number; url: string; keyword: string };
type DetailTab = 'todo' | 'detail';

const MAX_ROWS = 12;


function scoreTone(score: number) {
  if (score >= 80) return { color: '#34C759', text: 'text-ios-green', soft: 'bg-ios-green/10 text-ios-green', label: 'ดีมาก' };
  if (score >= 55) return { color: '#FF9500', text: 'text-ios-orange', soft: 'bg-ios-orange/10 text-ios-orange', label: 'พอใช้' };
  return { color: '#FF3B30', text: 'text-ios-red', soft: 'bg-ios-red/10 text-ios-red', label: 'ต้องปรับ' };
}

function statusColor(status: Status) {
  if (status === 'good') return 'bg-ios-green';
  if (status === 'needs-work') return 'bg-ios-orange';
  return 'bg-ios-red';
}

function statusLabel(status: Status) {
  if (status === 'good') return 'ผ่าน';
  if (status === 'needs-work') return 'ควรปรับ';
  return 'ต้องแก้';
}

function ScoreRing({ score, size = 120, stroke = 12 }: { score: number; size?: number; stroke?: number }) {
  const value = Math.max(0, Math.min(100, score));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const tone = scoreTone(value);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E5E5EA" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-semibold tracking-tight text-ios-label" style={{ fontSize: size * 0.3 }}>{value}</span>
      </div>
    </div>
  );
}

function SectionHeader({ children }: { children: ReactNode }) {
  return <div className="px-4 pb-2 pt-6 text-[13px] uppercase tracking-wide text-ios-secondary">{children}</div>;
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-[20px] bg-white ${className}`}>{children}</div>;
}

function MiniStat({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="flex-1 rounded-2xl bg-ios-bg px-3 py-3 text-center">
      <div className={`text-xl font-semibold ${tone ?? 'text-ios-label'}`}>{value}</div>
      <div className="mt-0.5 text-xs text-ios-secondary">{label}</div>
    </div>
  );
}

function ActionRow({ item, index }: { item: ActionPlanItem; index: number }) {
  return (
    <div className="flex gap-3 px-4 py-4">
      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${item.priority === 'High' ? 'bg-ios-red' : 'bg-ios-orange'}`}>
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[17px] font-medium text-ios-label">{item.label}</div>
        <div className="mt-1 text-[15px] leading-6 text-ios-secondary">{item.missing}</div>
        <div className="mt-2 rounded-xl bg-ios-blue/10 px-3 py-2 text-[15px] leading-6 text-ios-label">
          <span className="font-medium text-ios-blue">ทำต่อ: </span>{item.nextStep}
        </div>
        <div className="mt-1.5 text-[13px] text-ios-secondary">ตำแหน่ง: {item.location}</div>
      </div>
    </div>
  );
}

function CheckRow({ label, details, status, note, right }: { label: string; details: string; status: Status; note?: string; right?: string }) {
  return (
    <div className="flex gap-3 px-4 py-3.5">
      <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${statusColor(status)}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="text-[16px] font-medium text-ios-label">{label}</div>
          <div className="shrink-0 text-[13px] text-ios-secondary">{right ?? statusLabel(status)}</div>
        </div>
        <div className="mt-0.5 text-[14px] leading-6 text-ios-secondary">{details}</div>
        {note ? <div className="mt-1 text-[14px] leading-6 text-ios-blue">{note}</div> : null}
      </div>
    </div>
  );
}

function Divided({ children }: { children: ReactNode[] }) {
  return <div className="divide-y divide-ios-separator">{children}</div>;
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

export default function SeoDashboard({ userMenu }: { userMenu?: ReactNode }) {
  const [rows, setRows] = useState<UrlKeywordRow[]>([{ id: 1, url: '', keyword: '' }]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [selectedUrl, setSelectedUrl] = useState('');
  const [tab, setTab] = useState<DetailTab>('todo');

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
    () => rows.map((row) => ({ ...row, url: row.url.trim(), keyword: row.keyword.trim() })).filter((row) => row.url).slice(0, MAX_ROWS),
    [rows]
  );

  function updateRow(id: number, field: 'url' | 'keyword', value: string) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setRows((current) => {
      if (current.length >= MAX_ROWS) return current;
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

  // Pasting several links at once (one per line) fills multiple rows.
  function handleUrlPaste(id: number, event: ClipboardEvent<HTMLInputElement>) {
    const lines = event.clipboardData.getData('text').split(/[\r\n\s]+/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return;
    event.preventDefault();
    setRows((current) => {
      const index = current.findIndex((row) => row.id === id);
      const next = [...current];
      let nextId = Math.max(...current.map((row) => row.id)) + 1;
      lines.forEach((url, offset) => {
        const target = index + offset;
        if (target >= MAX_ROWS) return;
        if (next[target]) next[target] = { ...next[target], url };
        else next.push({ id: nextId++, url, keyword: '' });
      });
      return next;
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
      setError('กรุณาใส่ลิงก์อย่างน้อย 1 รายการ');
      return;
    }

    setLoading(true);
    setProgress(0);
    setError('');

    try {
      const settled = await Promise.allSettled(
        activeRows.map((row) => analyzeOne(row.url, row.keyword).finally(() => setProgress((count) => count + 1)))
      );

      const analyzed: AnalysisResult[] = [];
      const errors: string[] = [];

      for (const result of settled) {
        if (result.status === 'fulfilled') {
          analyzed.push(result.value);
        } else {
          errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
        }
      }

      if (analyzed.length > 0) {
        analyzed.sort((a, b) => b.overallScore - a.overallScore);
        setResults(analyzed);
        setTab('todo');
      }

      if (errors.length > 0) {
        setError(errors.join(' | '));
      }
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
    downloadBlob(blob, format === 'csv' ? 'so-rankly-report.csv' : 'so-rankly-report.docx');
  }

  const issues: YoastItem[] = primary ? primary.yoastItems.filter((item) => item.status !== 'good') : [];

  return (
    <main className="min-h-screen bg-ios-bg pb-16 text-ios-label">
      {/* Navigation bar */}
      <header className="sticky top-0 z-20 border-b border-ios-separator/70 bg-ios-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Logo />
          {userMenu}
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4">
        <h1 className="pt-6 text-[34px] font-bold leading-tight tracking-tight">เช็คบทความ</h1>
        <p className="mt-1 text-[17px] text-ios-secondary">วางลิงก์บทความ แล้วกด “เช็คเลย”</p>

        {/* Input list */}
        <SectionHeader>ลิงก์บทความ ({rows.length}/{MAX_ROWS})</SectionHeader>
        <Card>
          <div className="divide-y divide-ios-separator">
            {rows.map((row, index) => (
              <div key={row.id} className="flex items-center gap-3 py-2 pl-4 pr-3">
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-ios-red text-white transition active:scale-90"
                  aria-label={`ลบลิงก์ ${index + 1}`}
                >
                  <Minus className="h-3.5 w-3.5" strokeWidth={3} />
                </button>
                <div className="min-w-0 flex-1">
                  <input
                    value={row.url}
                    onChange={(e) => updateRow(row.id, 'url', e.target.value)}
                    onPaste={(e) => handleUrlPaste(row.id, e)}
                    placeholder="https://example.com/article"
                    inputMode="url"
                    className="h-9 w-full bg-transparent text-[17px] outline-none placeholder:text-ios-tertiary"
                  />
                  <input
                    value={row.keyword}
                    onChange={(e) => updateRow(row.id, 'keyword', e.target.value)}
                    placeholder="คีย์เวิร์ด (ไม่บังคับ)"
                    className="h-7 w-full bg-transparent text-[15px] text-ios-secondary outline-none placeholder:text-ios-tertiary"
                  />
                </div>
              </div>
            ))}
            {rows.length < MAX_ROWS ? (
              <button
                type="button"
                onClick={addRow}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-[17px] text-ios-blue transition active:bg-ios-bg"
              >
                <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-ios-green text-white">
                  <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                เพิ่มลิงก์
              </button>
            ) : null}
          </div>
        </Card>
        <p className="px-4 pt-2 text-[13px] text-ios-secondary">เคล็ดลับ: คัดลอกหลายลิงก์ (บรรทัดละ 1 ลิงก์) แล้ววางในช่องแรกได้เลย</p>

        <button
          onClick={handleAnalyze}
          disabled={loading || activeRows.length === 0}
          className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-ios-blue text-[17px] font-semibold text-white transition active:scale-[0.98] active:opacity-80 disabled:bg-ios-blue/40"
        >
          {loading ? (
            <>
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              กำลังเช็ค {progress}/{activeRows.length}
            </>
          ) : (
            <>เช็คเลย{activeRows.length > 1 ? ` (${activeRows.length} ลิงก์)` : ''}</>
          )}
        </button>

        {error ? (
          <div className="mt-4 flex gap-3 rounded-[14px] bg-ios-red/10 px-4 py-3 text-[15px] text-ios-red">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="break-all">{error}</div>
          </div>
        ) : null}

        {/* Results list */}
        {results.length > 1 ? (
          <>
            <SectionHeader>ผลลัพธ์ · เรียงจากคะแนนสูงสุด</SectionHeader>
            <Card>
              <div className="divide-y divide-ios-separator">
                {results.map((item) => {
                  const selected = item.analyzedUrl === primary?.analyzedUrl;
                  const tone = scoreTone(item.overallScore);
                  return (
                    <button
                      key={item.analyzedUrl}
                      type="button"
                      onClick={() => {
                        setSelectedUrl(item.analyzedUrl);
                        setTab('todo');
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-ios-bg ${selected ? 'bg-ios-blue/5' : ''}`}
                    >
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold ${tone.soft}`}>
                        {item.overallScore}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[16px] font-medium">{item.title || item.analyzedUrl}</div>
                        <div className="truncate text-[13px] text-ios-secondary">{item.analyzedUrl}</div>
                      </div>
                      {selected ? <span className="text-[13px] font-medium text-ios-blue">กำลังดู</span> : null}
                      <ChevronRight className="h-5 w-5 shrink-0 text-ios-tertiary" />
                    </button>
                  );
                })}
              </div>
            </Card>
          </>
        ) : null}

        {/* Selected result */}
        {primary ? (
          <>
            <SectionHeader>ผลการเช็ค</SectionHeader>
            <Card className="p-5">
              <div className="flex items-center gap-5">
                <ScoreRing score={primary.overallScore} />
                <div className="min-w-0 flex-1">
                  <div className={`text-[15px] font-semibold ${scoreTone(primary.overallScore).text}`}>{scoreTone(primary.overallScore).label}</div>
                  <div className="mt-1 line-clamp-2 text-[20px] font-semibold leading-snug">{primary.title}</div>
                  <a href={primary.analyzedUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate text-[13px] text-ios-blue">
                    {primary.analyzedUrl}
                  </a>
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <MiniStat label="Yoast" value={primary.yoastScore} tone={scoreTone(primary.yoastScore).text} />
                <MiniStat label="อ่านง่าย" value={Number(primary.raw.readabilityScore ?? 0)} tone={scoreTone(Number(primary.raw.readabilityScore ?? 0)).text} />
                <MiniStat label="จำนวนคำ" value={String(primary.raw.wordCount ?? '-')} />
              </div>
              {primary.raw.focusKeyword ? (
                <div className="mt-3 text-center text-[13px] text-ios-secondary">คีย์เวิร์ด: {String(primary.raw.focusKeyword)}</div>
              ) : null}
            </Card>

            {/* Segmented control */}
            <div className="mt-6 flex rounded-[10px] bg-ios-fill p-0.5">
              {([
                ['todo', 'สิ่งที่ต้องทำ'],
                ['detail', 'ผลตรวจละเอียด']
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`h-8 flex-1 rounded-[8px] text-[14px] font-medium transition ${tab === key ? 'bg-white text-ios-label shadow-sm' : 'text-ios-label/70'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'todo' ? (
              <>
                {primary.quickWins.length > 0 ? (
                  <>
                    <SectionHeader>แก้ง่าย ได้ผลไว</SectionHeader>
                    <Card>
                      <Divided>
                        {primary.quickWins.map((win) => (
                          <div key={win} className="flex gap-3 px-4 py-3 text-[15px] leading-6">
                            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-ios-orange" />
                            <span>{win}</span>
                          </div>
                        ))}
                      </Divided>
                    </Card>
                  </>
                ) : null}

                <SectionHeader>ขั้นตอนแก้ไข</SectionHeader>
                <Card>
                  {primary.actionPlan.length > 0 ? (
                    <Divided>
                      {primary.actionPlan.map((item, index) => <ActionRow key={item.id} item={item} index={index} />)}
                    </Divided>
                  ) : (
                    <div className="px-4 py-4 text-[15px] text-ios-secondary">ไม่มีอะไรต้องแก้แล้ว 🎉</div>
                  )}
                </Card>
              </>
            ) : (
              <>
                <SectionHeader>สรุปภาพรวม</SectionHeader>
                <Card className="px-4 py-4 text-[15px] leading-6 text-ios-label">{primary.overallZoneSummary}</Card>

                <SectionHeader>จุดที่ยังไม่ผ่าน ({issues.length})</SectionHeader>
                <Card>
                  {issues.length > 0 ? (
                    <Divided>
                      {issues.map((item) => (
                        <CheckRow key={item.id} label={item.label} details={item.details} status={item.status} note={item.suggestion ? `→ ${item.suggestion}` : undefined} />
                      ))}
                    </Divided>
                  ) : (
                    <div className="px-4 py-4 text-[15px] text-ios-secondary">ทุกจุดสำคัญผ่านเกณฑ์แล้ว</div>
                  )}
                </Card>

                {primary.zones.map((zone) => (
                  <div key={zone.zone}>
                    <div className="flex items-end justify-between px-4 pb-2 pt-6">
                      <span className="text-[13px] uppercase tracking-wide text-ios-secondary">{zone.title}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${scoreTone(zone.score).soft}`}>{zone.score}</span>
                    </div>
                    <Card>
                      <Divided>
                        {[
                          <div key="summary" className="px-4 py-3 text-[14px] leading-6 text-ios-secondary">{zone.summary}</div>,
                          ...zone.items.map((item: CheckItem) => (
                            <CheckRow
                              key={item.id}
                              label={item.label}
                              details={item.details}
                              status={item.status}
                              right={`${item.score}/${item.maxScore}`}
                              note={item.status !== 'good' ? `วิธีแก้: ${item.fix}` : undefined}
                            />
                          ))
                        ]}
                      </Divided>
                    </Card>
                  </div>
                ))}
              </>
            )}

            {/* Export */}
            <SectionHeader>ดาวน์โหลดรายงาน</SectionHeader>
            <Card>
              <Divided>
                {[
                  <button key="docx" type="button" onClick={() => handleExport('docx')} className="flex w-full items-center gap-3 px-4 py-3 text-left text-[17px] transition active:bg-ios-bg">
                    <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-ios-blue text-white"><FileText className="h-4 w-4" /></span>
                    <span className="flex-1">Word (.docx)</span>
                    <ChevronRight className="h-5 w-5 text-ios-tertiary" />
                  </button>,
                  <button key="csv" type="button" onClick={() => handleExport('csv')} className="flex w-full items-center gap-3 px-4 py-3 text-left text-[17px] transition active:bg-ios-bg">
                    <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-ios-green text-white"><Table2 className="h-4 w-4" /></span>
                    <span className="flex-1">Excel (.csv)</span>
                    <ChevronRight className="h-5 w-5 text-ios-tertiary" />
                  </button>
                ]}
              </Divided>
            </Card>
          </>
        ) : null}
      </div>
    </main>
  );
}
