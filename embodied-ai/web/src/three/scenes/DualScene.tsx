import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { Robot, NEUTRAL_JOINTS, type JointAngles } from '../Robot';
import { SceneShell } from '../SceneShell';
import { Slider, Chip, ButtonRow } from '../Controls';
import { solveTwoLink, forward, eeDistance } from './ikSolver';
import styles from './DualScene.module.css';

type Mode = 'mutex' | 'collision';

type P3 = [number, number, number];

const REST: Record<'arm1' | 'arm2', P3> = {
  arm1: [0.5, 1.16, 0.26],
  arm2: [-0.5, 1.16, 0.26],
};
/** 共享工作区 zone_a：两臂都想进去 */
const ZONE_A: P3 = [0.12, 0.58, 0.72];
const ZONE_B: P3 = [-0.5, 0.58, 0.72];

/** 碰撞阈值（米）：两臂末端靠得比这更近就算碰撞 */
const COLLIDE_AT = 0.32;

const lerp = (a: P3, b: P3, t: number): P3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** 按 playhead 求两臂的末端目标位置 */
function timeline(mode: Mode, t: number): { a1: P3; a2: P3; owner: string; note: string } {
  if (mode === 'mutex') {
    if (t < 0.3) {
      return { a1: lerp(REST.arm1, ZONE_A, t / 0.3), a2: REST.arm2, owner: '—', note: 'arm1 申请 zone_a，分配中' };
    }
    if (t < 0.5) {
      return { a1: ZONE_A, a2: REST.arm2, owner: 'arm1', note: 'arm1 持有 zone_a，arm2 在队列里等待' };
    }
    if (t < 0.72) {
      return {
        a1: lerp(ZONE_A, REST.arm1, (t - 0.5) / 0.22),
        a2: lerp(REST.arm2, ZONE_A, (t - 0.5) / 0.22),
        owner: 'arm1 → arm2',
        note: 'arm1 归还资源，调度器把 zone_a 分给排在队首的 arm2',
      };
    }
    return { a1: REST.arm1, a2: ZONE_A, owner: 'arm2', note: 'arm2 自动接管 zone_a 继续执行' };
  }

  // collision：两臂同时冲向同一个 zone
  const k = Math.min(1, t / 0.5);
  return {
    a1: lerp(REST.arm1, ZONE_A, k),
    a2: lerp(REST.arm2, ZONE_A, k),
    owner: '争夺中',
    note: '没有互斥仲裁，两臂同时进入同一工作区',
  };
}

function Zone({ p, color, label, occupied }: { p: P3; color: string; label: string; occupied: boolean }) {
  return (
    <group position={p}>
      <mesh>
        <boxGeometry args={[0.46, 0.46, 0.46]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={occupied ? 0.26 : 0.11}
          emissive={color}
          emissiveIntensity={occupied ? 0.5 : 0.12}
          depthWrite={false}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(0.46, 0.46, 0.46)]} />
        <lineBasicMaterial color={color} transparent opacity={occupied ? 0.95 : 0.4} />
      </lineSegments>
      <Html position={[0, 0.36, 0]} center style={{ pointerEvents: 'none' }}>
        <div className={styles.zoneTag} data-on={occupied}>
          {label}
        </div>
      </Html>
    </group>
  );
}

export function DualScene() {
  const [mode, setMode] = useState<Mode>('mutex');
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);

  const s = useMemo(() => timeline(mode, t), [mode, t]);

  const a1 = solveTwoLink(s.a1, 'arm1').angles;
  const a2 = solveTwoLink(s.a2, 'arm2').angles;
  const joints: JointAngles = { ...NEUTRAL_JOINTS, arm1: a1, arm2: a2 };

  const gap = eeDistance(a1, a2);
  const colliding = gap < COLLIDE_AT;

  useEffect(() => {
    if (!playing) return;
    const start = performance.now();
    const duration = 4200;
    const tick = () => {
      const p = ((performance.now() - start) / duration) % 1;
      setT(p);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  const zoneAOwner = s.owner.includes('arm1') ? 'arm1' : s.owner.includes('arm2') ? 'arm2' : s.owner === '争夺中' ? '争' : '';

  return (
    <SceneShell
      no="05"
      title="双臂碰撞与互斥"
      source="08 篇 · 多机协调"
      summary="多机协调的第一定律：能靠互斥消灭的碰撞，不要靠规划去解决。资源账本 + 排队 + 分配策略，用吞吐换确定性。"
      bullets={[
        '两台臂进入同一个工作空间，立刻产生四类问题：互斥、死锁、动态障碍、调度。',
        '工程上的关键是把协调问题降维成资源管理：任何动作先申请资源、后执行、用完归还。',
        '规划层解决「同时动」的避撞，协调层用「不同时动」消灭大部分需要避撞的场景。',
        'Zone 竞争排队看似浪费吞吐，实为最便宜的碰撞保护。',
        '调度器用优先级排序（M5.6 Level 4 验证），但运动中的抢占未验证——中断轨迹的安全恢复是另一个难题。',
      ]}
      hint="切换两种模式对比 · 点播放看整段流程 · 拖滑块逐帧看碰撞怎么发生"
      controls={
        <>
          <ButtonRow>
            <Chip on={mode === 'mutex'} onClick={() => { setMode('mutex'); setT(0); setPlaying(true); }}>
              有互斥仲裁
            </Chip>
            <Chip on={mode === 'collision'} onClick={() => { setMode('collision'); setT(0); setPlaying(true); }}>
              无互斥（碰撞）
            </Chip>
          </ButtonRow>

          <div className={styles.gap} data-collide={colliding}>
            <span>两臂末端距离</span>
            <strong>
              {gap.toFixed(3)} m
              <em>{colliding ? ' ← 碰撞' : gap < 0.5 ? ' ← 逼近' : ' 安全'}</em>
            </strong>
          </div>

          <div className={styles.owner}>
            <span>zone_a 持有者</span>
            <strong data-on={!!zoneAOwner && zoneAOwner !== '争'}>{zoneAOwner || '空闲'}</strong>
          </div>

          <p className={styles.note}>{s.note}</p>

          <Slider
            label="流程进度"
            value={t}
            min={0}
            max={1}
            step={0.002}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => {
              setPlaying(false);
              setT(v);
            }}
          />
          <ButtonRow>
            <Chip on={playing} onClick={() => setPlaying(!playing)}>
              {playing ? '⏸ 暂停' : '▶ 播放流程'}
            </Chip>
            <Chip
              onClick={() => {
                setPlaying(false);
                setT(0);
              }}
            >
              回到起点
            </Chip>
          </ButtonRow>
        </>
      }
      prev={{ to: '/scene/planning.html', label: '规划与避撞' }}
      next={{ to: '/scene/safety.html', label: '安全拦截' }}
    >
      <Robot joints={joints} selected={null} onSelect={() => {}} />
      <Zone p={ZONE_A} color="#d97706" label="zone_a（共享）" occupied={!!zoneAOwner && zoneAOwner !== '争'} />
      <Zone p={ZONE_B} color="#0f766e" label="zone_b" occupied={false} />

      {/* 两臂末端连线：碰撞时整条线变红 */}
      <mesh position={forward('arm1', a1)}>
        <sphereGeometry args={[0.045, 14, 14]} />
        <meshBasicMaterial color={colliding ? '#ff5a48' : '#22d3ee'} />
      </mesh>
      <mesh position={forward('arm2', a2)}>
        <sphereGeometry args={[0.045, 14, 14]} />
        <meshBasicMaterial color={colliding ? '#ff5a48' : '#22d3ee'} />
      </mesh>
    </SceneShell>
  );
}
