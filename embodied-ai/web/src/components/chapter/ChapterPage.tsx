import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { chapters, chapterIndex, chapterPath, getChapter, meta } from '@/content/data';
import { Markdown } from '@/markdown/Markdown';
import { ChapterSidebar } from './ChapterSidebar';
import { Toc } from './Toc';
import styles from './ChapterPage.module.css';

const CHARS_PER_MINUTE = 400;

function readingMinutes(chapter: NonNullable<ReturnType<typeof getChapter>>): number {
  const text =
    chapter.lead +
    chapter.preamble +
    chapter.sections.map((s) => s.body).join('');
  return Math.max(1, Math.round(text.length / CHARS_PER_MINUTE));
}

/** 证据条目里的行内标记：`反引号路径` 与 [文字](链接) */
const ITEM_RE = /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;

/** 证据条目 → 富文本。原始 Markdown 不改一个字，只在渲染层还原成链接与代码 */
function renderItem(item: string): ReactNode[] {
  const out: ReactNode[] = [];
  let cursor = 0;
  for (const m of item.matchAll(ITEM_RE)) {
    const at = m.index ?? 0;
    if (at > cursor) out.push(<span key={cursor}>{item.slice(cursor, at)}</span>);
    if (m[1] !== undefined) {
      out.push(
        <code key={at} className={styles.path}>
          {m[1]}
        </code>,
      );
    } else {
      out.push(
        <a key={at} href={m[3]} target="_blank" rel="noreferrer noopener">
          {m[2]}
        </a>,
      );
    }
    cursor = at + m[0].length;
  }
  if (cursor < item.length) out.push(<span key={cursor}>{item.slice(cursor)}</span>);
  return out;
}

function Evidence({ label, items }: { label: string; items: string[] }) {
  return (
    <footer className={styles.evidence}>
      <div className={styles.evidenceLabel}>{label}</div>
      <ul className={styles.evidenceList}>
        {items.map((item, i) => (
          <li key={i}>{renderItem(item)}</li>
        ))}
      </ul>
    </footer>
  );
}

export function ChapterPage() {
  const { id = '' } = useParams();
  const chapter = getChapter(id);

  if (!chapter) {
    return (
      <div className={styles.missing}>
        <h1>没有这一篇</h1>
        <p>篇号 {id} 不在系列范围内。</p>
        <Link to="/" className={styles.backLink}>
          ← 回到系列首页
        </Link>
      </div>
    );
  }

  const entry = chapterIndex.find((c) => c.id === chapter.id)!;
  const prev = chapter.prev ? chapterIndex.find((c) => c.id === chapter.prev) : null;
  const next = chapter.next ? chapterIndex.find((c) => c.id === chapter.next) : null;
  const track = meta.tracks[chapter.track];

  return (
    <div className={styles.layout}>
      <aside className={styles.left}>
        <ChapterSidebar currentId={chapter.id} />
      </aside>

      <article className={styles.article}>
        <header className={styles.head}>
          <div className={styles.kicker}>
            <span className={styles.trackTag} data-track={chapter.track}>
              {track.label}
            </span>
            <span className={styles.kickerText}>
              第 {chapter.id} 篇 · 共 {chapters.length} 篇 · {track.range}
            </span>
          </div>

          <h1 className={styles.title}>{chapter.titleShort}</h1>
          <p className={styles.subtitle}>{chapter.subtitle}</p>

          <div className={styles.lead}>{chapter.lead}</div>

          <div className={styles.metaRow}>
            <span>{entry.sections.length} 节</span>
            <span>约 {readingMinutes(chapter)} 分钟</span>
            {chapter.evolutionNotes.length > 0 && (
              <span>{chapter.evolutionNotes.length} 条演进注记</span>
            )}
            {chapter.asciiBlocks.length > 0 && <span>{chapter.asciiBlocks.length} 张结构图</span>}
          </div>
        </header>

        {chapter.preamble && (
          <Markdown sectionCount={entry.sections.length}>{chapter.preamble}</Markdown>
        )}

        <nav className={styles.mobileToc}>
          <details>
            <summary>本页目录（{entry.sections.length} 节）</summary>
            <Toc sections={entry.sections} />
          </details>
        </nav>

        {entry.sections.map((sec) => {
          const body = chapter.sections.find((s) => s.no === sec.no)?.body ?? '';
          const isSummary = sec.kind === 'summary';
          const isBoundary = sec.kind === 'boundary';

          return (
            <section
              key={sec.id}
              id={sec.id}
              className={isBoundary ? styles.sectionBoundary : styles.section}
              data-kind={sec.kind}
            >
              <h2 className={styles.h2}>
                <span className={styles.h2no}>{sec.no}</span>
                <span className={styles.h2title}>{sec.title}</span>
                {sec.kind === 'project' && <span className={styles.badgeProject}>项目实例</span>}
                {isBoundary && <span className={styles.badgeBoundary}>边界</span>}
              </h2>

              {isSummary && chapter.summaryText ? (
                <>
                  <blockquote className={styles.summary}>
                    <span className={styles.summaryLabel}>一句话总结</span>
                    <p>{chapter.summaryText}</p>
                  </blockquote>
                  {body && <Markdown sectionCount={entry.sections.length}>{body}</Markdown>}
                  {chapter.nextTeaser && (
                    <p className={styles.teaser}>{chapter.nextTeaser}</p>
                  )}
                </>
              ) : (
                <Markdown sectionCount={entry.sections.length}>{body}</Markdown>
              )}
            </section>
          );
        })}

        {chapter.evidence && <Evidence label={chapter.evidence.label} items={chapter.evidence.items} />}

        <nav className={styles.pager} aria-label="上下篇">
          {prev ? (
            <Link to={chapterPath(prev.id)} className={styles.pagerItem}>
              <span className={styles.pagerDir}>← 上一篇</span>
              <span className={styles.pagerTitle}>{prev.titleShort}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link to={chapterPath(next.id)} className={`${styles.pagerItem} ${styles.pagerNext}`}>
              <span className={styles.pagerDir}>下一篇 →</span>
              <span className={styles.pagerTitle}>{next.titleShort}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </article>

      <aside className={styles.right}>
        <Toc sections={entry.sections} />
      </aside>
    </div>
  );
}
