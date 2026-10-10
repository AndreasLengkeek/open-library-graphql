import type { SearchDoc } from './datasources/openLibrary.js';
import { stripKey } from './ids.js';

export type AuthorModel = {
  id: string;
  name: string;
  bio?: string;
  birthDate?: string;
  books?: BookModel[];
};

export type BookModel = {
  id: string;
  title: string;
  description: string | null;
  subjects: string[];
  isbns: string[];
  firstPublishYear: number | null;
  coverUrl: string | null;
  authors: AuthorModel[];
};

export function toBook(doc: SearchDoc): BookModel {
  return {
    id: stripKey(doc.key),
    title: doc.title,
    description: doc.description ?? null,
    subjects: doc.subject ?? [],
    isbns: doc.isbn ?? [],
    firstPublishYear: doc.first_publish_year ?? null,
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
    authors: toAuthors(doc),
  };
}

// author_key and author_name are parallel arrays. Drop any Author whose name is missing: Author.name is non-null.
function toAuthors({ author_key = [], author_name = [] }: SearchDoc): AuthorModel[] {
  return author_key.flatMap((key, i) => {
    const name = author_name[i];
    return name ? [{ id: stripKey(key), name }] : [];
  });
}
