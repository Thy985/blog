/**
 * 二连杆解析 IK。
 *
 * Robot.tsx 里 shoulder_lift / elbow 走 rotation.z，臂沿 +y 伸展，
 * 因此单臂末端只由三个关节决定：pan（绕竖直）+ lift + elbow（x-y 平面内）。
 * 这正是经典二连杆——所以 IK 有闭式解，可以做到实时反解、实时判无解。
 */

/** 大臂长（肩关节轴心 → 肘关节轴心） */
export const L1 = 0.42;
/** 小臂 + 腕 + 夹爪中心（肘关节轴心 → 末端执行器中心） */
export const L2 = 0.38 + 0.13 + 0.055;

/** 肩关节轴心在世界坐标系下的位置（按 side 区分） */
export function shoulderOrigin(side: 'arm1' | 'arm2'): [number, number, number] {
  const x = side === 'arm1' ? 0.44 : -0.44;
  return [x, 0.72, 0];
}

export type IkStatus = 'ok' | 'too_far' | 'too_near';

export interface IkResult {
  status: IkStatus;
  /** pan / lift / elbow 三个关节角，后三个腕关节保持 0 */
  angles: [number, number, number, number, number, number];
  /** 末端到目标的距离，用于显示误差 */
  error: number;
}

const clamp = (v: number, lo = -1, hi = 1) => Math.min(hi, Math.max(lo, v));

/**
 * 求解到目标点的关节角。
 * @param target 目标点的世界坐标
 * @param side   哪条臂
 * @param elbowUp 肘上解 / 肘下解（两解都合法，取哪一个是构型选择）
 */
export function solveTwoLink(
  target: [number, number, number],
  side: 'arm1' | 'arm2',
  elbowUp = true,
): IkResult {
  const [ox, oy, oz] = shoulderOrigin(side);
  const dx = target[0] - ox;
  const dy = target[1] - oy;
  const dz = target[2] - oz;

  // pan 让局部 +x 转到目标的水平投影方向（rotation.y = -atan2(z, x)）
  const pan = -Math.atan2(dz, dx);

  // 在 pan 旋转后的竖直平面内做二连杆
  const d = Math.hypot(dx, dz);
  const h = dy;
  const r = Math.hypot(d, h);

  if (r > L1 + L2 - 1e-4) {
    return {
      status: 'too_far',
      angles: [pan, Math.atan2(d, h), 0, 0, 0, 0],
      error: r - (L1 + L2),
    };
  }
  if (r < Math.abs(L1 - L2) + 1e-4) {
    return {
      status: 'too_near',
      angles: [pan, Math.atan2(d, h), 0, 0, 0, 0],
      error: Math.abs(L1 - L2) - r,
    };
  }

  // 肘关节角：θ2 = 0 时臂完全伸直
  const cosT2 = clamp((r * r - L1 * L1 - L2 * L2) / (2 * L1 * L2));
  const t2 = Math.acos(cosT2) * (elbowUp ? -1 : 1);

  // 肩关节角：从 +y 轴起算，向 +x 为正。
  // 注意 t1 必须和 t2 取同一组符号：t2 = -acos 时 t1 = phi + alpha，
  // t2 = +acos 时 t1 = phi - alpha。两两配对才是三角形的两个解，
  // 反着配会得到一个半径对了、方向却拧了 180° 的假解。
  const phi = Math.atan2(d, h);
  const alpha = Math.acos(clamp((L1 * L1 + r * r - L2 * L2) / (2 * L1 * r)));
  const t1 = phi + alpha * (elbowUp ? 1 : -1);

  return {
    status: 'ok',
    angles: [pan, t1, t2, 0, 0, 0],
    error: 0,
  };
}

/** 正运动学：关节角 → 末端世界坐标。与 solveTwoLink 互为逆，用于算两臂末端距离 */
export function forward(
  side: 'arm1' | 'arm2',
  angles: [number, number, number, number, number, number],
): [number, number, number] {
  const [ox, oy, oz] = shoulderOrigin(side);
  const [pan, t1, t2] = angles;
  const d = L1 * Math.sin(t1) + L2 * Math.sin(t1 + t2);
  const h = L1 * Math.cos(t1) + L2 * Math.cos(t1 + t2);
  // rotation.y = pan 把局部 +x 转到 (cos pan, 0, -sin pan)
  return [ox + d * Math.cos(pan), oy + h, oz - d * Math.sin(pan)];
}

/** 两臂末端距离（米） */
export function eeDistance(
  a: [number, number, number, number, number, number],
  b: [number, number, number, number, number, number],
): number {
  const p = forward('arm1', a);
  const q = forward('arm2', b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}
