/**
 * 平面 RRT，用来把「采样式规划」讲清楚。
 *
 * 刻意做成二维（工作空间的 x-z 平面）：高维 C-space 里的树看不清，
 * 但它的行为——随机撒点、向随机点生长、碰到障碍就绕——在二维下原样成立。
 */

export type P2 = [number, number];

export interface RrtNode {
  p: P2;
  parent: number;
}

export interface RrtResult {
  nodes: RrtNode[];
  /** 每条边是 [fromIndex, toIndex] */
  edges: [number, number][];
  /** 到达目标后回溯出的路径（含起点终点） */
  path: P2[];
  /** 实际消耗的迭代数（可能提前收敛） */
  iterations: number;
}

export interface RectObstacle {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface RrtOptions {
  start: P2;
  goal: P2;
  obstacles: RectObstacle[];
  bounds: { x: [number, number]; z: [number, number] };
  step: number;
  maxNodes: number;
  /** 朝目标采样的概率，保证树往目标方向长 */
  goalBias?: number;
  seed?: number;
}

/** 可复现的伪随机数：同一个 seed 永远给出同一棵树 */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const dist = (a: P2, b: P2) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function collides(p: P2, obstacles: RectObstacle[], margin: number): boolean {
  return obstacles.some(
    (o) =>
      Math.abs(p[0] - o.x) < o.w / 2 + margin &&
      Math.abs(p[1] - o.z) < o.d / 2 + margin,
  );
}

/** 从 from 向 to 走最多 step 远 */
function steer(from: P2, to: P2, step: number): P2 {
  const d = dist(from, to);
  if (d <= step) return [to[0], to[1]];
  const t = step / d;
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
}

export function runRrt(opts: RrtOptions): RrtResult {
  const { start, goal, obstacles, bounds, step, maxNodes } = opts;
  const goalBias = opts.goalBias ?? 0.12;
  const rng = makeRng(opts.seed ?? 20261026);
  const margin = 0.075;

  const nodes: RrtNode[] = [{ p: start, parent: -1 }];
  const edges: [number, number][] = [];
  let path: P2[] = [];
  let iterations = 0;

  for (let i = 0; i < maxNodes; i++) {
    iterations = i + 1;

    const q: P2 =
      rng() < goalBias
        ? goal
        : [
            bounds.x[0] + rng() * (bounds.x[1] - bounds.x[0]),
            bounds.z[0] + rng() * (bounds.z[1] - bounds.z[0]),
          ];

    // 最近邻
    let nearest = 0;
    let bestD = Infinity;
    for (let k = 0; k < nodes.length; k++) {
      const d = dist(nodes[k].p, q);
      if (d < bestD) {
        bestD = d;
        nearest = k;
      }
    }

    const next = steer(nodes[nearest].p, q, step);
    if (collides(next, obstacles, margin)) continue;

    const parent = nearest;
    nodes.push({ p: next, parent });
    edges.push([parent, nodes.length - 1]);

    if (dist(next, goal) <= step && !collides(goal, obstacles, margin)) {
      nodes.push({ p: goal, parent: nodes.length - 1 });
      edges.push([nodes.length - 2, nodes.length - 1]);

      // 回溯
      let cur = nodes.length - 1;
      while (cur >= 0) {
        path.push(nodes[cur].p);
        cur = nodes[cur].parent;
      }
      path.reverse();
      break;
    }
  }

  return { nodes, edges, path, iterations };
}

/** 默认障碍布局：两个挡在必经之路上，一个偏置，制造绕行 */
export const DEFAULT_OBSTACLES: RectObstacle[] = [
  { x: -0.42, z: 0.28, w: 0.78, d: 0.62 },
  { x: 0.72, z: -0.36, w: 0.66, d: 0.72 },
  { x: 0.08, z: -1.18, w: 0.52, d: 0.4 },
];

export const DEFAULT_BOUNDS = {
  x: [-2.0, 2.0] as [number, number],
  z: [-1.7, 1.7] as [number, number],
};

export const START: P2 = [-1.62, 1.28];
export const GOAL: P2 = [1.52, -1.12];
