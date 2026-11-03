import { useState } from 'react';
import { Html } from '@react-three/drei';
import { Robot } from '../Robot';
import { SceneShell } from '../SceneShell';
import { Slider, Chip, ButtonRow } from '../Controls';
import styles from './TfScene.module.css';

/** 三轴箭头 + 标签 */
function Frame({
  id,
  position,
  dim,
  showLabel,
}: {
  id: string;
  position: [number, number, number];
  dim: boolean;
  showLabel: boolean;
}) {
  const axes: { dir: [number, number, number]; rot: [number, number, number]; color: string; label: string }[] = [
    { dir: [1, 0, 0], rot: [0, 0, -Math.PI / 2], color: '#f0563c', label: 'x' },
    { dir: [0, 1, 0], rot: [0, 0, 0], color: '#54d07a', label: 'y' },
    { dir: [0, 0, 1], rot: [Math.PI / 2, 0, 0], color: '#4a90e2', label: 'z' },
  ];
  const opacity = dim ? 0.22 : 1;

  return (
    <group position={position}>
      {axes.map((a) => (
        <group key={a.label}>
          <mesh
            position={[a.dir[0] * 0.13, a.dir[1] * 0.13, a.dir[2] * 0.13]}
            rotation={a.rot}
          >
            <cylinderGeometry args={[0.0055, 0.0055, 0.23, 8]} />
            <meshBasicMaterial color={a.color} transparent opacity={opacity} />
          </mesh>
          <mesh
            position={[a.dir[0] * 0.255, a.dir[1] * 0.255, a.dir[2] * 0.255]}
            rotation={a.rot}
          >
            <coneGeometry args={[0.018, 0.055, 10]} />
            <meshBasicMaterial color={a.color} transparent opacity={opacity} />
          </mesh>
        </group>
      ))}
      {showLabel && (
        <Html position={[0, 0.33, 0]} center distanceFactor={7} style={{ pointerEvents: 'none' }}>
          <div className={dim ? styles.frameTagDim : styles.frameTag}>{id}</div>
        </Html>
      )}
    </group>
  );
}

/** 坐标系层级，与 Robot 的关节链同构，保证位置一致 */
function Frames({
  torsoYaw,
  headPitch,
  showLabels,
  highlightChain,
}: {
  torsoYaw: number;
  headPitch: number;
  showLabels: boolean;
  highlightChain: string | null;
}) {
  const on = (id: string) => !highlightChain || highlightChain === id;

  return (
    <group>
      <Frame id="world" position={[0, 0, 0]} dim={!on('world')} showLabel={showLabels} />
      <Frame id="base_link" position={[0, 0.02, 0]} dim={!on('base_link')} showLabel={showLabels} />

      <group rotation={[0, torsoYaw, 0]}>
        <Frame id="torso_link" position={[0, 0.34, 0]} dim={!on('torso_link')} showLabel={showLabels} />

        <group position={[0, 0.62, 0]} rotation={[0, 0, headPitch]}>
          <Frame id="head_link" position={[0, 0.13, 0]} dim={!on('head_link')} showLabel={showLabels} />
          <Frame id="head_camera" position={[0, 0.145, 0.145]} dim={!on('head_camera')} showLabel={showLabels} />
        </group>

        <Frame id="arm1_base" position={[0.44, 0.62, 0]} dim={!on('arm1_base')} showLabel={showLabels} />
        <Frame id="arm2_base" position={[-0.44, 0.62, 0]} dim={!on('arm2_base')} showLabel={showLabels} />
      </group>
    </group>
  );
}

