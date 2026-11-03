import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { PARTS, EXPLODE_DIR, type PartDef } from './parts';

/** 关节角。单位弧度。three.js 里 y 轴向上，所以"绕竖直轴"= rotation.y */
export interface JointAngles {
  torsoYaw: number;
  headPitch: number;
  arm1: [number, number, number, number, number, number];
  arm2: [number, number, number, number, number, number];
}

export const NEUTRAL_JOINTS: JointAngles = {
  torsoYaw: 0,
  headPitch: -0.15,
  // 自然下垂的待机姿态：大臂略向外、小臂近乎垂直落下。
  // 角度按 ikSolver 的约定取值（θ 自 +y 起、朝 +x 为正），
  // 真正上到 three.js 的 rotation.z 时取负，见下方 Arm。
  arm1: [0, 2.86, 0.45, 0, 0, 0],
  arm2: [0, -2.86, -0.45, 0, 0, 0],
};

/** 尺寸（米）。粗略取 UR5e + 双臂平台比例，只为视觉清晰，不追求数值精度 */
const L = {
  shoulderY: 0.62,
  shoulderX: 0.44,
  upper: 0.42,
  fore: 0.38,
  wrist: 0.13,
};

const COLORS = {
  structure: '#b9c5c2',
  structureDark: '#8fa19d',
  joint: '#0f766e',
  sensor: '#d97706',
  gripper: '#3f4a4f',
  highlight: '#22d3ee',
};

const KIND_COLOR: Record<PartDef['kind'], string> = {
  structure: COLORS.structure,
  joint: COLORS.joint,
  sensor: COLORS.sensor,
  gripper: COLORS.gripper,
  tool: COLORS.sensor,
};

interface PartProps {
  id: string;
  explode: number;
  selected: string | null;
  onSelect: (id: string | null) => void;
  children: React.ReactNode;
}

