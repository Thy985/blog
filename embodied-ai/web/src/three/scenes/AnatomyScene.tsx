import { useState } from 'react';
import { Robot, NEUTRAL_JOINTS } from '../Robot';
import { PARTS, PART_BY_ID, type PartDef } from '../parts';
import { SceneShell } from '../SceneShell';
import { Slider, Chip, ButtonRow } from '../Controls';
import styles from './AnatomyScene.module.css';

const GROUPS: { id: PartDef['group']; label: string }[] = [
  { id: 'base', label: '底座' },
  { id: 'torso', label: '躯干' },
  { id: 'head', label: '头部' },
  { id: 'arm1', label: '左臂' },
  { id: 'arm2', label: '右臂' },
];

export function AnatomyScene() {
  const [explode, setExplode] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [group, setGroup] = useState<PartDef['group'] | null>(null);

  const selectedPart = selected ? PART_BY_ID.get(selected) : null;

  // 选中组时，把组里第一个零件当代表
  const effectiveSelected = selected ?? (group ? PARTS.find((p) => p.group === group)!.id : null);

  return (
    <SceneShell
      no="01"
      title="身体拆解"
      source="01 篇 · 机器人的身体"
      summary="机器人的身体是一份约束清单：自由度决定它能做什么，传感器布局决定感知算法的设计空间，而能力声明必须包含「不能做什么」。"
      bullets={[
        '整机 16 个关节：12 臂 + 2 夹爪 + 1 躯干 + 1 头，7 个活跃控制器。',
        '双臂共用同一个 ur5e_macro.xacro，实例化两次，靠 TF 前缀（left_arm_ / right_arm_）区分。',
        'IMU 装在 torso_link 而非 head_link——头部随颈部俯仰会污染姿态估计。',
        'SRDF 里刻意没有「全身规划组」，全身协调是留白而非遗留。',
        'capability.yaml 把「不能做什么」写成一等公民：force_control: available: false。',
      ]}
      hint="拖动旋转视角 · 点击零件查看说明 · 拖滑块做爆炸拆解"
      controls={
        <>
          <Slider
            label="爆炸拆解"
            value={explode}
            min={0}
            max={1}
            step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={setExplode}
          />
          <ButtonRow>
            {GROUPS.map((g) => (
              <Chip
                key={g.id}
                on={group === g.id && !selected}
                onClick={() => {
                  setGroup(group === g.id ? null : g.id);
                  setSelected(null);
                }}
              >
                {g.label}
              </Chip>
            ))}
          </ButtonRow>
        </>
      }
      prev={{ to: '/', label: '返回首页' }}
      next={{ to: '/scene/tf.html', label: '坐标系与 TF' }}
      overlay={
        selectedPart && (
          <div className={styles.note}>
            <div className={styles.noteHead}>
              <span className={styles.noteLabel}>{selectedPart.label}</span>
              <span className={styles.noteKind}>{KIND_LABEL[selectedPart.kind]}</span>
            </div>
            <p className={styles.noteText}>{selectedPart.note}</p>
            <div className={styles.noteDof}>
              <span>自由度</span>
              <strong>{selectedPart.dof ?? '—'}</strong>
            </div>
          </div>
        )
      }
    >
      <Robot
        joints={NEUTRAL_JOINTS}
        explode={explode}
        selected={effectiveSelected}
        onSelect={(id) => {
          setSelected(id);
          if (id) setGroup(null);
        }}
      />
    </SceneShell>
  );
}

const KIND_LABEL: Record<PartDef['kind'], string> = {
  structure: '结构件',
  joint: '关节',
  sensor: '传感器',
  gripper: '末端执行器',
  tool: '工具',
};
