import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';

/**
 * 路由切换后的滚动行为：
 * 带 hash → 平滑滚到锚点；不带 hash → 回到顶部。
 * 站内交叉引用链接大量依赖这个行为（从 15 篇跳到 03 篇的某个小节）。
 */
export function useScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) {
        requestAnimationFrame(() =>
          el.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        );
        return;
      }
    }
    window.scrollTo({ top: 0 });
  }, [pathname, hash]);
}

/** 整页滚动进度（0–1），用于顶栏进度条 */
export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return progress;
}
