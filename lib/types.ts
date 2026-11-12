export type Grade = 'again' | 'hard' | 'good' | 'easy';

export interface Section { id: string; bookId: string; index: number; title: string; text: string; }

export interface CandidateWord { token: string; sentence: string; occurrences: number; }

export interface PrioritizedWord extends CandidateWord { reason: string; priorityScore: number; }

export interface WordSense { token: string; sentence: string; definitionEn: string; translationEn: string; exampleEs: string; }

export interface SM2State { easeFactor: number; interval: number; repetitions: number; }

export interface CardState extends SM2State { id: string; sectionId: string; token: string; lastGrade: Grade | null; dueAt: string; }

export interface GateStatus { recognizedCount: number; totalCount: number; recognitionRate: number; passed: boolean; }

export interface ReviewLogEntry { cardId: string; grade: Grade; gradedAt: string; }
