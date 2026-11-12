import { dataPath, readJson, writeJson } from './jsonStore';

interface LearnerProfile {
  knownWords: string[];
  unlockedSections: string[];
}

function learnerFilePath(): string {
  return dataPath('learner.json');
}

function defaultProfile(): LearnerProfile {
  return { knownWords: [], unlockedSections: [] };
}

function readProfile(): LearnerProfile {
  return readJson<LearnerProfile>(learnerFilePath(), defaultProfile());
}

function writeProfile(profile: LearnerProfile): void {
  writeJson(learnerFilePath(), profile);
}

export function getKnownWords(): string[] {
  return readProfile().knownWords;
}

export function markWordsKnown(tokens: string[]): void {
  const profile = readProfile();
  profile.knownWords = Array.from(new Set([...profile.knownWords, ...tokens]));
  writeProfile(profile);
}

export function isSectionUnlocked(sectionId: string): boolean {
  return readProfile().unlockedSections.includes(sectionId);
}

export function unlockSection(sectionId: string): void {
  const profile = readProfile();
  profile.unlockedSections = Array.from(new Set([...profile.unlockedSections, sectionId]));
  writeProfile(profile);
}
