import { Link } from 'react-router';
import { useScrollProgress } from '@/lib/scroll';
import { toggleTheme } from '@/lib/theme';
import { meta } from '@/content/data';
import styles from './SiteHeader.module.css';

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M8 26V14l6-6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 26V16l-6-4"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="26" r="2.6" fill="currentColor" />
      <circle cx="24" cy="26" r="2.6" fill="currentColor" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" strokeLinejoin="round" />
    </svg>
  );
}

export function SiteHeader() {
  const progress = useScrollProgress();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <span className={styles.mark}>
            <BrandMark />
          </span>
          <span className={styles.brandText}>{meta.site.title}</span>
        </Link>

        <nav className={styles.nav} aria-label="主导航">
          <Link to="/#scenes" className={styles.navLink}>
            3D 场景
          </Link>
          <Link to="/#knowledge" className={styles.navLink}>
            两条线
          </Link>
          <Link to="/#series" className={styles.navLink}>
            21 篇原文
          </Link>
          <button
            type="button"
            className={styles.themeBtn}
            onClick={toggleTheme}
            aria-label="切换深浅主题"
            title="切换深浅主题"
          >
            <SunIcon />
            <MoonIcon />
          </button>
        </nav>
      </div>

      <div className={styles.progressTrack} aria-hidden="true">
        <div className={styles.progressBar} style={{ transform: `scaleX(${progress})` }} />
      </div>
    </header>
  );
}
