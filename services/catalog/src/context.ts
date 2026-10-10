import type { OpenLibraryClient } from './datasources/openLibrary.js';

export type Context = {
  openLibrary: OpenLibraryClient;
};
