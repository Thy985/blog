import { visit } from 'unist-util-visit';
import type { Element, Root } from 'hast';
import { createLowlight } from 'lowlight';
import yaml from 'highlight.js/lib/languages/yaml';

/**
 * 只注册 YAML 的语法高亮。
 *
 * 全站 21 篇只有 3 段 yaml 代码块，而 rehype-highlight 默认会打进
 * highlight.js 的 common 语言集（几百 KB），性价比不划算。
 */
const lowlight = createLowlight({ yaml });

function classNames(node: Element): string[] {
  const raw: unknown = node.properties?.className;
  if (Array.isArray(raw)) return raw.map((v) => String(v));
  if (typeof raw === 'string') return raw.split(/\s+/);
  return [];
}

export const rehypeHighlightYaml = () => (tree: Root) => {
  visit(tree, 'element', (node: Element) => {
    if (node.tagName !== 'code') return;

    const names = classNames(node);
    if (!names.includes('language-yaml')) return;

    const source = node.children.map((c) => (c.type === 'text' ? c.value : '')).join('');
    const result = lowlight.highlight('yaml', source);

    node.children = result.children as Element['children'];
    node.properties = { ...node.properties, className: [...names, 'hljs'] };
  });
};
