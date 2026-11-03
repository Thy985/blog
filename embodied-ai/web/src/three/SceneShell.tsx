import type { ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { Link } from 'react-router';
import styles from './SceneShell.module.css';

interface SceneShellProps {
  /** 场景序号，如 "01" */
  no: string;
  title: string;
  /** 对应的原文篇目，如 "01 篇 · 机器人的身体" */
  source: string;
  /** 一句话主旨 */
  summary: string;
  /** 侧边要点 */
  bullets: string[];
  /** 交互说明，贴在底部 */
  hint?: string;
  /** 右侧自定义控件 */
  controls?: ReactNode;
  /** 场景内 3D 内容 */
  children: ReactNode;
  /** 浮在 3D 之上的 HTML 浮层（说明卡、图例等） */
  overlay?: ReactNode;
  /** 上一个/下一个场景 */
  prev?: { to: string; label: string };
  next?: { to: string; label: string };
}

export function SceneShell({
  no,
  title,
  source,
  summary,
  bullets,
  hint,
  controls,
  children,
  overlay,
  prev,
  next,
}: SceneShellProps) {
  return (
    <div className={styles.scene}>
      <div className={styles.canvasWrap}>
        <Canvas
          camera={{ position: [2.35, 1.75, 2.75], fov: 42 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
        >
          <color attach="background" args={['#0b1416']} />
          {/* 纯自建灯光，不用 drei 的 Environment —— 那个要联网拉 HDR，
              而这个站是本地部署的，断网整块画布会挂掉。 */}
          <hemisphereLight args={['#9fd8d2', '#12211f', 1.35]} />
          <directionalLight position={[3, 5, 2]} intensity={1.7} color="#eaf6f3" />
          <directionalLight position={[-4, 2, -3]} intensity={0.65} color="#7fb4c7" />
          <pointLight position={[0.4, 1.3, 2.2]} intensity={2.4} distance={8} color="#22d3ee" />
          <Grid
            position={[0, -0.001, 0]}
            args={[14, 14]}
            cellSize={0.25}
            cellThickness={0.6}
            cellColor="#1d3a3a"
            sectionSize={1}
            sectionThickness={1}
            sectionColor="#2c5250"
            fadeDistance={12}
            infiniteGrid
          />
          {children}
          <OrbitControls
            enableDamping
            dampingFactor={0.08}
            minPolarAngle={0.15}
            maxPolarAngle={Math.PI / 2.08}
            minDistance={1.4}
            maxDistance={8}
          />
        </Canvas>
      </div>

      {overlay}

      {/* 顶部：返回 + 标题 */}
      <header className={styles.top}>
        <Link to="/" className={styles.back}>
          ← 系列首页
        </Link>
        <div className={styles.titleBlock}>
          <span className={styles.no}>{no}</span>
          <h1 className={styles.title}>{title}</h1>
          <span className={styles.source}>{source}</span>
        </div>
      </header>

      {/* 左侧：要点面板 */}
      <aside className={styles.panel}>
        <p className={styles.summary}>{summary}</p>
        <ul className={styles.bullets}>
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
        {controls && <div className={styles.controls}>{controls}</div>}
      </aside>

      {/* 底部：操作提示 + 上下场景 */}
      <footer className={styles.bottom}>
        {hint && <span className={styles.hint}>{hint}</span>}
        <nav className={styles.nav}>
          {prev ? (
            <Link to={prev.to} className={styles.navBtn}>
              ← {prev.label}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link to={next.to} className={styles.navBtn}>
              {next.label} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </footer>
    </div>
  );
}
