import type { CardState } from '../types';
import { INITIAL_SM2_STATE } from '../srs/sm2';
import { dataPath, readJson, writeJson } from './jsonStore';

type CardsById = Record<string, CardState>;

function cardsFilePath(): string {
  return dataPath('cards.json');
}

function readCards(): CardsById {
  return readJson<CardsById>(cardsFilePath(), {});
}

function writeCards(cards: CardsById): void {
  writeJson(cardsFilePath(), cards);
}

function cardId(sectionId: string, token: string): string {
  return `${sectionId}:${token}`;
}

export function getCard(sectionId: string, token: string): CardState | undefined {
  const cards = readCards();
  return cards[cardId(sectionId, token)];
}

export function getCardsForSection(sectionId: string): CardState[] {
  const cards = readCards();
  return Object.values(cards).filter(card => card.sectionId === sectionId);
}

export function upsertCard(card: CardState): void {
  const cards = readCards();
  cards[card.id] = card;
  writeCards(cards);
}

export function createCardIfMissing(sectionId: string, token: string): CardState {
  const cards = readCards();
  const id = cardId(sectionId, token);
  const existing = cards[id];
  if (existing) {
    return existing;
  }
  const card: CardState = {
    id,
    sectionId,
    token,
    ...INITIAL_SM2_STATE,
    lastGrade: null,
    dueAt: new Date().toISOString(),
  };
  cards[id] = card;
  writeCards(cards);
  return card;
}
