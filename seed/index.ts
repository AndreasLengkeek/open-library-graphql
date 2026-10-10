import path from 'path';
import { createDb as createUsersDb } from '../services/users/src/db/index.js';
import { createDb as createLibraryDb } from '../services/library/src/db/index.js';
import { seed } from './seed.js';

// Each subgraph opens its database relative to its own directory (`pnpm dev` runs there).
const services = path.resolve(import.meta.dirname, '../services');
const usersUrl = path.join(services, 'users/users.db');
const libraryUrl = path.join(services, 'library/library.db');

seed(createUsersDb(usersUrl), createLibraryDb(libraryUrl));
console.log(`Seeded ${usersUrl} and ${libraryUrl}`);
