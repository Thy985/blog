export type Track = 'knowledge' | 'industry';

export type SectionKind = 'normal' | 'project' | 'boundary' | 'summary';

export interface Section {
  no: number;
  id: string;
  title: string;
  kind: SectionKind;
  body: string;
}

export interface EvolutionNote {
  sectionNo: number;
  title: string;
  text: string;
}

export interface Evidence {
  label: string;
  items: string[];
  raw: string;
}

export interface Chapter {
  id: string;
  order: number;
  slug: string;
  filename: string;
  track: Track;
  title: string;
  titleShort: string;
  subtitle: string;
  lead: string;
  preamble: string;
  sections: Section[];
  summaryText: string | null;
  nextTeaser: string | null;
  evidence: Evidence | null;
  evolutionNotes: EvolutionNote[];
  asciiBlocks: { sectionNo: number; content: string }[];
  prev: string | null;
  next: string | null;
}

export interface ChapterIndexEntry {
  id: string;
  order: number;
  slug: string;
  title: string;
  titleShort: string;
  subtitle: string;
  track: Track;
  prev: string | null;
  next: string | null;
  sections: { no: number; id: string; title: string; kind: SectionKind }[];
}

export interface SiteMeta {
  site: {
    title: string;
    subtitle: string;
    tagline: string;
    snapshot: string;
  };
  tracks: Record<Track, { label: string; range: string; desc: string }>;
  chapters: ChapterIndexEntry[];
}
