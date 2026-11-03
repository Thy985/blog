import { useEffect, useState } from 'react';
import styles from './Toc.module.css';

export interface TocSection {
  no: number;
  id: string;
  title: string;
  kind: string;
}

export function Toc({ sections }: { sections: TocSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? '');

  useEffect(() => {
    const onScroll = () => {
      const offset = 110;
      let current = sections[0]?.id ?? '';
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - offset <= 0) current = s.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [sections]);

  return (
    <nav className={styles.toc} aria-label="本页目录">
      <div className={styles.title}>本页目录</div>
      <ul className={styles.list}>
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={active === s.id ? `${styles.item} ${styles.active}` : styles.item}
              aria-current={active === s.id ? 'true' : undefined}
            >
              <span className={styles.no}>{s.no}</span>
              <span className={styles.label}>{s.title}</span>
              {s.kind === 'project' && <span className={styles.dot} title="项目实例" />}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