const CHAIN: { id: string; label: string; desc: string }[] = [
  { id: 'world', label: 'world', desc: 'Gazebo 物理世界的唯一全局原点。所有 TF 树最终都嫁接在这里。' },
  { id: 'base_link', label: 'base_link', desc: '机器人本体的根坐标系，位于两臂中点的地面投影。' },
  { id: 'torso_link', label: 'torso_link', desc: '躯干坐标系。IMU 装在这里而不是头部——姿态估计不能被颈部俯仰污染。' },
  { id: 'head_link', label: 'head_link', desc: '头部坐标系，随 neck_pitch_joint 俯仰。' },
  { id: 'head_camera', label: 'head_camera', desc: '相机光学坐标系。感知的检测框在这个系下产生，再换算到臂的基座系。' },
  { id: 'arm1_base', label: 'arm1_base', desc: '左臂基座系。TF 前缀 left_arm_ 把同一份 URDF 宏实例化两次后区分开。' },
  { id: 'arm2_base', label: 'arm2_base', desc: '右臂基座系，前缀 right_arm_。' },
];

export function TfScene() {
  const [torsoYaw, setTorsoYaw] = useState(0);
  const [headPitch, setHeadPitch] = useState(-0.15);
  const [showLabels, setShowLabels] = useState(true);
  const [chain, setChain] = useState<string | null>(null);

  const active = CHAIN.find((c) => c.id === chain) ?? null;

  return (
    <SceneShell
      no="02"
      title="坐标系与 TF"
      source="02 篇 · 机器人的空间感"
      summary="位姿是相对的，位置是查出来的。机器人没有「绝对在哪」，只有「相对某个坐标系在哪」——TF 树就是这张关系网。"
      bullets={[
        '位姿永远是「相对谁」的。换一个参考系，同一个点的坐标就换一套数。',
        '双臂共享一个 Gazebo 世界，但各有各的 TF 前缀（left_arm_ / right_arm_），两棵树嫁接在 world 下。',
        '感知的检测框在相机系产生，必须换算到臂的基座系才能规划——这是 ObjectTracker 每天都要做的查询。',
        'M7.1 把 TF 前缀从 arm1_/arm2_ 改成 left_arm_/right_arm_，靠 robot.yaml 一处配置完成迁移。',
        '「谁的坐标系」在多机器人系统里是严肃问题：混用一个前缀，两台臂的同名关节会互相覆盖。',
      ]}
      hint="拖动滑块转动躯干与头，观察 head_camera 坐标系怎么跟着走 · 点右侧链条高亮单条 TF 链"
      controls={
        <>
          <Slider
            label="躯干 yaw"
            value={torsoYaw}
            min={-Math.PI}
            max={Math.PI}
            step={0.01}
            format={(v) => `${Math.round((v * 180) / Math.PI)}°`}
            onChange={setTorsoYaw}
          />
          <Slider
            label="颈部 pitch"
            value={headPitch}
            min={-Math.PI / 2}
            max={Math.PI / 2}
            step={0.01}
            format={(v) => `${Math.round((v * 180) / Math.PI)}°`}
            onChange={setHeadPitch}
          />
          <ButtonRow>
            <Chip on={showLabels} onClick={() => setShowLabels(!showLabels)}>
              {showLabels ? '隐藏标签' : '显示标签'}
            </Chip>
            {chain && <Chip onClick={() => setChain(null)}>清除高亮</Chip>}
          </ButtonRow>
          <ul className={styles.chainList}>
            {CHAIN.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={chain === c.id ? styles.chainBtnOn : styles.chainBtn}
                  onClick={() => setChain(chain === c.id ? null : c.id)}
                >
                  {c.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      }
      prev={{ to: '/scene/anatomy.html', label: '身体拆解' }}
      next={{ to: '/scene/ik.html', label: 'IK 反解' }}
      overlay={
        active && (
          <div className={styles.note}>
            <div className={styles.noteHead}>{active.label}</div>
            <p className={styles.noteText}>{active.desc}</p>
          </div>
        )
      }
    >
      <Robot
        joints={{ torsoYaw, headPitch, arm1: [0.4, -1.05, 1.55, -1.35, 0.4, 0.25], arm2: [-0.4, -1.05, 1.55, -1.35, -0.4, -0.25] }}
        selected={null}
        onSelect={() => {}}
      />
      <Frames
        torsoYaw={torsoYaw}
        headPitch={headPitch}
        showLabels={showLabels}
        highlightChain={chain}
      />
    </SceneShell>
  );
}
