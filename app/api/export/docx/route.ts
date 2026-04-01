import { NextRequest, NextResponse } from 'next/server';
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, type FileChild } from 'docx';
import type { AnalysisResult } from '@/lib/analyzer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cell(text: string, width = 25) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ children: [new TextRun({ text, size: 22 })] })]
  });
}

function statusText(value: unknown) {
  return String(value ?? '-');
}

export async function POST(req: NextRequest) {
  const { analyses } = (await req.json()) as { analyses?: AnalysisResult[] };

  if (!Array.isArray(analyses) || analyses.length === 0) {
    return NextResponse.json({ error: 'ไม่มีข้อมูลสำหรับ export' }, { status: 400 });
  }

  const children: FileChild[] = [
    new Paragraph({ text: 'AI SEO Assistant Report', heading: HeadingLevel.TITLE, spacing: { after: 240 } }),
    new Paragraph({ text: `Total URLs analyzed: ${analyses.length}`, spacing: { after: 240 } })
  ];

  analyses.forEach((analysis, index) => {
    children.push(
      new Paragraph({ text: `${index + 1}. ${analysis.title}`, heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } }),
      new Paragraph({ children: [new TextRun({ text: 'URL: ', bold: true }), new TextRun(analysis.analyzedUrl)] }),
      new Paragraph({ children: [new TextRun({ text: 'Overall Score: ', bold: true }), new TextRun(`${analysis.overallScore}/100 (${analysis.scoreLabel})`)] }),
      new Paragraph({ children: [new TextRun({ text: 'Yoast Score: ', bold: true }), new TextRun(`${analysis.yoastScore}/100 (${analysis.yoastLabel})`)] }),
      new Paragraph({ children: [new TextRun({ text: 'Focus Keyword: ', bold: true }), new TextRun(statusText(analysis.raw.focusKeyword || '-'))] }),
      new Paragraph({ children: [new TextRun({ text: 'Zone Summary: ', bold: true }), new TextRun(statusText(analysis.overallZoneSummary || '-'))] }),
      new Paragraph({ text: '4 Zone Summary', heading: HeadingLevel.HEADING_2, spacing: { before: 180, after: 120 } }),
      ...analysis.zones.flatMap((zone) => [
        new Paragraph({ text: `${zone.title} — ${zone.score}/100`, bullet: { level: 0 } }),
        new Paragraph({ text: zone.summary, spacing: { after: 80 } })
      ]),
      new Paragraph({ text: 'Top Metrics', heading: HeadingLevel.HEADING_2, spacing: { before: 180, after: 120 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [cell('Metric', 40), cell('Value', 60)] }),
          new TableRow({ children: [cell('Word count', 40), cell(statusText(analysis.raw.wordCount), 60)] }),
          new TableRow({ children: [cell('Readability', 40), cell(statusText(analysis.raw.readabilityScore), 60)] }),
          new TableRow({ children: [cell('Title length', 40), cell(statusText(analysis.raw.titleLength), 60)] }),
          new TableRow({ children: [cell('Meta description length', 40), cell(statusText(analysis.raw.metaDescriptionLength), 60)] }),
          new TableRow({ children: [cell('Internal / External links', 40), cell(`${statusText(analysis.raw.internalLinks)} / ${statusText(analysis.raw.externalLinks)}`, 60)] }),
          new TableRow({ children: [cell('Alt coverage', 40), cell(`${statusText(analysis.raw.altCoverage)}%`, 60)] }),
          new TableRow({ children: [cell('Keyword density', 40), cell(`${statusText(analysis.raw.keywordDensity)}%`, 60)] })
        ]
      }),
      new Paragraph({ text: 'Quick Wins', heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 120 } })
    );

    analysis.quickWins.forEach((win) => {
      children.push(new Paragraph({ text: win, bullet: { level: 0 } }));
    });

    children.push(new Paragraph({ text: 'Yoast Checklist', heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 120 } }));
    analysis.yoastItems.forEach((item) => {
      children.push(new Paragraph({ text: `${item.label} — ${item.status.toUpperCase()} — ${item.details}`, bullet: { level: 0 } }));
    });
  });

  const doc = new Document({
    sections: [{ children }]
  });

  const buffer = await Packer.toBuffer(doc);
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="ai-seo-report.docx"'
    }
  });
}
