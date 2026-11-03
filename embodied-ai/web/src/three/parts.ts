/**
 * 机器人零件元数据。
 *
 * 6 个 3D 场景共用同一套零件 id：高亮、爆炸拆解、点击说明都按 id 走。
 * 命名对齐原文（01 篇 robot.yaml）：left_arm / right_arm / torso / head。
 */

export type PartKind = 'structure' | 'joint' | 'sensor' | 'gripper' | 'tool';

export interface PartDef {
  /** 零件 id，与 Robot.tsx 里的 <Part> 一一对应 */
  id: string;
  /** 中文名，说明面板标题 */
  label: string;
  /** 归属组，决定爆炸拆解时的移动方向 */
  group: 'base' | 'torso' | 'head' | 'arm1' | 'arm2';
  kind: PartKind;
  /** 一句话说明，点击零件时显示 */
  note: string;
  /** 该零件对应的自由度（无自由度则为空） */
  dof?: string;
}

export const PARTS: PartDef[] = [
  {
    id: 'base_link',
    label: '底座',
    group: 'base',
    kind: 'structure',
    note: '整台机器人的根坐标系。原点在两臂中点地面投影，TF 树从这里长出两棵臂链。',
    dof: '—',
  },
  {
    id: 'torso_yaw',
    label: '躯干（yaw）',
    group: 'torso',
    kind: 'joint',
    note: 'torso_yaw_joint，绕 z 轴旋转 ±180°。M7.1 身体升级时加装，让上半身能转向工作台侧边。',
    dof: '1 DoF（z 轴）',
  },
  {
    id: 'neck_pitch',
    label: '颈部（pitch）',
    group: 'head',
    kind: 'joint',
    note: 'neck_pitch_joint，绕 y 轴俯仰 ±90°。独立控制器，刻意不与躯干合并。',
    dof: '1 DoF（y 轴）',
  },
  {
    id: 'head_camera',
    label: '头部相机',
    group: 'head',
    kind: 'sensor',
    note: 'RGB-D 相机。装在 head_link 而非 torso_link——头部随颈部俯仰会污染姿态估计，IMU 则装在 torso_link。',
    dof: '—',
  },
  {
    id: 'torso_imu',
    label: '躯干 IMU',
    group: 'torso',
    kind: 'sensor',
    note: '惯性测量单元。与头部相机分离布置，是 01 篇强调的传感器布局决定感知算法设计空间的例子。',
    dof: '—',
  },

  // ---- 左臂（arm1 / left_arm）----
  { id: 'arm1_shoulder', label: '左肩', group: 'arm1', kind: 'joint', note: 'shoulder_pan_joint，绕 z 轴。UR5e 六轴的第一轴。', dof: '1 DoF（z 轴）' },
  { id: 'arm1_upper', label: '左大臂', group: 'arm1', kind: 'structure', note: 'shoulder_lift_joint 驱动的连杆，长 0.425 m。', dof: '1 DoF（y 轴）' },
  { id: 'arm1_elbow', label: '左肘', group: 'arm1', kind: 'joint', note: 'elbow_joint。肘角是 IK 解空间里最敏感的一维，也是自碰撞最容易发生的位置。', dof: '1 DoF（y 轴）' },
  { id: 'arm1_fore', label: '左小臂', group: 'arm1', kind: 'structure', note: '长 0.392 m，末端三个腕关节堆在它头上。', dof: '1 DoF（y 轴）' },
  { id: 'arm1_wrist', label: '左腕', group: 'arm1', kind: 'joint', note: 'wrist_1/2/3 三个关节紧挨在一起，是 IK 多解的主要来源。', dof: '3 DoF' },
  { id: 'arm1_gripper', label: '左夹爪', group: 'arm1', kind: 'gripper', note: 'Robotiq 二指夹爪。项目里用模拟 attach/detach 代替真实接触物理（见 10 篇边界）。', dof: '1 DoF（开合）' },

  // ---- 右臂（arm2 / right_arm）----
  { id: 'arm2_shoulder', label: '右肩', group: 'arm2', kind: 'joint', note: 'shoulder_pan_joint。与左肩同构，TF 前缀区分（left_arm_ / right_arm_）。', dof: '1 DoF（z 轴）' },
  { id: 'arm2_upper', label: '右大臂', group: 'arm2', kind: 'structure', note: '与左大臂同构。两臂共用同一个 ur5e_macro.xacro，实例化两次。', dof: '1 DoF（y 轴）' },
  { id: 'arm2_elbow', label: '右肘', group: 'arm2', kind: 'joint', note: '双臂联合规划时（dual_arm 组，12 关节），两肘的相对位置直接决定是否互撞。', dof: '1 DoF（y 轴）' },
  { id: 'arm2_fore', label: '右小臂', group: 'arm2', kind: 'structure', note: '长 0.392 m。', dof: '1 DoF（y 轴）' },
  { id: 'arm2_wrist', label: '右腕', group: 'arm2', kind: 'joint', note: '三轴腕。12 关节联合 IK 面对的是 12 维解空间（03 篇）。', dof: '3 DoF' },
  { id: 'arm2_gripper', label: '右夹爪', group: 'arm2', kind: 'gripper', note: '与左夹爪同构。', dof: '1 DoF（开合）' },
];

export const PART_BY_ID = new Map(PARTS.map((p) => [p.id, p]));

/** 零件归属的爆炸方向（单位向量），explode 时沿此方向外推 */
export const EXPLODE_DIR: Record<PartDef['group'], [number, number, number]> = {
  base: [0, -1, 0],
  torso: [0, 0, -1.2],
  head: [0, 1.1, -0.4],
  arm1: [-1.15, 0.35, 0.2],
  arm2: [1.15, 0.35, 0.2],
};
