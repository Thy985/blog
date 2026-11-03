import styles from './SceneShell.module.css';

export function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className={styles.sliderRow}>
      <label className={styles.sliderLabel}>
        <span>{label}</span>
        <span className={styles.sliderValue}>{format ? format(value) : value.toFixed(2)}</span>
      </label>
      <input
        type="range"
        className={styles.slider}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Chip({
  on,
  onClick,
  children,
}: {
  on?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={on ? `${styles.chip} ${styles.chipOn}` : styles.chip}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function ButtonRow({ children }: { children: React.ReactNode }) {
  return <div className={styles.btnRow}>{children}</div>;
}
