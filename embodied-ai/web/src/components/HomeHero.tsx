import { useState } from 'react';
import { Link } from 'react-router';
import { Canvas } from '@react-three/fiber';
import { Grid, OrbitControls } from '@react-three/drei';
import { Robot } from '@/three/Robot';
import { PART_BY_ID, type PartDef } from '@/three/parts';
import { meta } from '@/content/data';
import styles from './HomeHero.module.css';

/** 点击某个零件组，跳到最相关的那个 3D 场景 */
const GROUP_SCENE: Record<PartDef['group'], { to: string; label: string }> = {
  base: { to: '/scene/anatomy.html', label: '身体拆解' },
  torso: { to: '/scene/tf.html', label: '坐标系与 TF' },
  head: { to: '/scene/tf.html', label: '坐标系与 TF' },
  arm1: { to: '/scene/ik.html', label: 'IK 反解' },
  arm2: { to: '/scene/dual.html', label: '双臂碰撞与互斥' },
};

/**
 * 首页头图：全屏 3D 机器人。
 *
 * 灯光纯自建、不引 drei 的 Environment —— 那玩意要联网拉 HDR，
 * 而这个站是本地部署的，断网就黑屏。
 */
export function HomeHero() {
  const [selected, setSelected] = useState<string | null>(null);
  const part = selected ? PART_BY_ID.get(selected) : undefined;
  const scene = part ? GROUP_SCENE[part.group] : undefined;

  return (
    <section className={styles.hero}>
      <div className={styles.canvasWrap}>
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [2.05, 1.55, 2.55], fov: 42, near: 0.1, far: 60 }}
          gl={{ antialias: true, alpha: true }}
        >
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
          <Robot autoRotate selected={selected} onSelect={setSelected} />
          <OrbitControls
            enableDamping
            dampingFactor={0.08}
            enableZoom={false}
            enablePan={false}
            minPolarAngle={0.2}
            maxPolarAngle={Math.PI / 2.05}
            target={[-0.45, 0.72, 0]}
          />
        </Canvas>
      </div>

      <div className={styles.scrim} aria-hidden="true" />

      <div className={styles.overlay}>
        <div className={styles.copy}>
          <div className={styles.kicker}>
            <span className={styles.kickerDot} />
            具身智能系列笔记 · 业界调研快照 {meta.site.snapshot}
          </div>

          <h1 className={styles.title}>{meta.site.title}</h1>
          <p className={styles.subtitle}>{meta.site.subtitle}</p>
          <p className={styles.tagline}>{meta.site.tagline}</p>

          <div className={styles.actions}>
            <Link to="/scene/anatomy.html" className={styles.primaryBtn}>
              进入 3D：身体拆解
              <span aria-hidden="true">→</span>
            </Link>
            <a href="#scenes" className={styles.ghostBtn}>
              看 6 个 3D 场景
            </a>
            <Link to="/chapter/00.html" className={styles.ghostBtn}>
              读 21 篇原文
            </Link>
          </div>
        </div>

        <aside className={styles.partCard}>
          {part ? (
            <>
              <div className={styles.partHead}>
                <span className={styles.partName}>{part.label}</span>
                <button type="button" className={styles.partClose} onClick={() => setSelected(null)}>
                  收起
                </button>
              </div>
              <p className={styles.partNote}>{part.note}</p>
              <div className={styles.partMeta}>自由度 {part.dof ?? '—'}</div>
              {scene && (
                <Link to={scene.to} className={styles.partLink}>
                  在「{scene.label}」里细看 →
                </Link>
              )}
            </>
          ) : (
            <>
              <div className={styles.partHead}>
                <span className={styles.partName}>点开任一零件</span>
              </div>
              <p className={styles.partNote}>
                这台双臂机器人被拆成 21 个零件。点一下看它是什么、有几个自由度，以及在哪个 3D
                场景里被拆开讲。拖动空白处可以换角度看。
              </p>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
