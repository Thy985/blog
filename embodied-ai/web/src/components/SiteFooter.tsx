import { Link } from 'react-router';
import { meta } from '@/content/data';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <div className={styles.name}>{meta.site.title}</div>
          <div className={styles.note}>
            正文来自仓库中的 Markdown 原文，构建期解析为结构化数据，站点不改动一个字。
          </div>
        </div>
        <div className={styles.right}>
          <div className={styles.meta}>
            <span>业界调研快照 {meta.site.snapshot}</span>
            <span>共 21 篇</span>
          </div>
          <Link to="/" className={styles.top}>
            回到顶部 ↑
          </Link>
        </div>
      </div>
    </footer>
  );
}
