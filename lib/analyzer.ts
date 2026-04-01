import * as cheerio from 'cheerio';

export type Status = 'good' | 'needs-work' | 'poor';

export type CheckItem = {
  id: string;
  label: string;
  score: number;
  maxScore: number;
  status: Status;
  details: string;
  fix: string;
};

export type ZoneResult = {
  zone: string;
  title: string;
  score: number;
  maxScore: number;
  summary: string;
  items: CheckItem[];
};

export type YoastItem = {
  id: string;
  label: string;
  status: Status;
  details: string;
  value?: string | number;
};

export type AnalysisResult = {
  analyzedUrl: string;
  title: string;
  description: string;
  overallScore: number;
  scoreLabel: string;
  yoastScore: number;
  yoastLabel: 'Green' | 'Orange' | 'Red';
  zones: ZoneResult[];
  overallZoneSummary: string;
  yoastItems: YoastItem[];
  quickWins: string[];
  raw: Record<string, unknown>;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const normalize = (value: number, max: number) => Math.round((value / max) * 100);

const grade = (score: number, max: number): Status => {
  const ratio = score / max;
  if (ratio >= 0.8) return 'good';
  if (ratio >= 0.45) return 'needs-work';
  return 'poor';
};

function scoreLabel(score: number) {
  if (score >= 85) return 'ยอดเยี่ยม';
  if (score >= 70) return 'ดี';
  if (score >= 50) return 'พอใช้';
  return 'ต้องเร่งแก้';
}

function textOf($: cheerio.CheerioAPI, selector: string) {
  return $(selector).first().text().replace(/\s+/g, ' ').trim();
}

function attrOf($: cheerio.CheerioAPI, selector: string, attr: string) {
  return $(selector).first().attr(attr)?.trim() ?? '';
}

function safeParseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function flattenSchemaTypes(input: unknown): string[] {
  const out: string[] = [];
  const visit = (node: unknown) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node !== 'object') return;
    const record = node as Record<string, unknown>;
    const typeValue = record['@type'];
    if (typeof typeValue === 'string') out.push(typeValue);
    if (Array.isArray(typeValue)) {
      typeValue.filter((item): item is string => typeof item === 'string').forEach((item) => out.push(item));
    }
    Object.values(record).forEach(visit);
  };
  visit(input);
  return [...new Set(out)];
}

