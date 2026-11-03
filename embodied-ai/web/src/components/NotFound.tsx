import { Link } from 'react-router';
import { chapterIndex, chapterPath } from '@/content/data';
import styles from './NotFound.module.css';

export function NotFound() {
  return (
    <div className={styles.wrap}>
      <div className={styles.code}>404</div>
      <h1 className={styles.title}>这一页不存在</h1>
      <p className={styles.body}>
        链接可能来自旧版本。这里的全系列共 {chapterIndex.length} 篇，从下面任意一篇进入。
      </p>
      <div className={styles.list}>
        {chapterIndex.slice(0, 8).map((c) => (
          <Link key={c.id} to={chapterPath(c.id)} className={styles.item}>
            <span className={styles.num}>{c.id}</span>
            {c.titleShort}
          </Link>
        ))}
      </div>
      <Link to="/" className={styles.home}>
        ← 回到系列首页
      </Link>
    </div>
  );
}
