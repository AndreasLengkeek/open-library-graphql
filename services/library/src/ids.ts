import type { ReadingStatus } from './types.generated.js';

export const STATUS_ORDER = ['WANT_TO_READ', 'READING', 'READ'] as const;
export const STATUS_NAMES = { WANT_TO_READ: 'Want to read', READING: 'Reading', READ: 'Read' };
export const statusShelfId = (userId: string, status: ReadingStatus) => `status:${userId}:${status}`;
