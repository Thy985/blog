#!/usr/bin/env node
/**
 * 构建期内容管线
 * ------------------------------------------------------------------
 * 输入：embodied-ai/ 下 00–20 共 21 个 .md（原文零改动）
 * 输出：src/content/generated/chapters.json + meta.json
 *
 * 职责边界：只做「切」不做「渲染」。所有结构信息在构建期推断，
 * React 侧只负责把 JSON 画出来。
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = join(HERE, '..');
const SERIES = join(WEB, '..');
const OUT = join(WEB, 'src', 'content', 'generated');

const BOX_CHARS = /[┌┐└┘├┤┬┴┼─│═╔╗╚╝╠╣╦╩╬]/;
const EVOLUTION_RE = /^\s*(?:[-*+]\s+)?\*\*演进注记(?:（([^）]*)）)?\*\*[：:]\s*(.*)$/;
const EVIDENCE_RE = /^\*\*(证据索引|参考|参考文献|来源)\*\*[：:]\s*(.*)$/;
const SECTION_RE = /^##\s+(\d+)\.\s*(.+?)\s*$/;

/* ---------- 通用工具 ---------- */

/** 标记每一行是否处于围栏代码块内部（围栏行本身也算在内） */
function markFences(lines) {
  const inCode = new Array(lines.length).fill(false);
  let open = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^```/.test(lines[i])) {
      open = !open;
      inCode[i] = true;
      continue;
    }
    inCode[i] = open;
  }
  return inCode;
}

/** 取连续的行直到空行为止 */
function takeParagraph(lines, start) {
  const out = [];
  let i = start;
  for (; i < lines.length; i++) {
    if (!lines[i].trim()) break;
    out.push(lines[i].trim());
  }
  return { text: out.join(''), next: i };
}

/** 拆出「标题——副标题」 */
function splitTitle(raw) {
  const i = raw.indexOf('——');
  if (i === -1) return { titleShort: raw.trim(), subtitle: '' };
  return {
    titleShort: raw.slice(0, i).trim(),
    subtitle: raw.slice(i + 2).trim(),
  };
}

/* ---------- 单篇解析 ---------- */

function parseChapter(file) {
  const raw = readFileSync(join(SERIES, file), 'utf8').replace(/\r\n/g, '\n');
  const lines = raw.split('\n');
  const inCode = markFences(lines);
  const id = file.slice(0, 2);
  const order = Number(id);

  // 标题
  let titleLine = '';
  let titleIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (!inCode[i] && /^#\s+/.test(lines[i])) {
      titleLine = lines[i].replace(/^#\s+/, '').trim();
      titleIdx = i;
      break;
    }
  }
  if (!titleLine) throw new Error(`${file}: 缺少一级标题`);
  const { titleShort, subtitle } = splitTitle(titleLine);

  // 引言：标题后第一个连续 blockquote（允许中间夹空行）
  let lead = '';
  let leadEnd = titleIdx;
  {
    let i = titleIdx + 1;
    while (i < lines.length && !lines[i].trim()) i++;
    const quote = [];
    while (i < lines.length && !inCode[i] && /^\s*>/.test(lines[i])) {
      quote.push(lines[i].replace(/^\s*>\s?/, ''));
      i++;
    }
    if (quote.length) {
      lead = quote.join('').trim();
      leadEnd = i;
    }
  }

  // 章节切分
  const heads = [];
  for (let i = 0; i < lines.length; i++) {
    if (inCode[i]) continue;
    const m = SECTION_RE.exec(lines[i]);
    if (m) heads.push({ no: Number(m[1]), title: m[2], line: i });
  }

  const sections = heads.map((h, idx) => {
    const start = h.line + 1;
    const end = idx + 1 < heads.length ? heads[idx + 1].line : lines.length;
    let body = lines.slice(start, end).join('\n').trim();
    let kind = 'normal';
    if (/边界与不足|局限与不足|不足与边界/.test(h.title)) kind = 'boundary';
    else if (/一句话总结|本篇总结|小结/.test(h.title)) kind = 'summary';
    else if (/项目实例|项目锚点|项目实例/.test(h.title)) kind = 'project';
    return { no: h.no, id: `s${h.no}`, title: h.title, kind, body, start, end };
  });

  // 前言（引言之后、第一个 ## 之前）
  const firstHead = heads.length ? heads[0].line : lines.length;
  const preamble = lines.slice(leadEnd, firstHead).join('\n').trim();

  /* 证据索引：从所在 section 中摘出 */
  let evidence = null;
  for (const sec of sections) {
    const secLines = sec.body.split('\n');
    const hit = secLines.findIndex((l) => EVIDENCE_RE.test(l));
    if (hit === -1) continue;
    const m = EVIDENCE_RE.exec(secLines[hit]);
    const rest = m[2].trim();
    const items = rest
      .split(/[；;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    evidence = { label: m[1], items, raw: secLines[hit] };
    secLines.splice(hit, 1);
    sec.body = secLines.join('\n').trim();
    break;
  }

  /* 演进注记：两种写法
   *   A. `**演进注记（标题）**：正文` / `**演进注记**：正文`
   *   B. 整段以 `（演进注记）` 收尾
   * 抽成结构的同时保留在正文中（渲染层会做成特殊块） */
  const evolutionNotes = [];
  for (const sec of sections) {
    const secLines = sec.body.split('\n');
    for (let i = 0; i < secLines.length; i++) {
      const line = secLines[i];
      if (/^\s*[-*+]\s*\[[ xX]\]/.test(line)) continue; // 清单项不是注记

      const m = EVOLUTION_RE.exec(line);
      if (m) {
        let text = m[2].trim();
        let j = i + 1;
        while (j < secLines.length && secLines[j].trim() && !/^\s*[-*+]\s/.test(secLines[j])) {
          text += secLines[j].trim();
          j++;
        }
        evolutionNotes.push({ sectionNo: sec.no, title: (m[1] || '').trim(), text });
        continue;
      }

      if (/（演进注记）[。.]?\s*$/.test(line) && line.trim().length > 12) {
        evolutionNotes.push({
          sectionNo: sec.no,
          title: '',
          text: line.replace(/（演进注记）[。.]?\s*$/, '').trim(),
        });
      }
    }
  }

  /* 总结节：抽出总结句与「下一篇」预告（并从正文里移除，避免重复渲染） */
  let summaryText = null;
  let nextTeaser = null;
  const summarySec = sections.find((s) => s.kind === 'summary');
  if (summarySec) {
    const sl = summarySec.body.split('\n');
    const qIdx = sl.findIndex((l) => /^\s*>/.test(l));
    if (qIdx !== -1) {
      const quote = [];
      let k = qIdx;
      for (; k < sl.length && /^\s*>/.test(sl[k]); k++) {
        quote.push(sl[k].replace(/^\s*>\s?/, ''));
      }
      summaryText = quote.join('').trim();
      sl.splice(qIdx, k - qIdx);
    }
    const teaserIdx = sl.findIndex((l) => /^\s*(下一篇|上一篇)/.test(l));
    if (teaserIdx !== -1) {
      nextTeaser = sl[teaserIdx].trim();
      sl.splice(teaserIdx, 1);
    }
    summarySec.body = sl.join('\n').trim();
  }

  /* ASCII 图：提取出来供 M2 复用，正文里仍保留原始围栏块 */
  const asciiBlocks = [];
  {
    let open = false;
    let lang = '';
    let buf = [];
    let secNo = 0;
    for (let i = 0; i < lines.length; i++) {
      if (inCode[i] && /^```/.test(lines[i])) {
        if (!open) {
          open = true;
          lang = lines[i].replace(/^```/, '').trim();
          buf = [];
          const sec = sections.find((s) => i >= s.start && i < s.end);
          secNo = sec ? sec.no : 0;
        } else {
          open = false;
          const content = buf.join('\n');
          // 无语言标注的围栏块即为本系列的 ASCII 结构图（带标注的是真代码）
          if (!lang) asciiBlocks.push({ sectionNo: secNo, content });
        }
        continue;
      }
      if (open) buf.push(lines[i]);
    }
  }

  return {
    id,
    order,
    slug: file.replace(/\.md$/, ''),
    filename: file,
    track: order <= 15 ? 'knowledge' : 'industry',
    title: titleLine,
    titleShort,
    subtitle,
    lead,
    preamble,
    sections: sections.map(({ no, id: sid, title, kind, body }) => ({ no, id: sid, title, kind, body })),
    summaryText,
    nextTeaser,
    evidence,
    evolutionNotes,
    asciiBlocks,
  };
}

/* ---------- 主流程 ---------- */

const files = readdirSync(SERIES)
  .filter((f) => /^\d{2}.*\.md$/.test(f))
  .sort();

if (files.length !== 21) {
  console.warn(`[build-content] 警告：期望 21 篇，实际找到 ${files.length} 篇`);
}

const chapters = files.map(parseChapter);

// 串联前后篇
chapters.forEach((c, i) => {
  c.prev = i > 0 ? chapters[i - 1].id : null;
  c.next = i < chapters.length - 1 ? chapters[i + 1].id : null;
});

// 统计体检
const stat = {
  files: chapters.length,
  withLead: chapters.filter((c) => c.lead).length,
  withBoundary: chapters.filter((c) => c.sections.some((s) => s.kind === 'boundary')).length,
  withSummary: chapters.filter((c) => c.summaryText).length,
  withEvidence: chapters.filter((c) => c.evidence).length,
  withEvolution: chapters.filter((c) => c.evolutionNotes.length).length,
  sections: chapters.reduce((n, c) => n + c.sections.length, 0),
  ascii: chapters.reduce((n, c) => n + c.asciiBlocks.length, 0),
  evolution: chapters.reduce((n, c) => n + c.evolutionNotes.length, 0),
};

const meta = {
  site: {
    title: '用一台双臂机器人打开具身智能的大门',
    subtitle: '70% 知识 + 30% 项目',
    tagline: '从身体的自由度讲到大脑的插槽——一份有立场的具身智能学习笔记。',
    snapshot: '2026-10-24',
  },
  tracks: {
    knowledge: { label: '知识线', range: '00–15', desc: '从身体到大脑，把确定性经典机器人栈讲透' },
    industry: { label: '业界线', range: '16–20', desc: '以 2026-10-24 为快照，走出项目看产业' },
  },
  chapters: chapters.map((c) => ({
    id: c.id,
    order: c.order,
    slug: c.slug,
    title: c.title,
    titleShort: c.titleShort,
    subtitle: c.subtitle,
    track: c.track,
    prev: c.prev,
    next: c.next,
    sections: c.sections.map((s) => ({ no: s.no, id: s.id, title: s.title, kind: s.kind })),
  })),
};

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'chapters.json'), JSON.stringify(chapters));
writeFileSync(join(OUT, 'meta.json'), JSON.stringify(meta, null, 2));

console.log('[build-content] 解析完成：');
console.table(stat);
console.log(`[build-content] → ${OUT}`);
