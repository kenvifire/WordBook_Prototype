import type { ReviewLogEntry } from '../types';
import { dataPath, readJson, writeJson } from './jsonStore';

function reviewsFilePath(): string {
  return dataPath('reviews.json');
}

function readReviews(): ReviewLogEntry[] {
  return readJson<ReviewLogEntry[]>(reviewsFilePath(), []);
}

function writeReviews(reviews: ReviewLogEntry[]): void {
  writeJson(reviewsFilePath(), reviews);
}

export function appendReview(entry: ReviewLogEntry): void {
  const reviews = readReviews();
  reviews.push(entry);
  writeReviews(reviews);
}

export function getReviewsForCard(cardId: string): ReviewLogEntry[] {
  const reviews = readReviews();
  return reviews.filter(review => review.cardId === cardId);
}
