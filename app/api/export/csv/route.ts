import { NextRequest, NextResponse } from 'next/server';
import type { AnalysisResult } from '@/lib/analyzer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function escapeCsv(value: unknown) {
  const stringValue = String(value ?? '');
  if (/[,"\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export async function POST(req: NextRequest) {
  const { analyses } = (await req.json()) as { analyses?: AnalysisResult[] };

  if (!Array.isArray(analyses) || analyses.length === 0) {
    return NextResponse.json({ error: 'ไม่มีข้อมูลสำหรับ export' }, { status: 400 });
  }

  const rows = [
    [
      'URL',
      'Title',
      'Overall Score',
      'Yoast Score',
      'Score Label',
      'Yoast Label',
      'Word Count',
      'Readability',
      'Title Length',
      'Meta Description Length',
      'Slug',
      'Internal Links',
      'External Links',
      'Alt Coverage',
      'Keyword Density',
      'Canonical',
      'Robots',
      'Schema Types',
      'Zone Summary',
      'Zone 1 Summary',
      'Zone 2 Summary',
      'Zone 3 Summary',
      'Zone 4 Summary'
    ],
    ...analyses.map((item) => [
      item.analyzedUrl,
      item.title,
      item.overallScore,
      item.yoastScore,
      item.scoreLabel,
      item.yoastLabel,
      item.raw.wordCount ?? '',
      item.raw.readabilityScore ?? '',
      item.raw.titleLength ?? '',
      item.raw.metaDescriptionLength ?? '',
      item.raw.slug ?? '',
      item.raw.internalLinks ?? '',
      item.raw.externalLinks ?? '',
      item.raw.altCoverage ?? '',
      item.raw.keywordDensity ?? '',
      item.raw.canonical ?? '',
      item.raw.robots ?? '',
      Array.isArray(item.raw.schemaTypes) ? item.raw.schemaTypes.join(' | ') : '',
      item.overallZoneSummary ?? '',
      item.zones[0]?.summary ?? '',
      item.zones[1]?.summary ?? '',
      item.zones[2]?.summary ?? '',
      item.zones[3]?.summary ?? ''
    ])
  ];

  const content = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ai-seo-report.csv"'
    }
  });
}
