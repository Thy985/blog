import { memo, useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { rehypeHighlightYaml } from './rehypeHighlightYaml';
import type { PluggableList } from 'unified';
import { Link } from 'react-router';
import { KNOWN_IDS, chapterPath } from '@/content/data';
import { remarkCrossRefs, remarkMarkDiagram, remarkMarkEvolution } from './remarkPlugins';

interface Props {
  /** Markdown 片段 */
  children: string;
  /** 当前篇的节数，决定 §N 能否落锚点 */
  sectionCount?: number;
  /** 供测试与调试使用的包裹类名 */
  className?: string;
}

/** react-markdown 传入的 hast 节点（属性由 remark 插件写入） */
type HastNode = { properties?: Record<string, unknown> } | undefined;

function isEvolution(node: HastNode): boolean {
  return node?.properties?.['data-evo'] === 'true';
}

function evolutionLabel(node: HastNode): string {
  const label = node?.properties?.['data-evo-label'];
  return typeof label === 'string' && label.length > 0 ? label : '演进注记';
}

export const Markdown = memo(function Markdown({ children, sectionCount = 0, className }: Props) {
  const plugins = useMemo<PluggableList>(
    () => [
      remarkGfm,
      [remarkCrossRefs, { knownIds: KNOWN_IDS, pathOf: chapterPath, sectionCount }],
      remarkMarkEvolution,
      remarkMarkDiagram,
    ],
    [sectionCount],
  );

  const components = useMemo<Components>(
    () => ({
      a({ node, href, children: kids, ...rest }) {
        const url = href ?? '';
        // 站内绝对路径 → 走路由，保留 basename 与客户端导航
        if (url.startsWith('/')) return <Link to={url} {...rest}>{kids}</Link>;
        // 纯锚点 → 原生跳转
        if (url.startsWith('#')) return <a href={url} {...rest}>{kids}</a>;
        return (
          <a href={url} target="_blank" rel="noreferrer noopener" {...rest}>
            {kids}
          </a>
        );
      },
      table({ children: kids }) {
        return (
          <div className="md-table-wrap">
            <table>{kids}</table>
          </div>
        );
      },
      pre({ node, children: kids }) {
        const first = node?.children?.[0] as { properties?: Record<string, unknown> } | undefined;
        const diagram = first?.properties?.['data-diagram'] === 'true';
        return <pre className={diagram ? 'md-diagram' : undefined}>{kids}</pre>;
      },
      p({ node, children: kids }) {
        if (isEvolution(node)) {
          return (
            <p className="md-evo" data-evo="true" data-evo-label={evolutionLabel(node)}>
              {kids}
            </p>
          );
        }
        return <p>{kids}</p>;
      },
      li({ node, children: kids }) {
        // 演进注记可能落在列表项上（紧列表会把 <p> 拆散内联进 <li>）
        if (isEvolution(node)) {
          return (
            <li className="md-evo" data-evo="true" data-evo-label={evolutionLabel(node)}>
              {kids}
            </li>
          );
        }
        return <li>{kids}</li>;
      },
    }),
    [],
  );

  return (
    <div className={className ? `md-body ${className}` : 'md-body'}>
      <ReactMarkdown remarkPlugins={plugins} rehypePlugins={[rehypeHighlightYaml]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
});