/** 单个零件：负责高亮、点击、爆炸位移 */
function Part({ id, explode, selected, onSelect, children }: PartProps) {
  const def = useMemo(() => PARTS.find((p) => p.id === id)!, [id]);
  const [hovered, setHovered] = useState(false);
  const isActive = selected === id || hovered;
  const dir = EXPLODE_DIR[def.group];
  const k = explode * 0.34;

  return (
    <group
      position={[dir[0] * k, dir[1] * k, dir[2] * k]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(selected === id ? null : id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {children}
      {isActive && (
        <mesh>
          <sphereGeometry args={[0.026, 12, 12]} />
          <meshBasicMaterial color={COLORS.highlight} />
        </mesh>
      )}
    </group>
  );
}

/** 零件着色：按 kind 取基色，选中时提亮 */
function paint(kind: PartDef['kind'], active: boolean) {
  return (
    <meshStandardMaterial
      color={active ? COLORS.highlight : KIND_COLOR[kind]}
      emissive={active ? COLORS.highlight : '#000000'}
      emissiveIntensity={active ? 0.55 : 0}
      metalness={0.35}
      roughness={0.5}
    />
  );
}

function useActive(id: string, selected: string | null) {
  return selected === id;
}

/** 一根连杆：从原点沿 +y 伸 len 长 */
function Link({
  id, len, radius = 0.055, explode, selected, onSelect,
}: { id: string; len: number; radius?: number } & Omit<PartProps, 'children'>) {
  const def = PARTS.find((p) => p.id === id)!;
  const active = useActive(id, selected);
  return (
    <Part id={id} explode={explode} selected={selected} onSelect={onSelect}>
      <mesh position={[0, len / 2, 0]}>
        <cylinderGeometry args={[radius, radius * 1.12, len, 16]} />
        {paint(def.kind, active)}
      </mesh>
    </Part>
  );
}

function JointBall({
  id, radius = 0.085, explode, selected, onSelect,
}: { id: string; radius?: number } & Omit<PartProps, 'children'>) {
  const def = PARTS.find((p) => p.id === id)!;
  const active = useActive(id, selected);
  return (
    <Part id={id} explode={explode} selected={selected} onSelect={onSelect}>
      <mesh>
        <sphereGeometry args={[radius, 18, 18]} />
        {paint(def.kind, active)}
      </mesh>
    </Part>
  );
}

function SensorBox({
  id, size, position, explode, selected, onSelect,
}: { id: string; size: [number, number, number]; position: [number, number, number] } & Omit<PartProps, 'children'>) {
  const def = PARTS.find((p) => p.id === id)!;
  const active = useActive(id, selected);
  return (
    <Part id={id} explode={explode} selected={selected} onSelect={onSelect}>
      <mesh position={position}>
        <boxGeometry args={size} />
        {paint(def.kind, active)}
      </mesh>
    </Part>
  );
}

/** 一条 UR5e 臂。six 关节角按 shoulder_pan → wrist_3 排列 */
function Arm({
  side, angles, explode, selected, onSelect,
}: {
  side: 'arm1' | 'arm2';
  angles: [number, number, number, number, number, number];
} & Omit<PartProps, 'children' | 'id'>) {
  const mirror = side === 'arm1' ? 1 : -1;
  const p = (n: string) => `${side}_${n}`;

  return (
    <group position={[L.shoulderX * mirror, L.shoulderY, 0]}>
      {/* shoulder_pan：绕竖直轴 */}
      <group rotation={[0, angles[0], 0]}>
        <JointBall id={p('shoulder')} explode={explode} selected={selected} onSelect={onSelect} />

        {/* shoulder_lift：绕 z 轴（x-y 平面内摆动），与 elbow 构成二连杆。
            注意取负：ikSolver 把 θ 定义为「自 +y 起、朝 +x 为正」，
            而 three.js 的 rotation.z 是右手系、把 +y 转向 -x，
            所以这里要反着拧，末端才落在 forward() 算出的那个点上。 */}
        <group position={[0, 0.1, 0]} rotation={[0, 0, -angles[1]]}>
          <Link id={p('upper')} len={L.upper} explode={explode} selected={selected} onSelect={onSelect} />

          {/* elbow */}
          <group position={[0, L.upper, 0]} rotation={[0, 0, -angles[2]]}>
            <JointBall id={p('elbow')} explode={explode} selected={selected} onSelect={onSelect} />
            <Link id={p('fore')} len={L.fore} radius={0.048} explode={explode} selected={selected} onSelect={onSelect} />

            {/* wrist_1 / wrist_2 / wrist_3 */}
            <group position={[0, L.fore, 0]} rotation={[0, 0, -angles[3]]}>
              <JointBall id={p('wrist')} radius={0.07} explode={explode} selected={selected} onSelect={onSelect} />

              <group position={[0, L.wrist, 0]} rotation={[0, angles[5], 0]}>
                <Part id={p('gripper')} explode={explode} selected={selected} onSelect={onSelect}>
                  <mesh position={[0, 0.055, 0]}>
                    <boxGeometry args={[0.11, 0.11, 0.09]} />
                    {paint('gripper', selected === p('gripper'))}
                  </mesh>
                  {/* 两指 */}
                  <mesh position={[0, 0.13, 0.045]}>
                    <boxGeometry args={[0.018, 0.07, 0.018]} />
                    {paint('gripper', selected === p('gripper'))}
                  </mesh>
                  <mesh position={[0, 0.13, -0.045]}>
                    <boxGeometry args={[0.018, 0.07, 0.018]} />
                    {paint('gripper', selected === p('gripper'))}
                  </mesh>
                </Part>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

interface RobotProps {
  joints?: JointAngles;
  /** 爆炸系数 0–1 */
  explode?: number;
  /** 选中的零件 id */
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  /** 慢速自转，用于首页展示 */
  autoRotate?: boolean;
}

export function Robot({
  joints = NEUTRAL_JOINTS,
  explode = 0,
  selected = null,
  onSelect = () => {},
  autoRotate = false,
}: RobotProps) {
  const root = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (autoRotate && root.current) root.current.rotation.y += dt * 0.14;
  });

  return (
    <group ref={root}>
      {/* ---------- 底座 ---------- */}
      <Part id="base_link" explode={explode} selected={selected} onSelect={onSelect}>
        <mesh position={[0, 0.055, 0]}>
          <cylinderGeometry args={[0.42, 0.5, 0.11, 32]} />
          {paint('structure', selected === 'base_link')}
        </mesh>
      </Part>

      {/* ---------- 躯干（含 yaw）---------- */}
      <Part id="torso_yaw" explode={explode} selected={selected} onSelect={onSelect}>
        <group rotation={[0, joints.torsoYaw, 0]}>
          <mesh position={[0, 0.34, 0]}>
            <cylinderGeometry args={[0.17, 0.21, 0.44, 24]} />
            {paint('structure', selected === 'torso_yaw')}
          </mesh>

          {/* 肩部横梁：把两个肩关节串回躯干。
              没有它，肩关节悬在 x=±0.44 的空气里，看着像脱臼。 */}
          <mesh position={[0, 0.585, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.082, 0.082, 0.96, 20]} />
            {paint('structure', false)}
          </mesh>

          {/* 脖颈短柱：接上躯干顶面与头部球体之间的缝 */}
          <mesh position={[0, 0.585, 0]}>
            <cylinderGeometry args={[0.062, 0.075, 0.13, 18]} />
            {paint('structure', false)}
          </mesh>

          <SensorBox
            id="torso_imu"
            size={[0.1, 0.06, 0.1]}
            position={[0, 0.52, -0.16]}
            explode={explode}
            selected={selected}
            onSelect={onSelect}
          />

          {/* ---------- 头（含 neck pitch）---------- */}
          <Part id="neck_pitch" explode={explode} selected={selected} onSelect={onSelect}>
            <group position={[0, 0.62, 0]} rotation={[0, 0, joints.headPitch]}>
              <mesh position={[0, 0.13, 0]}>
                <sphereGeometry args={[0.135, 22, 22]} />
                {paint('structure', selected === 'neck_pitch')}
              </mesh>
              <SensorBox
                id="head_camera"
                size={[0.09, 0.055, 0.05]}
                position={[0, 0.145, 0.135]}
                explode={explode}
                selected={selected}
                onSelect={onSelect}
              />
            </group>
          </Part>

          {/* ---------- 双臂 ---------- */}
          <Arm side="arm1" angles={joints.arm1} explode={explode} selected={selected} onSelect={onSelect} />
          <Arm side="arm2" angles={joints.arm2} explode={explode} selected={selected} onSelect={onSelect} />
        </group>
      </Part>
    </group>
  );
}
