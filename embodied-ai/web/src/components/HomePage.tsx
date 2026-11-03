import { Link } from 'react-router';
import { chapterIndex, chapterPath, chaptersOf, meta } from '@/content/data';
import { HomeHero } from './HomeHero';
import styles from './HomePage.module.css';

/**
 * 6 个旗舰 3D 场景。
 * 只挑那些「用文字讲不清、非得让它动起来」的机制，一场景一个概念。
 */
const SCENES = [
  {
    key: 'anatomy',
    no: '01',
    title: '身体拆解',
    source: '01 篇 · 机器人的身体',
    desc: '把整台机器人炸开成零件：每个零件叫什么、几个自由度、传感器为什么装在那里。',
  },
  {
    key: 'tf',
    no: '02',
    title: '坐标系与 TF',
    source: '02 篇 · 机器人的空间感',
    desc: '同一只手在不同参考系下是不同的坐标。拖动躯干和颈部，看 TF 树怎么跟着长。',
  },
  {
    key: 'ik',
    no: '03',
    title: 'IK 反解',
    source: '03 篇 · 运动学',
    desc: '拖动目标点，关节角实时反解出来。肘上肘下是两组解，够不着就是无解。',
  },
  {
    key: 'planning',
    no: '04',
    title: '规划与避撞',
    source: '04 篇 · 运动规划',
    desc: '看 RRT 一棵一棵地往空白处长，绕开障碍，最后连出一条真能走的路径。',
  },
  {
    key: 'dual',
    no: '05',
    title: '双臂碰撞与互斥',
    source: '08 篇 · 多机协调',
    desc: '两臂同时抢一个工作区会怎样？一边开着互斥排队，一边直接撞上。',
  },
  {
    key: 'safety',
    no: '06',
    title: '安全拦截',
    source: '07 篇 · 安全',
    desc: '把目标推进默认拒绝区，看横切面怎么把请求拦下来，再退回安全位。',
  },
] as const;

export function HomePage() {
  return (
    <div className={styles.page}>
      <HomeHero />

      {/* ---------- 6 个 3D 场景 ---------- */}
      <section className={styles.scenes} id="scenes">
        <h2 className={styles.sectionTitle}>6 个 3D 场景</h2>
        <p className={styles.sectionLead}>
          有些概念写三段话不如让它动一次。这 6 个场景各自盯住一个最容易被误解的机制，把它拆开、驱动起来、再让你亲手碰一下。每个场景都标了对应的原文篇目。
        </p>

        <div className={styles.sceneGrid}>
          {SCENES.map((s) => (
            <Link key={s.key} to={`/scene/${s.key}.html`} className={styles.sceneCard}>
              <div className={styles.sceneTop}>
                <span className={styles.sceneNo}>{s.no}</span>
                <span className={styles.sceneSource}>{s.source}</span>
              </div>
              <h3 className={styles.sceneTitle}>{s.title}</h3>
              <p className={styles.sceneDesc}>{s.desc}</p>
              <span className={styles.sceneCta}>进入场景 →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- 两条阅读路径 ---------- */}
      <section className={styles.paths} id="knowledge">
        <h2 className={styles.sectionTitle}>两条阅读路径</h2>
        <p className={styles.sectionLead}>
          系列本身按两条线组织：知识线把确定性经典机器人栈讲透，业界线以固定快照看产业。两条线互相引用。
        </p>

        <div className={styles.pathGrid}>
          {(['knowledge', 'industry'] as const).map((track) => {
            const t = meta.tracks[track];
            const list = chaptersOf(track);
            return (
              <div key={track} className={styles.pathCard} data-track={track}>
                <div className={styles.pathHead}>
                  <h3 className={styles.pathTitle}>{t.label}</h3>
                  <span className={styles.pathRange}>{t.range}</span>
                </div>
                <p className={styles.pathDesc}>{t.desc}</p>
                <ul className={styles.pathList}>
                  {list.map((c) => (
                    <li key={c.id}>
                      <Link to={chapterPath(c.id)}>
                        <span className={styles.pathNum}>{c.id}</span>
                        {c.titleShort}
                        <span className={styles.pathSub}>{c.subtitle}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- 21 篇总览 ---------- */}
      <section className={styles.series} id="series">
        <h2 className={styles.sectionTitle}>21 篇原文</h2>
        <p className={styles.sectionLead}>
          3D 场景讲机制，原文讲来龙去脉——当时怎么想的、踩了什么坑、边界在哪。原文一个字没改。
          橙色圆点表示该篇含项目实例小节。
        </p>

        <dl className={styles.stats}>
          <div>
            <dt>篇数</dt>
            <dd>21</dd>
          </div>
          <div>
            <dt>章节</dt>
            <dd>{chapterIndex.reduce((n, c) => n + c.sections.length, 0)}</dd>
          </div>
          <div>
            <dt>演进注记</dt>
            <dd>11</dd>
          </div>
          <div>
            <dt>证据索引</dt>
            <dd>20</dd>
          </div>
        </dl>

        <div className={styles.chapterGrid}>
          {chapterIndex.map((c) => {
            const project = c.sections.some((s) => s.kind === 'project');
            return (
              <Link key={c.id} to={chapterPath(c.id)} className={styles.chapterCard}>
                <div className={styles.chapterTop}>
                  <span className={styles.chapterNum}>{c.id}</span>
                  {project && <span className={styles.chapterDot} title="含项目实例" />}
                </div>
                <div className={styles.chapterName}>{c.titleShort}</div>
                <div className={styles.chapterSub}>{c.subtitle}</div>
                <div className={styles.chapterMeta}>{c.sections.length} 节</div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
