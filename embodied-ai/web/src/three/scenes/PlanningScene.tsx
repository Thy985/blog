import { useEffect, useMemo, useRef, useState } from 'react';
import { Robot, NEUTRAL_JOINTS } from '../Robot';
import { SceneShell } from '../SceneShell';
import { Slider, Chip, ButtonRow } from '../Controls';
import {
  runRrt,
  DEFAULT_OBSTACLES,
  DEFAULT_BOUNDS,
  START,
  GOAL,
  type RrtResult,
} from './rrt';
import styles from './PlanningScene.module.css';

function Obstacles({ obstacles }: { obstacles: typeof DEFAULT_OBSTACLES }) {
  return (
    <group>
      {obstacles.map((o, i) => (
        <mesh key={i} position={[o.x, 0.32, o.z]}>
          <boxGeometry args={[o.w, 0.64, o.d]} />
          <meshStandardMaterial
            color="#7f2b22"
            emissive="#b42318"
            emissiveIntensity={0.35}
            transparent
            opacity={0.72}
            roughness={0.65}
          />
        </mesh>
      ))}
    </group>
  );
}

function TreeLines({ result, visibleEdges, showTree }: { result: RrtResult; visibleEdges: number; showTree: boolean }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(visibleEdges * 6);
    for (let i = 0; i < visibleEdges; i++) {
      const [a, b] = result.edges[i];
      arr[i * 6 + 0] = result.nodes[a].p[0];
      arr[i * 6 + 1] = 0.012;
      arr[i * 6 + 2] = result.nodes[a].p[1];
      arr[i * 6 + 3] = result.nodes[b].p[0];
      arr[i * 6 + 4] = 0.012;
      arr[i * 6 + 5] = result.nodes[b].p[1];
    }
    return arr;
  }, [result, visibleEdges]);

  if (!showTree || visibleEdges === 0) return null;

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#34d399" transparent opacity={0.62} />
    </lineSegments>
  );
}

function PathLine({ result, visibleEdges, showPath }: { result: RrtResult; visibleEdges: number; showPath: boolean }) {
  const reached = visibleEdges >= result.edges.length;

  const positions = useMemo(() => {
    if (!reached || result.path.length < 2) return null;
    const arr = new Float32Array(result.path.length * 3);
    result.path.forEach((p, i) => {
      arr[i * 3 + 0] = p[0];
      arr[i * 3 + 1] = 0.022;
      arr[i * 3 + 2] = p[1];
    });
    return arr;
  }, [result, reached]);

  if (!showPath || !positions) return null;

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#d97706" linewidth={3} />
    </line>
  );
}

function Marker({ p, color, size = 0.075, y = 0.06 }: { p: [number, number]; color: string; size?: number; y?: number }) {
  return (
    <mesh position={[p[0], y, p[1]]}>
      <sphereGeometry args={[size, 18, 18]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

export function PlanningScene() {
  const [maxNodes, setMaxNodes] = useState(220);
  const [seed, setSeed] = useState(20261026);
  const [showTree, setShowTree] = useState(true);
  const [showPath, setShowPath] = useState(true);
  const [progress, setProgress] = useState(1);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);

  const result = useMemo(
    () =>
      runRrt({
        start: START,
        goal: GOAL,
        obstacles: DEFAULT_OBSTACLES,
        bounds: DEFAULT_BOUNDS,
        step: 0.22,
        maxNodes,
        seed,
      }),
    [maxNodes, seed],
  );

  const reached = result.path.length > 0;
  const visibleEdges = Math.round(progress * result.edges.length);

  // 播放树的生长过程
  useEffect(() => {
    if (!playing) return;
    const started = performance.now();
    const duration = 1500;
    const tick = () => {
      const t = Math.min(1, (performance.now() - started) / duration);
      setProgress(t);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  return (
    <SceneShell
      no="04"
      title="规划与避撞"
      source="04 篇 · 运动规划"
      summary="高维构型空间里没有精确解，只有采样和概率。所以规划层的工程学不在算法本身，而在失败率的管理。"
      bullets={[
        '采样式规划（OMPL / RRT / PRM）是概率完备的：有解则求解时间趋于收敛，但不保证最优、不保证稳定时间。',
        '同一个查询今天 0.3 秒明天 3 秒，是常态而非故障。',
        '规划失败是流程节点而非异常：放宽约束 → 换抓取姿态 → 释放资源宣告失败，每步都有去处。',
        'M5.1 恢复框架把失败处理写成五类 handler，而不是散落的 if-else。',
        '路径还要后处理：shortcut 剪掉来回绕的段、时间参数化把几何路径变成可执行轨迹。',
      ]}
      hint="点播放看树怎么生长 · 拖滑块回放过程 · 换 seed 重跑一棵新树"
      controls={
        <>
          <div className={styles.stats}>
            <div>
              <span>迭代</span>
              <strong>{result.iterations}</strong>
            </div>
            <div>
              <span>节点</span>
              <strong>{result.nodes.length}</strong>
            </div>
            <div>
              <span>路径点</span>
              <strong>{reached ? result.path.length : '—'}</strong>
            </div>
          </div>

          <div className={styles.verdict} data-ok={reached}>
            {reached ? '✓ 找到路径' : '✗ 迭代内未收敛（放宽约束或增加迭代）'}
          </div>

          <Slider
            label="生长进度"
            value={progress}
            min={0}
            max={1}
            step={0.005}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => {
              setPlaying(false);
              setProgress(v);
            }}
          />
          <Slider
            label="最大节点数"
            value={maxNodes}
            min={40}
            max={480}
            step={10}
            format={(v) => `${v}`}
            onChange={(v) => {
              setPlaying(false);
              setMaxNodes(v);
              setProgress(1);
            }}
          />

          <ButtonRow>
            <Chip on={playing} onClick={() => {
              setProgress(0);
              setPlaying(true);
            }}>
              ▶ 播放生长
            </Chip>
            <Chip
              onClick={() => {
                setPlaying(false);
                setProgress(1);
              }}
            >
              显示全部
            </Chip>
            <Chip
              onClick={() => {
                setPlaying(false);
                setSeed((s) => s + 1);
                setProgress(1);
              }}
            >
              换一棵树
            </Chip>
          </ButtonRow>
          <ButtonRow>
            <Chip on={showTree} onClick={() => setShowTree(!showTree)}>
              {showTree ? '隐藏搜索树' : '显示搜索树'}
            </Chip>
            <Chip on={showPath} onClick={() => setShowPath(!showPath)}>
              {showPath ? '隐藏路径' : '显示路径'}
            </Chip>
          </ButtonRow>
        </>
      }
      prev={{ to: '/scene/ik.html', label: 'IK 反解' }}
      next={{ to: '/scene/dual.html', label: '双臂碰撞与互斥' }}
    >
      <Robot joints={NEUTRAL_JOINTS} selected={null} onSelect={() => {}} />
      <Obstacles obstacles={DEFAULT_OBSTACLES} />
      <TreeLines result={result} visibleEdges={visibleEdges} showTree={showTree} />
      <PathLine result={result} visibleEdges={visibleEdges} showPath={showPath} />
      <Marker p={START} color="#22d3ee" />
      <Marker p={GOAL} color="#d97706" />
    </SceneShell>
  );
}