function tokenizeWords(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function extractSentences(text: string) {
  return text
    .split(/(?<=[\.\!\?。！？])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function countKeywordOccurrences(text: string, keyword: string) {
  if (!keyword.trim()) return 0;
  const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'gi');
  return text.match(regex)?.length ?? 0;
}

function toSlugString(input: string) {
  return input.toLowerCase().trim().replace(/\s+/g, '-');
}

function getSlug(url: URL) {
  return url.pathname.replace(/^\/+|\/+$/g, '');
}

function absoluteUrl(candidate: string, base: string) {
  if (!candidate) return '';
  try {
    return new URL(candidate, base).toString();
  } catch {
    return candidate;
  }
}

function evaluateHeadingHierarchy(levels: number[]) {
  const issues: string[] = [];
  let previous = 0;
  levels.forEach((level, index) => {
    if (previous && level - previous > 1) {
      issues.push(`ข้ามลำดับ heading จาก H${previous} ไป H${level} ที่ตำแหน่ง ${index + 1}`);
    }
    previous = level;
  });
  return issues;
}

function yoastLabelFromScore(score: number): 'Green' | 'Orange' | 'Red' {
  if (score >= 80) return 'Green';
  if (score >= 55) return 'Orange';
  return 'Red';
}

function topItemByStatus(items: CheckItem[], target: Status) {
  return items.filter((item) => item.status === target).sort((a, b) => a.score - b.score)[0];
}

function buildZoneSummary(title: string, score: number, items: CheckItem[]) {
  const strong = topItemByStatus(items, 'good');
  const weak = topItemByStatus(items, 'poor') ?? topItemByStatus(items, 'needs-work');
  const strongText = strong ? `จุดแข็งคือ ${strong.label.toLowerCase()}` : 'ยังไม่มีจุดแข็งที่เด่นมาก';
  const weakText = weak ? `จุดที่ควรแก้ก่อนคือ ${weak.label.toLowerCase()}` : 'ภาพรวมค่อนข้างสมดุล';
  const level = score >= 80 ? 'แข็งแรง' : score >= 55 ? 'อยู่ระดับกลาง' : 'ยังอ่อน';
  return `${title} ${level} (${score}/100) — ${strongText}; ${weakText}`;
}

function buildOverallZoneSummary(zones: ZoneResult[]) {
  const strongest = [...zones].sort((a, b) => b.score - a.score)[0];
  const weakest = [...zones].sort((a, b) => a.score - b.score)[0];
  if (!strongest || !weakest) return '';
  return `โซนที่ดีที่สุดคือ ${strongest.title} (${strongest.score}/100) และโซนที่ควรเร่งปรับก่อนคือ ${weakest.title} (${weakest.score}/100)`;
}

export function analyzeHtml(html: string, analyzedUrl: string, focusKeyword = ''): AnalysisResult {
  const $ = cheerio.load(html);
  const url = new URL(analyzedUrl);
  const baseHostname = url.hostname;
  const title = $('title').text().trim() || textOf($, 'h1') || 'Untitled page';
  const h1Text = textOf($, 'h1');
  const metaDescription = attrOf($, 'meta[name="description"]', 'content');
  const canonical = absoluteUrl(attrOf($, 'link[rel="canonical"]', 'href'), analyzedUrl);
  const robots = attrOf($, 'meta[name="robots"]', 'content');
  const ogTitle = attrOf($, 'meta[property="og:title"]', 'content');
  const ogDescription = attrOf($, 'meta[property="og:description"]', 'content');
  const ogImage = attrOf($, 'meta[property="og:image"]', 'content');
  const ogUrl = attrOf($, 'meta[property="og:url"]', 'content');
  const twitterCard = attrOf($, 'meta[name="twitter:card"]', 'content');
  const twitterTitle = attrOf($, 'meta[name="twitter:title"]', 'content');
  const twitterDescription = attrOf($, 'meta[name="twitter:description"]', 'content');
  const twitterImage = attrOf($, 'meta[name="twitter:image"]', 'content');

  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const cleanText = bodyText.replace(/\s+/g, ' ').trim();
  const words = tokenizeWords(cleanText);
  const bodyWordCount = words.length;
  const description = metaDescription || ogDescription || 'No meta description found';
  const slug = getSlug(url);
  const titleLength = title.length;
  const metaDescriptionLength = metaDescription.length;
  const slugLength = slug.length;

  const headingDetails = $('h1, h2, h3')
    .map((_, el) => {
      const tag = el.tagName.toLowerCase();
      return {
        tag,
        level: Number(tag.replace('h', '')),
        text: $(el).text().replace(/\s+/g, ' ').trim()
      };
    })
    .get()
    .filter((item) => item.text.length > 0);
  const headingTexts = headingDetails.map((item) => item.text);
  const questionHeadings = headingTexts.filter((item) => /\?|อะไร|อย่างไร|ทำไม|เมื่อไร|ไหน|กี่|how|what|why|when|who/i.test(item));
  const headingHierarchyIssues = evaluateHeadingHierarchy(headingDetails.map((item) => item.level));
  const h1Count = headingDetails.filter((item) => item.tag === 'h1').length;
  const h2Count = headingDetails.filter((item) => item.tag === 'h2').length;
  const h3Count = headingDetails.filter((item) => item.tag === 'h3').length;

  const images = $('img').length;
  const imageAlts = $('img')
    .map((_, el) => ($(el).attr('alt') || '').trim())
    .get();
  const imagesWithAlt = imageAlts.filter(Boolean).length;
  const altCoverage = images > 0 ? Math.round((imagesWithAlt / images) * 100) : 100;

  const linkHrefs = $('a[href]')
    .map((_, el) => $(el).attr('href') || '')
    .get()
    .filter(Boolean);
  const internalLinks = linkHrefs.filter((href) => {
    if (href.startsWith('#')) return false;
    if (href.startsWith('/')) return true;
    try {
      return new URL(href, analyzedUrl).hostname === baseHostname;
    } catch {
      return false;
    }
  });
  const externalLinks = linkHrefs.filter((href) => {
    try {
      const resolved = new URL(href, analyzedUrl);
      return resolved.hostname !== baseHostname && /^https?:$/i.test(resolved.protocol);
    } catch {
      return false;
    }
  });
  const internalExternalRatio = externalLinks.length === 0 ? internalLinks.length : Number((internalLinks.length / externalLinks.length).toFixed(2));

  const scripts = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).html() || '')
    .get();
  const schemaDocs = scripts.map(safeParseJson).filter(Boolean);
  const schemaTypes = flattenSchemaTypes(schemaDocs);
  const hasArticleSchema = schemaTypes.some((type) => /article|blogposting|newsarticle/i.test(type));
  const hasFaqSchema = schemaTypes.some((type) => /faqpage/i.test(type));
  const hasBreadcrumbSchema = schemaTypes.some((type) => /breadcrumblist/i.test(type));
  const hasOrganizationSchema = schemaTypes.some((type) => /organization|person/i.test(type));

  const datesBlob = [
    attrOf($, 'meta[property="article:published_time"]', 'content'),
    attrOf($, 'meta[property="article:modified_time"]', 'content'),
    attrOf($, 'meta[name="date"]', 'content'),
    attrOf($, 'meta[name="publish_date"]', 'content'),
    attrOf($, 'time[datetime]', 'datetime')
  ].join(' ');

  const hasAuthor =
    $('[rel="author"]').length > 0 ||
    $('[itemprop="author"]').length > 0 ||
    $('[class*="author"]').length > 0 ||
    /author|ผู้เขียน|เรียบเรียงโดย|by /i.test(bodyText.slice(0, 3000));
  const hasBio = /bio|ประวัติผู้เขียน|เกี่ยวกับผู้เขียน|about the author|about us|เกี่ยวกับเรา/i.test(bodyText);
  const numericMatches = bodyText.match(/\b\d+[\d,\.]*\b/g) ?? [];
  const yearMatches = bodyText.match(/\b(19|20)\d{2}\b/g) ?? [];
  const priceMatches = bodyText.match(/฿|บาท|usd|thb|\$/gi) ?? [];
  const tldrSection = /tl;dr|สรุปสั้นๆ|สรุปย่อ|สรุปเร็ว/i.test(bodyText);
  const bullets = $('ul li, ol li').length;
  const tables = $('table').length;
  const lists = $('ul, ol').length;
  const blockquotes = $('blockquote').length;
  const faqHints = bodyText.toLowerCase().includes('faq') || bodyText.includes('คำถามที่พบบ่อย');

  const firstParagraph = $('p').first().text().replace(/\s+/g, ' ').trim();
  const answerFirst = firstParagraph.length >= 120;
  const sentences = extractSentences(cleanText);
  const avgSentenceWords = sentences.length > 0 ? Math.round(bodyWordCount / sentences.length) : 0;
  const paragraphLengths = $('p')
    .map((_, el) => tokenizeWords($(el).text()).length)
    .get()
    .filter((count) => count > 0);
  const longParagraphs = paragraphLengths.filter((count) => count > 90).length;
  const transitionWords = cleanText.match(/อย่างไรก็ตาม|ดังนั้น|ยกตัวอย่าง|เช่น|สรุปแล้ว|however|therefore|for example|in addition|moreover|because|also|finally/gi) ?? [];
  const passiveHints = cleanText.match(/ถูก|ได้รับ|was|were|been|is being|are being/gi) ?? [];

  let readabilityScore = 100;
  if (avgSentenceWords > 28) readabilityScore -= 24;
  else if (avgSentenceWords > 22) readabilityScore -= 12;
  if (longParagraphs > 3) readabilityScore -= 18;
  else if (longParagraphs > 0) readabilityScore -= 10;
  if (transitionWords.length < 3) readabilityScore -= 12;
  if (bullets < 3) readabilityScore -= 8;
  if (questionHeadings.length === 0) readabilityScore -= 6;
  if (passiveHints.length > bodyWordCount * 0.04) readabilityScore -= 10;
  readabilityScore = clamp(readabilityScore, 20, 100);

  const focus = focusKeyword.trim();
  const focusSlug = toSlugString(focus);
  const introText = $('p')
    .slice(0, 2)
    .text()
    .replace(/\s+/g, ' ')
    .trim();
  const keywordOccurrences = countKeywordOccurrences(cleanText, focus);
  const keywordDensity = focus && bodyWordCount > 0 ? Number((((keywordOccurrences * tokenizeWords(focus).length) / bodyWordCount) * 100).toFixed(2)) : 0;
  const keywordInTitle = focus ? title.toLowerCase().includes(focus.toLowerCase()) : false;
  const keywordInDescription = focus ? metaDescription.toLowerCase().includes(focus.toLowerCase()) : false;
  const keywordInSlug = focus ? slug.toLowerCase().includes(focusSlug) || slug.toLowerCase().includes(focus.toLowerCase()) : false;
  const keywordInH1 = focus ? h1Text.toLowerCase().includes(focus.toLowerCase()) : false;
  const keywordInIntro = focus ? introText.toLowerCase().includes(focus.toLowerCase()) : false;
  const keywordInSubheading = focus ? headingDetails.filter((item) => item.level > 1).some((item) => item.text.toLowerCase().includes(focus.toLowerCase())) : false;
  const keywordInImageAlt = focus ? imageAlts.some((alt) => alt.toLowerCase().includes(focus.toLowerCase())) : false;

  const zone1Items: CheckItem[] = [
    {
      id: 'identity',
      label: 'Identity & Entity',
      score: hasAuthor && hasBio ? 10 : hasAuthor || hasBio ? 6 : 2,
      maxScore: 10,
      status: 'poor',
      details: hasAuthor && hasBio
        ? 'พบบทบาทผู้เขียน/องค์กร และมีสัญญาณ bio ช่วยเสริม E-E-A-T'
        : 'ยังไม่ชัดว่าใครเป็นผู้เขียน หรือยังไม่มี bio/โปรไฟล์ที่เสริมความน่าเชื่อถือ',
      fix: 'เพิ่มชื่อผู้เขียน, ความเชี่ยวชาญ, bio สั้น, และเชื่อมไปยังหน้าโปรไฟล์หรือหน้าบริษัท'
    },
    {
      id: 'proof',
      label: 'Numerical Proof',
      score: numericMatches.length >= 8 && (yearMatches.length > 0 || priceMatches.length > 0) ? 10 : numericMatches.length >= 4 ? 6 : 2,
      maxScore: 10,
      status: 'poor',
      details: `พบตัวเลข ${numericMatches.length} จุด | ปี ${yearMatches.length} จุด | ราคา/มูลค่า ${priceMatches.length} จุด`,
      fix: 'เพิ่มตัวเลขอ้างอิงจริง เช่น benchmark, สถิติ, งบประมาณ, ราคา หรือผลลัพธ์'
    },
    {
      id: 'dates',
      label: 'Metadata & Relevance Dates',
      score: datesBlob.length > 10 ? 10 : 3,
      maxScore: 10,
      status: 'poor',
      details: datesBlob.length > 10 ? 'พบวันเผยแพร่หรือแก้ไขใน metadata/หน้าเว็บ' : 'ยังไม่พบวันที่เผยแพร่หรือวันแก้ไขชัดเจน',
      fix: 'เพิ่ม publication date, last updated และ validThrough ในหน้าและใน structured data'
    }
  ].map((item) => ({ ...item, status: grade(item.score, item.maxScore) }));

  const zone2Items: CheckItem[] = [
    {
      id: 'tldr',
      label: 'TL;DR Summary',
      score: tldrSection && bullets >= 3 ? 10 : bullets >= 3 ? 6 : 2,
      maxScore: 10,
      status: 'poor',
      details: tldrSection ? 'พบส่วนสรุปย่อที่พร้อมให้ AI และผู้ใช้หยิบไปใช้ทันที' : 'ยังไม่พบบล็อก TL;DR ที่ชัดเจน',
      fix: 'เพิ่ม TL;DR 3–5 ข้อไว้ก่อนเนื้อหาหลัก'
    },
    {
      id: 'answer-first',
      label: 'Answer-First Content',
      score: answerFirst ? 10 : 4,
      maxScore: 10,
      status: 'poor',
      details: answerFirst ? 'ย่อหน้าแรกตอบคำถามได้ค่อนข้างเร็ว' : 'ย่อหน้าแรกยังไม่ตอบคำถามตรงพอ',
      fix: 'เริ่มบทความด้วยคำตอบสั้นๆ 2–4 ประโยคก่อนลงรายละเอียด'
    },
    {
      id: 'keyword-focus',
      label: 'Focus Keyword Alignment',
      score: !focus ? 6 : keywordInTitle && keywordInDescription && keywordInH1 && keywordInIntro ? 10 : keywordInTitle || keywordInH1 ? 7 : 3,
      maxScore: 10,
      status: 'poor',
      details: focus
        ? `คีย์เวิร์ด “${focus}” | Title: ${keywordInTitle ? 'มี' : 'ไม่มี'} | Meta: ${keywordInDescription ? 'มี' : 'ไม่มี'} | H1: ${keywordInH1 ? 'มี' : 'ไม่มี'} | Intro: ${keywordInIntro ? 'มี' : 'ไม่มี'}`
        : 'ยังไม่ได้ใส่ Focus Keyword',
      fix: 'วางคีย์เวิร์ดหลักอย่างเป็นธรรมชาติใน title, meta, H1, intro และ subheading'
    }
  ].map((item) => ({ ...item, status: grade(item.score, item.maxScore) }));

  const zone3Items: CheckItem[] = [
    {
      id: 'question-headings',
      label: 'Question-Based Headings',
      score: questionHeadings.length >= 3 ? 10 : questionHeadings.length >= 1 ? 6 : 2,
      maxScore: 10,
      status: 'poor',
      details: `พบ heading เชิงคำถาม ${questionHeadings.length} รายการ จากทั้งหมด ${headingTexts.length}`,
      fix: 'ปรับ H2/H3 บางส่วนให้ตอบคำถามที่คนค้นจริง เช่น คืออะไร, ทำอย่างไร, เหมาะกับใคร'
    },
    {
      id: 'data-structure',
      label: 'Data Structuring',
      score: tables > 0 && lists > 1 ? 10 : lists > 1 ? 7 : 3,
      maxScore: 10,
      status: 'poor',
      details: `พบ table ${tables} | lists ${lists}`,
      fix: 'เพิ่มตารางเปรียบเทียบ, checklist หรือขั้นตอนแบบ list'
    },
    {
      id: 'quote-quality',
      label: 'Quote Quality',
      score: blockquotes > 0 ? 10 : 3,
      maxScore: 10,
      status: 'poor',
      details: blockquotes > 0 ? 'พบการอ้างอิงหรือ quote ในหน้า' : 'ยังไม่พบ quote จากผู้เชี่ยวชาญหรือแหล่งอ้างอิง',
      fix: 'เพิ่ม quote ที่มีชื่อผู้พูด, ตำแหน่ง, และ insight ที่ตรวจสอบได้'
    }
  ].map((item) => ({ ...item, status: grade(item.score, item.maxScore) }));

  const zone4Items: CheckItem[] = [
    {
      id: 'faq',
      label: 'FAQ Section',
      score: faqHints || hasFaqSchema ? 10 : 3,
      maxScore: 10,
      status: 'poor',
      details: faqHints || hasFaqSchema ? 'พบ FAQ section หรือ FAQ schema' : 'ยังไม่พบ FAQ ที่ช่วยรองรับ voice search / PAA',
      fix: 'เพิ่ม FAQ 3–6 ข้อท้ายบทความ พร้อม structured data หากเหมาะสม'
    },
    {
      id: 'internal-links',
      label: 'Contextual Internal Linking',
      score: internalLinks.length >= 3 ? 10 : internalLinks.length >= 1 ? 6 : 2,
      maxScore: 10,
      status: 'poor',
      details: `พบ internal links ${internalLinks.length} | external links ${externalLinks.length}`,
      fix: 'เชื่อมลิงก์บทความ/บริการที่เกี่ยวข้องเพื่อสร้าง topical map และ knowledge graph'
    },
    {
      id: 'scannability',
      label: 'Formatting & Scannability',
      score: readabilityScore >= 75 ? 10 : readabilityScore >= 55 ? 7 : 3,
      maxScore: 10,
      status: 'poor',
      details: `Readability score ${readabilityScore}/100 | ย่อหน้ายาว ${longParagraphs} | bullets ${bullets}`,
      fix: 'ซอยย่อหน้า, เพิ่ม subheading, bullet, ตาราง และคำเชื่อมให้อ่าน/สแกนง่ายขึ้น'
    }
  ].map((item) => ({ ...item, status: grade(item.score, item.maxScore) }));

  const baseZones: Omit<ZoneResult, 'summary'>[] = [
    { zone: 'zone-1', title: 'Zone 1: Identity & Data Foundation', score: normalize(zone1Items.reduce((sum, item) => sum + item.score, 0), 30), maxScore: 100, items: zone1Items },
    { zone: 'zone-2', title: 'Zone 2: The Core Hook', score: normalize(zone2Items.reduce((sum, item) => sum + item.score, 0), 30), maxScore: 100, items: zone2Items },
    { zone: 'zone-3', title: 'Zone 3: Structure & Authority', score: normalize(zone3Items.reduce((sum, item) => sum + item.score, 0), 30), maxScore: 100, items: zone3Items },
    { zone: 'zone-4', title: 'Zone 4: Connectivity & Retention', score: normalize(zone4Items.reduce((sum, item) => sum + item.score, 0), 30), maxScore: 100, items: zone4Items }
  ];

  const zones: ZoneResult[] = baseZones.map((zone) => ({
    ...zone,
    summary: buildZoneSummary(zone.title, zone.score, zone.items)
  }));
  const overallZoneSummary = buildOverallZoneSummary(zones);

  const yoastItems: YoastItem[] = [
    { id: 'yoast-title-length', label: 'SEO title length', status: titleLength >= 45 && titleLength <= 60 ? 'good' : titleLength >= 35 && titleLength <= 70 ? 'needs-work' : 'poor', details: `ความยาว title ${titleLength} ตัวอักษร`, value: titleLength },
    { id: 'yoast-meta-length', label: 'Meta description length', status: metaDescriptionLength >= 120 && metaDescriptionLength <= 160 ? 'good' : metaDescriptionLength >= 80 && metaDescriptionLength <= 180 ? 'needs-work' : 'poor', details: `ความยาว meta description ${metaDescriptionLength} ตัวอักษร`, value: metaDescriptionLength },
    { id: 'yoast-slug', label: 'Slug clarity', status: slugLength >= 8 && slugLength <= 75 && !slug.includes('_') ? 'good' : slugLength > 0 ? 'needs-work' : 'poor', details: slug ? `slug: /${slug}` : 'ไม่พบ slug ที่ชัดเจน', value: slug || '/' },
    { id: 'yoast-focus-title', label: 'Keyphrase in SEO title', status: !focus ? 'needs-work' : keywordInTitle ? 'good' : 'poor', details: !focus ? 'ยังไม่ได้ใส่ focus keyword' : keywordInTitle ? 'พบคีย์เวิร์ดใน title' : 'ไม่พบคีย์เวิร์ดใน title' },
    { id: 'yoast-focus-description', label: 'Keyphrase in meta description', status: !focus ? 'needs-work' : keywordInDescription ? 'good' : 'poor', details: !focus ? 'ยังไม่ได้ใส่ focus keyword' : keywordInDescription ? 'พบคีย์เวิร์ดใน meta description' : 'ไม่พบคีย์เวิร์ดใน meta description' },
    { id: 'yoast-focus-intro', label: 'Keyphrase in introduction', status: !focus ? 'needs-work' : keywordInIntro ? 'good' : 'poor', details: !focus ? 'ยังไม่ได้ใส่ focus keyword' : keywordInIntro ? 'พบคีย์เวิร์ดในบทนำ' : 'ไม่พบคีย์เวิร์ดในบทนำ' },
    { id: 'yoast-focus-h1', label: 'Keyphrase in H1 / main heading', status: !focus ? 'needs-work' : keywordInH1 ? 'good' : 'poor', details: !focus ? 'ยังไม่ได้ใส่ focus keyword' : keywordInH1 ? 'พบคีย์เวิร์ดใน H1' : 'ไม่พบคีย์เวิร์ดใน H1' },
    { id: 'yoast-focus-subheading', label: 'Keyphrase in subheading', status: !focus ? 'needs-work' : keywordInSubheading ? 'good' : 'poor', details: !focus ? 'ยังไม่ได้ใส่ focus keyword' : keywordInSubheading ? 'พบคีย์เวิร์ดใน H2/H3' : 'ไม่พบคีย์เวิร์ดใน H2/H3' },
    { id: 'yoast-focus-slug', label: 'Keyphrase in slug', status: !focus ? 'needs-work' : keywordInSlug ? 'good' : 'poor', details: !focus ? 'ยังไม่ได้ใส่ focus keyword' : keywordInSlug ? 'พบคีย์เวิร์ดใน slug' : 'ไม่พบคีย์เวิร์ดใน slug' },
    { id: 'yoast-density', label: 'Keyword density', status: !focus ? 'needs-work' : keywordDensity >= 0.5 && keywordDensity <= 3 ? 'good' : keywordDensity > 0 && keywordDensity <= 4 ? 'needs-work' : 'poor', details: !focus ? 'ยังไม่ได้ใส่ focus keyword' : `ความหนาแน่น ${keywordDensity}% | พบ ${keywordOccurrences} ครั้ง`, value: `${keywordDensity}%` },
    { id: 'yoast-text-length', label: 'Text length', status: bodyWordCount >= 600 ? 'good' : bodyWordCount >= 300 ? 'needs-work' : 'poor', details: `จำนวนคำ ${bodyWordCount} คำ`, value: bodyWordCount },
    { id: 'yoast-alt', label: 'Image alt attributes', status: altCoverage >= 90 ? 'good' : altCoverage >= 60 ? 'needs-work' : 'poor', details: `รูปภาพที่มี alt ${imagesWithAlt}/${images} (${altCoverage}%)`, value: `${altCoverage}%` },
    { id: 'yoast-alt-keyphrase', label: 'Keyphrase in image alt', status: !focus ? 'needs-work' : keywordInImageAlt ? 'good' : images > 0 ? 'needs-work' : 'poor', details: !focus ? 'ยังไม่ได้ใส่ focus keyword' : keywordInImageAlt ? 'พบคีย์เวิร์ดใน alt text' : images > 0 ? 'ยังไม่พบคีย์เวิร์ดใน alt text' : 'ไม่มีรูปภาพให้ตรวจ' },
    { id: 'yoast-internal-links', label: 'Internal links', status: internalLinks.length >= 3 ? 'good' : internalLinks.length >= 1 ? 'needs-work' : 'poor', details: `internal links ${internalLinks.length}`, value: internalLinks.length },
    { id: 'yoast-external-links', label: 'External links', status: externalLinks.length >= 1 ? 'good' : 'needs-work', details: `external links ${externalLinks.length}`, value: externalLinks.length },
    { id: 'yoast-link-balance', label: 'Internal / external balance', status: internalLinks.length >= 2 && externalLinks.length >= 1 ? 'good' : internalLinks.length >= 1 ? 'needs-work' : 'poor', details: `internal/external ratio ${internalLinks.length}:${externalLinks.length}`, value: `${internalLinks.length}:${externalLinks.length}` },
    { id: 'yoast-canonical', label: 'Canonical tag', status: canonical ? canonical === analyzedUrl ? 'good' : 'needs-work' : 'poor', details: canonical ? `canonical = ${canonical}` : 'ไม่พบ canonical tag', value: canonical || 'missing' },
    { id: 'yoast-robots', label: 'Robots meta', status: robots ? /noindex|nofollow/i.test(robots) ? 'needs-work' : 'good' : 'poor', details: robots ? `robots = ${robots}` : 'ไม่พบ meta robots', value: robots || 'missing' },
    { id: 'yoast-og', label: 'Open Graph completeness', status: ogTitle && ogDescription && ogImage ? 'good' : ogTitle || ogDescription ? 'needs-work' : 'poor', details: `og:title ${ogTitle ? '✓' : '✗'} | og:description ${ogDescription ? '✓' : '✗'} | og:image ${ogImage ? '✓' : '✗'} | og:url ${ogUrl ? '✓' : '✗'}` },
    { id: 'yoast-twitter', label: 'Twitter Cards completeness', status: twitterCard && twitterTitle && twitterDescription ? 'good' : twitterCard || twitterTitle ? 'needs-work' : 'poor', details: `twitter:card ${twitterCard ? '✓' : '✗'} | title ${twitterTitle ? '✓' : '✗'} | description ${twitterDescription ? '✓' : '✗'} | image ${twitterImage ? '✓' : '✗'}` },
    { id: 'yoast-headings', label: 'Heading hierarchy H1-H2-H3', status: h1Count === 1 && headingHierarchyIssues.length === 0 ? 'good' : h1Count >= 1 ? 'needs-work' : 'poor', details: `H1 ${h1Count} | H2 ${h2Count} | H3 ${h3Count}${headingHierarchyIssues.length ? ` | issues: ${headingHierarchyIssues.join('; ')}` : ''}` },
    { id: 'yoast-schema', label: 'Schema coverage', status: hasArticleSchema && hasOrganizationSchema ? 'good' : schemaTypes.length > 0 ? 'needs-work' : 'poor', details: schemaTypes.length ? `พบ schema: ${schemaTypes.join(', ')}` : 'ไม่พบ JSON-LD schema' },
    { id: 'yoast-readability', label: 'Readability', status: readabilityScore >= 75 ? 'good' : readabilityScore >= 55 ? 'needs-work' : 'poor', details: `คะแนน readability ${readabilityScore}/100 | ประโยคเฉลี่ย ${avgSentenceWords} คำ` }
  ];

  const yoastPoints = yoastItems.reduce((sum, item) => {
    if (item.status === 'good') return sum + 1;
    if (item.status === 'needs-work') return sum + 0.5;
    return sum;
  }, 0);
  const yoastScore = Math.round((yoastPoints / yoastItems.length) * 100);

  const overallScore = Math.round((zones.reduce((sum, zone) => sum + zone.score, 0) / zones.length) * 0.6 + readabilityScore * 0.15 + yoastScore * 0.25);

  const quickWins = [...zones.flatMap((zone) => zone.items), ...yoastItems.map((item) => ({ ...item, score: item.status === 'good' ? 10 : item.status === 'needs-work' ? 6 : 2, maxScore: 10, fix: item.details }))]
    .filter((item) => (item as CheckItem).score / (item as CheckItem).maxScore < 0.8)
    .sort((a, b) => (a as CheckItem).score / (a as CheckItem).maxScore - (b as CheckItem).score / (b as CheckItem).maxScore)
    .slice(0, 7)
    .map((item) => `${item.label}: ${'fix' in item ? item.fix : item.details}`);

  return {
    analyzedUrl,
    title,
    description,
    overallScore,
    scoreLabel: scoreLabel(overallScore),
    yoastScore,
    yoastLabel: yoastLabelFromScore(yoastScore),
    zones,
    overallZoneSummary,
    yoastItems,
    quickWins,
    raw: {
      canonical,
      robots,
      titleLength,
      metaDescriptionLength,
      slug,
      slugLength,
      h1Count,
      h2Count,
      h3Count,
      headingHierarchyIssues,
      readabilityScore,
      wordCount: bodyWordCount,
      avgSentenceWords,
      longParagraphs,
      transitionWordCount: transitionWords.length,
      internalLinks: internalLinks.length,
      externalLinks: externalLinks.length,
      internalExternalRatio,
      images,
      imagesWithAlt,
      altCoverage,
      schemaTypes,
      hasArticleSchema,
      hasFaqSchema,
      hasBreadcrumbSchema,
      hasOrganizationSchema,
      og: {
        title: Boolean(ogTitle),
        description: Boolean(ogDescription),
        image: Boolean(ogImage),
        url: Boolean(ogUrl)
      },
      twitter: {
        card: Boolean(twitterCard),
        title: Boolean(twitterTitle),
        description: Boolean(twitterDescription),
        image: Boolean(twitterImage)
      },
      focusKeyword: focus,
      keywordOccurrences,
      keywordDensity,
      keywordInTitle,
      keywordInDescription,
      keywordInSlug,
      keywordInH1,
      keywordInIntro,
      keywordInSubheading,
      keywordInImageAlt,
      yoastGood: yoastItems.filter((item) => item.status === 'good').length,
      yoastOkay: yoastItems.filter((item) => item.status === 'needs-work').length,
      yoastPoor: yoastItems.filter((item) => item.status === 'poor').length
    }
  };
}
