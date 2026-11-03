import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Text, Paragraph, PhrasingContent } from 'mdast';

/* ===================================================================
   构建期已经解析好的结构，这里只做三件事：
   1. 把全书高频的「NN 篇」还原成站内链接——21 篇因此从线性长文变成知识网络
   2. 把「§N」还原成当前篇的节锚点
   3. 标注演进注记段落与 ASCII 结构图，供 CSS 差异化呈现
   =================================================================== */

export interface RefOptions {
  /** 实际存在的篇号 */
  knownIds: Set<string>;
  /** 篇号 → 站内路径 */
  pathOf: (id: string) => string;
  /** 当前篇的节数，用于判断 §N 能否落到锚点 */
  sectionCount: number;
}

const REF_RE = /(\d{2}(?:\s*[/–—－-]\s*\d{2})*)\s*篇|§(\d+)/g;

type Node = { type: string; value?: string; children?: Node[]; data?: any };

function isText(n: Node | undefined): n is Node & { value: string } {
  return !!n && n.type === 'text' && typeof n.value === 'string';
}

function textOf(n: Node): string {
  if (isText(n)) return n.value;
  if (n.children) return n.children.map(textOf).join('');
  return '';
}

function makeLink(url: string, label: string): PhrasingContent {
  return {
    type: 'link',
    url,
    title: null,
    data: { hProperties: { className: ['md-ref'] } },
    children: [{ type: 'text', value: label }],
  } as PhrasingContent;
}

function buildRefNodes(m: RegExpMatchArray, opts: RefOptions): PhrasingContent[] {
  if (m[2] !== undefined) {
    const no = Number(m[2]);
    if (no >= 1 && no <= opts.sectionCount) {
      return [makeLink(`#s${no}`, m[0])];
    }
    return [{ type: 'text', value: m[0] }];
  }

  // 「03/04 篇」「16–17 篇」：逐个编号分别成链，中间分隔符保留原样
  const parts = m[1].split(/(\s*[/–—－-]\s*)/);
  const out: PhrasingContent[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (/^\d{2}$/.test(part)) {
      out.push(opts.knownIds.has(part) ? makeLink(opts.pathOf(part), part) : { type: 'text', value: part });
    } else {
      out.push({ type: 'text', value: part });
    }
  }
  if (out.length) {
    out.push({ type: 'text', value: ' 篇' });
  }
  return out;
}

/** 「NN 篇」「§N」→ 站内链接 */
export const remarkCrossRefs: Plugin<[RefOptions], Root> = (opts) => (tree) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return;
      const value = node.value;
      REF_RE.lastIndex = 0;
      const matches = [...value.matchAll(REF_RE)];
      if (!matches.length) return;

      const children: PhrasingContent[] = [];
      let cursor = 0;
      for (const m of matches) {
        const at = m.index ?? 0;
        if (at > cursor) children.push({ type: 'text', value: value.slice(cursor, at) });
        children.push(...buildRefNodes(m, opts));
        cursor = at + m[0].length;
      }
      if (cursor < value.length) children.push({ type: 'text', value: value.slice(cursor) });

      const siblings = parent.children as Node[];
      siblings.splice(index, 1, ...(children as unknown as Node[]));
      return index + children.length;
    });
};

/**
 * 演进注记标记：`**演进注记（标题）**：正文` → 卡片 + 徽标。
 *
 * 只认段首 A 型写法。段尾 `（演进注记）` 是普通行文的一部分（见 02 篇），
 * 整段做成卡片会把一大段正常文字染色，所以不动它。
 *
 * 列表项要标在 listItem 上：紧列表在 mdast → hast 时会把 `<p>` 拆散内联进 `<li>`，
 * 挂在 `<p>` 上的属性会随之丢失。
 */
export const remarkMarkEvolution: Plugin<[], Root> = () => (tree) => {
    visit(tree, 'paragraph', (node: Paragraph, _index, parent) => {
      const kids = (node.children ?? []) as unknown as Node[];
      if (!kids.length) return;

      // 任务清单项不是演进注记
      if (parent && parent.type === 'listItem' && typeof parent.checked === 'boolean') return;

      let label = '';

      // A 型：**演进注记（标题）**：正文 —— 标签抽成卡片徽标，正文只留内容
      const first = kids[0];
      if (first.type === 'strong') {
        const m = /^演进注记(?:（[^）]*）)?$/.exec(textOf(first).trim());
        if (m) {
          label = textOf(first).trim();
          kids.shift();
          const next = kids[0];
          if (next && isText(next)) next.value = next.value.replace(/^\s*[：:]\s*/, '');
        }
      }

      if (!label) return;

      // 紧列表在 mdast → hast 时会把 <p> 拆散内联进 <li>，
      // 挂在 <p> 上的属性会丢失，所以列表项必须标在 listItem 上。
      const owner = (parent && parent.type === 'listItem' ? parent : node) as unknown as Node;
      owner.data = owner.data ?? {};
      owner.data.hProperties = {
        ...(owner.data.hProperties ?? {}),
        'data-evo': 'true',
        'data-evo-label': label,
      };
    });
};

/** 无语言标注的围栏块即 ASCII 结构图（带标注的是真代码） */
export const remarkMarkDiagram: Plugin<[], Root> = () => (tree) => {
    visit(tree, 'code', (node) => {
      if (node.lang) return;
      node.data = node.data ?? {};
      node.data.hProperties = { ...(node.data.hProperties ?? {}), 'data-diagram': 'true' };
    });
};
