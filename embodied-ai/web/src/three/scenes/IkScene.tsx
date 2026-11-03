import { useState } from 'react';
import { Html } from '@react-three/drei';
import { Robot, NEUTRAL_JOINTS } from '../Robot';
import { SceneShell } from '../SceneShell';
import { Slider, Chip, ButtonRow } from '../Controls';
import { solveTwoLink, shoulderOrigin, L1, L2 } from './ikSolver';
import styles from './IkScene.module.css';

type Side = 'arm1' | 'arm2';

const PRESETS: { label: string; pos: [number, number, number]; side: Side }[] = [
  { label: '工作台正前', pos: [0, 0.82, 0.62], side: 'arm1' },
  { label: '左侧料框', pos: [-0.62, 0.72, 0.34], side: 'arm2' },
  { label: '头顶够不着', pos: [0.9, 1.85, 0.2], side: 'arm1' },
  { label: '贴着身体', pos: [0.24, 0.78, 0.06], side: 'arm1' },
];

export function IkScene() {
  const [target, setTarget] = useState<[number, number, number]>([0, 0.82, 0.62]);
  const [side, setSide] = useState<Side>('arm1');
  const [elbowUp, setElbowUp] = useState(true);

  const result = solveTwoLink(target, side, elbowUp);

  const joints = {
    ...NEUTRAL_JOINTS,
    [side]: result.angles,
  };

  const [ox, oy, oz] = shoulderOrigin(side);
  const reach = L1 + L2;

  return (
    <SceneShell
      no="03"
      title="IK 反解"
      source="03 篇 · 运动学"
      summary="给定末端姿势求关节角——IK 不保证有解，也不保证唯一。这两条数学事实，最后都变成了系统行为。"
      bullets={[
        '目标在臂的可达空间外 → 无解。项目不报错退出，而是「放宽约束重规划」（04 篇的失败恢复链）。',
        '同一目标通常有两个肘构型（肘上/肘下）——IK 的多解性来自关节链的几何对称。',
        'M1–M3 的 IK 是 mock 的（查表），M4 才换成真 MoveIt2 + KDL。前三个月先验证的是「周围的组织能否接住一个会动的臂」。',
        '双臂组（dual_arm，12 关节）面对的是 12 维解空间，一次规划出 13 个轨迹点。',
        '角度用度数读、算术用弧度算——单位混用是 IK 调试的头号坑。',
      ]}
      hint="拖滑块移动目标点 · 切换左/右臂 · 切换肘上/肘下构型 · 点预设看典型工况"
      controls={
        <>
          <div className={styles.reach}>
            <span>可达半径</span>
            <strong>
              {reach.toFixed(2)} m（L1 {L1.toFixed(2)} + L2 {L2.toFixed(2)}）
            </strong>
          </div>
          <Slider
            label="目标 X"
            value={target[0]}
            min={-1.3}
            max={1.3}
            step={0.01}
            format={(v) => `${v.toFixed(2)} m`}
            onChange={(v) => setTarget([v, target[1], target[2]])}
          />
          <Slider
            label="目标 Y"
            value={target[1]}
            min={0.1}
            max={1.9}
            step={0.01}
            format={(v) => `${v.toFixed(2)} m`}
            onChange={(v) => setTarget([target[0], v, target[2]])}
          />
          <Slider
            label="目标 Z"
            value={target[2]}
            min={-1.1}
            max={1.3}
            step={0.01}
            format={(v) => `${v.toFixed(2)} m`}
            onChange={(v) => setTarget([target[0], target[1], v])}
          />

          <ButtonRow>
            <Chip on={side === 'arm1'} onClick={() => setSide('arm1')}>
              左臂 arm1
            </Chip>
            <Chip on={side === 'arm2'} onClick={() => setSide('arm2')}>
              右臂 arm2
            </Chip>
          </ButtonRow>
          <ButtonRow>
            <Chip on={elbowUp} onClick={() => setElbowUp(true)}>
              肘上构型
            </Chip>
            <Chip on={!elbowUp} onClick={() => setElbowUp(false)}>
              肘下构型
            </Chip>
          </ButtonRow>
          <ButtonRow>
            {PRESETS.map((p) => (
              <Chip
                key={p.label}
                onClick={() => {
                  setTarget(p.pos);
                  setSide(p.side);
                }}
              >
                {p.label}
              </Chip>
            ))}
          </ButtonRow>

          <div className={styles.status} data-status={result.status}>
            {result.status === 'ok' && '✓ 有解'}
            {result.status === 'too_far' && `✗ 够不着（超出 ${result.error.toFixed(2)} m）`}
            {result.status === 'too_near' && `✗ 离肩太近（差 ${result.error.toFixed(2)} m）`}
          </div>

          <ul className={styles.joints}>
            {(['shoulder_pan', 'shoulder_lift', 'elbow', 'wrist_1', 'wrist_2', 'wrist_3'] as const).map(
              (name, i) => (
                <li key={name}>
                  <span>{name}</span>
                  <strong>{((result.angles[i] * 180) / Math.PI).toFixed(1)}°</strong>
                </li>
              ),
            )}
          </ul>
        </>
      }
      prev={{ to: '/scene/tf.html', label: '坐标系与 TF' }}
      next={{ to: '/scene/planning.html', label: '规划与避撞' }}
    >
      <Robot joints={joints} selected={null} onSelect={() => {}} />

      {/* 目标点 + 肩到目标的连线 */}
      <group>
        <mesh position={target}>
          <sphereGeometry args={[0.05, 20, 20]} />
          <meshBasicMaterial color={result.status === 'ok' ? '#d97706' : '#b42318'} />
        </mesh>
        <mesh position={target}>
          <sphereGeometry args={[0.085, 16, 16]} />
          <meshBasicMaterial color={result.status === 'ok' ? '#d97706' : '#b42318'} transparent opacity={0.18} />
        </mesh>
        <Html position={[target[0], target[1] + 0.14, target[2]]} center style={{ pointerEvents: 'none' }}>
          <div className={styles.targetTag}>目标点</div>
        </Html>
      </group>

      {/* 肩部原点标记 */}
      <mesh position={[ox, oy, oz]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshBasicMaterial color="#22d3ee" />
      </mesh>
    </SceneShell>
  );
}
