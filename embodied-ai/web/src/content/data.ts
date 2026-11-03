import chaptersRaw from './generated/chapters.json';
import metaRaw from './generated/meta.json';
import type { Chapter, ChapterIndexEntry, SiteMeta, Track } from './types';

export const chapters = chaptersRaw as Chapter[];
export const meta = metaRaw as SiteMeta;
export const chapterIndex = meta.chapters as ChapterIndexEntry[];

const byId = new Map(chapters.map((c) => [c.id, c]));

export function getChapter(id: string): Chapter | undefined {
  return byId.get(id);
}

/** 站内文章路径（React Router 负责拼接 basename） */
export function chapterPath(id: string): string {
  return `/chapter/${id}.html`;
}

export function chaptersOf(track: Track): Chapter[] {
  return chapters.filter((c) => c.track === track);
}

export const KNOWN_IDS = new Set(chapters.map((c) => c.id));
