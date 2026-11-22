export type Level = "A2" | "B1" | "B2" | "C1";
export type Genre = "fantasy" | "mystery" | "funny" | "mine"; // "mine": a book the learner uploaded
export interface WordCard { id: string; word: string; meaning: string; example: string; translations?: Record<string, string> }
export interface Section { id: string; storyId: string; level: Level; order: number; title: string; text: string; cards: WordCard[] }
export interface StoryVersion { id: string; storyId: string; level: Level; status: "draft" | "approved" | "auto"; sections: Section[] }
export interface Story { id: string; title: string; author: string; genre: Genre; blurb: string; minutes: number; contentNote?: string; source?: string; license?: string; ownerId?: string | null; versions: StoryVersion[] }
