import { Link } from 'react-router';
import { chapterPath, chaptersOf, meta } from '@/content/data';
import type { Track } from '@/content/types';
import styles from './ChapterSidebar.module.css';

const TRACKS: Track[] = ['knowledge', 'industry'];

export function ChapterSidebar({ currentId }: { currentId: string }) {
  return (
    <nav className={styles.nav} aria-label="全系列目录">
      {TRACKS.map((track) => (
        <div key={track} className={styles.group}>
          <div className={styles.groupTitle}>
            <span>{meta.tracks[track].label}</span>
            <span className={styles.groupRange}>{meta.tracks[track].range}</span>
          </div>
          <ul className={styles.list}>
            {chaptersOf(track).map((c) => {
              const current = c.id === currentId;
              return (
                <li key={c.id}>
                  <Link
                    to={chapterPath(c.id)}
                    className={current ? `${styles.item} ${styles.current}` : styles.item}
                    aria-current={current ? 'page' : undefined}
                  >
                    <span className={styles.num}>{c.id}</span>
                    <span className={styles.name}>{c.titleShort}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
