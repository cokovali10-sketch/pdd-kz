export type Locale = 'ru' | 'kk' | 'en';

export const LOCALES: Locale[] = ['ru', 'kk', 'en'];

export type Localized = Record<Locale, string>;

export type SignGroup =
  | 'warning'
  | 'priority'
  | 'prohibitory'
  | 'mandatory'
  | 'special'
  | 'info'
  | 'service'
  | 'additional';

export interface Topic {
  id: string;
  order: number;
  icon: string;
  accent: string;
  title: Localized;
  short: Localized;
}

export interface ExamProfile {
  id: string;
  category: string;
  name: Localized;
  questions: number;
  minutes: number;
  maxErrors: number;
  passRule: 'maxErrorsExceededOrTime' | 'none';
  revealAnswers: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  sourceNote?: Localized;
}

export interface Sign {
  id: string;
  code: string;
  file: string;
  group: SignGroup;
  shape: string;
  glyph: string;
  applies: string[];
  title: Localized;
  desc: Localized;
}

export interface Marking {
  id: string;
  file: string;
  kind: string;
  title: Localized;
  desc: Localized;
}

export interface PddPoint {
  id: string;
  text: Localized;
}

export interface PddChapter {
  id: string;
  title: Localized;
  points: PddPoint[];
}

export interface Fine {
  id: string;
  article: string;
  title: Localized;
  amountMrep: number;
  status: string;
  pdDRefs: PddRef[];
  note?: Localized;
}

export interface PddRef {
  chapter: string;
  point?: string;
}

export interface QuestionOption {
  id: string;
  text: Localized;
}

export type DiagramArm = 'n' | 'e' | 's' | 'w';

export interface DiagramVehicle {
  id: string;
  arm: DiagramArm;
  pos: number;
  kind?: 'car' | 'truck';
  turn?: 'straight' | 'left' | 'right';
  fromYard?: boolean;
  onCircle?: boolean;
}

export interface DiagramSpec {
  type: 'cross' | 'roundabout' | 'straight';
  arms?: DiagramArm[];
  main?: DiagramArm[];
  lanes?: number;
  vehicles: DiagramVehicle[];
  trams?: { id: string; arm: DiagramArm; pos: number }[];
  pedestrians?: { arm: DiagramArm; pos: number }[];
  bikes?: { id: string; arm: DiagramArm; pos: number; side?: 'right' | 'left' }[];
  crossings?: { pos: number }[];
  lights?: { arm: DiagramArm; state: 'red' | 'green' }[];
  signs?: { code: string; arm: DiagramArm; side?: 'right' | 'left' }[];
  yard?: { arm: DiagramArm; pos: number };
  caption?: Localized;
}

export interface Question {
  id: string;
  category: string;
  topicIds: string[];
  text: Localized;
  options: QuestionOption[];
  correctOptionId: string;
  explanation: Localized;
  pdDRefs: PddRef[];
  signIds?: string[];
  diagram?: DiagramSpec;
  difficulty: number;
  tags?: string[];
  source: string;
}

export interface ContentBundle {
  version: string;
  topics: Topic[];
  examProfiles: ExamProfile[];
  signs: Sign[];
  markings: Marking[];
  chapters: PddChapter[];
  questions: Question[];
  fines: Fine[];
}

export type ExamMode =
  | 'exam'
  | 'training'
  | 'topic'
  | 'signs'
  | 'situations'
  | 'weak'
  | 'mistakes'
  | 'marathon'
  | 'blitz'
  | 'daily'
  | 'ticket';