import type { ReviewRow, ShelfRow } from './db/schema.js';
import type { ReadingStatus } from './types.generated.js';

export type ReviewModel = ReviewRow;
export type CustomShelfModel = ShelfRow & { kind: 'custom' };
export type StatusShelfModel = { kind: 'status'; userId: string; status: ReadingStatus };
export type ShelfModel = CustomShelfModel | StatusShelfModel;
export type BookRef = { id: string };
export type UserRef = { id: string };
