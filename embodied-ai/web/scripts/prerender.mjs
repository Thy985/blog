#!/usr/bin/env node
/**
 * 预渲染：把客户端构建产出的 index.html 变成 29 个真静态页面。
 *
 *  - /                    首页
 *  - /chapter/<id>.html   21 篇文章
 *  - /scene/<key>.html    6 个 3D 交互场景
 *  - /404.html            兜底
 *
 * 依赖 dist-ssr/entry-server.js（vite build --ssr 产出）。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = join(HERE, '..');
const DIST = join(WEB, 'dist');
const SSR_ENTRY = join(WEB, 'dist-ssr', 'entry-server.js');

const { render } = await import(pathToFileURL(SSR_ENTRY).href);
const meta = JSON.parse(readFileSync(join(WEB, 'src', 'content', 'generated', 'meta.json'), 'utf8'));
const template = readFileSync(join(DIST, 'index.html'), 'utf8');

const SITE = meta.site;

function page({ title, description, body }) {
  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(
      /(<meta\s+name="description"\s+content=")[^"]*(")/,
      `$1${description}$2`,
    )
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}

function write(relPath, html) {
  const out = join(DIST, relPath);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  return relPath;
}

const written = [];

// 6 个 3D 交互场景（与 src/three/scenes/ 里的组件一一对应）
const SCENES = [
  { key: 'anatomy', title: '身体拆解', source: '01 篇 · 机器人的身体' },
  { key: 'tf', title: '坐标系与 TF', source: '02 篇 · 机器人的空间感' },
  { key: 'ik', title: 'IK 反解', source: '03 篇 · 运动学' },
  { key: 'planning', title: '规划与避撞', source: '04 篇 · 运动规划' },
  { key: 'dual', title: '双臂碰撞与互斥', source: '08 篇 · 多机协调' },
  { key: 'safety', title: '安全拦截', source: '07 篇 · 安全' },
];

// 首页
written.push(
  write(
    'index.html',
    page({
      title: `${SITE.title} · ${SITE.subtitle}`,
      description: SITE.tagline,
      body: render('/'),
    }),
  ),
);

// 21 篇文章
for (const c of meta.chapters) {
  const route = `/chapter/${c.id}.html`;
  written.push(
    write(
      join('chapter', `${c.id}.html`),
      page({
        title: `${c.titleShort}——${c.subtitle} · ${SITE.title}`,
        description: `${c.titleShort}：${c.subtitle}。${SITE.subtitle}。`,
        body: render(route),
      }),
    ),
  );
}

// 6 个 3D 场景
for (const s of SCENES) {
  written.push(
    write(
      join('scene', `${s.key}.html`),
      page({
        title: `${s.title} · ${s.source} · ${SITE.title}`,
        description: `${s.title}——${s.source}。3D 交互演示：${SITE.subtitle}。`,
        body: render(`/scene/${s.key}.html`),
      }),
    ),
  );
}

// 404
written.push(
  write(
    '404.html',
    page({
      title: `页面不存在 · ${SITE.title}`,
      description: SITE.tagline,
      body: render('/__not_found__'),
    }),
  ),
);

console.log(`[prerender] 生成 ${written.length} 个静态页面 → ${DIST}`);
