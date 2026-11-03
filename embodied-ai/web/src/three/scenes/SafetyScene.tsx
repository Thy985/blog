import { useState } from 'react';
import { Html } from '@react-three/drei';
import { Robot, NEUTRAL_JOINTS } from '../Robot';
import { SceneShell } from '../SceneShell';
import { Slider, Chip, ButtonRow } from '../Controls';
import { solveTwoLink, forward } from './ikSolver';
import styles from './SafetyScene.module.css';

type P3 = [number, number, number];

/** 人员通道：这是一片「默认拒绝」的区域 */
const WALL_X = -0.68; // 边界平面
const MARGIN = 0.06; // 越界余量

const REST: P3 = [0.42, 1.12, 0.32];
const FALLBACK: P3 = [0.42, 1.12, 0.32];

type Verdict = 'ok' | 'blocked' | 'fallback';

function judge(target: P3): Verdict {
  if (target[0] < WALL_X - MARGIN) return 'blocked';
  return 'ok';
}

export function SafetyScene() {
  const [target, setTarget] = useState<P3>([0.24, 0.82, 0.62]);
  const [showWall, setShowWall] = useState(true);
  const [fallback, setFallback] = useState(false);

  const verdict = fallback ? 'fallback' : judge(target);
  const blocked = verdict === 'blocked';

  // 拦截时把目标夹回边界上（不会真的越界）
  const eff: P3 = blocked ? [Math.max(target[0], WALL_X + MARGIN), target[1], target[2]] : target;

  const angles = solveTwoLink(eff, 'arm1').angles;
  const joints = { ...NEUTRAL_JOINTS, arm1: angles };
  const ee = forward('arm1', angles);

  return (
    <SceneShell
      no="06"
      title="安全拦截"
      source="07 篇 · 安全"
      summary="安全不是功能，是横切面：权力独立、默认拒绝、横切拦截。三条宪法决定了它长什么样。"
      bullets={[
        '权力独立：安全控制器不在被监管的控制器的指挥链上，谁也关不掉它。',
        '默认拒绝：没有显式允许就是禁止。fallback 的方向由语义决定，不是「随便退一点」。',
        '横切拦截：不改变业务路径，而是在路径上加一道闸门，任何越界请求都被拦下。',
        '任务链路：Coordinator → SafetySupervisor 审批 → MoveIt2 规划 → JTC 执行 → Gazebo。',
        'SafetySupervisor 挂了，安全靠独立于软件的硬件兜底；吞吐归零但不会出事故。',
      ]}
      hint="拖滑块把目标点推过边界看拦截 · 点「执行 fallback」看重回安全位"
      controls={
        <>
          <div className={styles.verdict} data-state={verdict}>
            {verdict === 'ok' && '✓ 允许执行：目标在允许区'}
            {verdict === 'blocked' && '✗ 拦截：目标进入默认拒绝区'}
            {verdict === 'fallback' && '→ fallback：退回安全位，任务标记为失败'}
          </div>

          <Slider
            label="目标 X（左右）"
            value={target[0]}
            min={-1.3}
            max={1.3}
            step={0.01}
            format={(v) => `${v.toFixed(2)} m`}
            onChange={(v) => {
              setFallback(false);
              setTarget([v, target[1], target[2]]);
            }}
          />
          <Slider
            label="目标 Y（高低）"
            value={target[1]}
            min={0.25}
            max={1.7}
            step={0.01}
            format={(v) => `${v.toFixed(2)} m`}
            onChange={(v) => {
              setFallback(false);
              setTarget([target[0], v, target[2]]);
            }}
          />
          <Slider
            label="目标 Z（前后）"
            value={target[2]}
            min={-1.0}
            max={1.2}
            step={0.01}
            format={(v) => `${v.toFixed(2)} m`}
            onChange={(v) => {
              setFallback(false);
              setTarget([target[0], target[1], v]);
            }}
          />

          <ButtonRow>
            <Chip
              on={blocked}
              onClick={() => {
                setFallback(false);
                setTarget([-1.05, 0.95, 0.4]);
              }}
            >
              试着越界
            </Chip>
            <Chip on={fallback} onClick={() => setFallback(!fallback)}>
              {fallback ? '恢复' : '执行 fallback'}
            </Chip>
            <Chip on={showWall} onClick={() => setShowWall(!showWall)}>
              {showWall ? '隐藏边界' : '显示边界'}
            </Chip>
          </ButtonRow>

          <ul className={styles.laws}>
            <li>
              <span>权力独立</span>
              <strong>安全控制器不在被监管的指挥链上</strong>
            </li>
            <li>
              <span>默认拒绝</span>
              <strong>没有显式允许即禁止</strong>
            </li>
            <li>
              <span>横切拦截</span>
              <strong>不改业务路径，只加闸门</strong>
            </li>
          </ul>
        </>
      }
      prev={{ to: '/scene/dual.html', label: '双臂碰撞与互斥' }}
      next={{ to: '/scene/anatomy.html', label: '回到身体拆解' }}
    >
      <Robot joints={joints} selected={null} onSelect={() => {}} />

      {/* 默认拒绝区：竖直的红墙 */}
      {showWall && (
        <group>
          <mesh position={[WALL_X - 0.28, 0.9, 0]}>
            <boxGeometry args={[0.56, 1.8, 2.2]} />
            <meshStandardMaterial
              color="#b42318"
              transparent
              opacity={blocked ? 0.3 : 0.15}
              emissive="#b42318"
              emissiveIntensity={blocked ? 0.7 : 0.25}
              depthWrite={false}
            />
          </mesh>
          <Html position={[WALL_X - 0.28, 1.95, 0]} center style={{ pointerEvents: 'none' }}>
            <div className={styles.wallTag} data-on={blocked}>
              默认拒绝区
            </div>
          </Html>
        </group>
      )}

      {/* 末端执行器与目标点 */}
      <mesh position={ee}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color={blocked ? '#ff5a48' : '#22d3ee'} />
      </mesh>
      <mesh position={eff}>
        <sphereGeometry args={[0.06, 18, 18]} />
        <meshBasicMaterial color={blocked ? '#ff5a48' : '#d97706'} />
      </mesh>
      <Html position={[eff[0], eff[1] + 0.16, eff[2]]} center style={{ pointerEvents: 'none' }}>
        <div className={styles.targetTag}>{blocked ? '已拦截' : '目标点'}</div>
      </Html>
    </SceneShell>
  );
}
