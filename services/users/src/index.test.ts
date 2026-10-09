import { beforeEach, describe, expect, it } from 'vitest';
import { createDb, type Db } from './db/index.js';
import { users, type UserRow } from './db/schema.js';
import { createServer } from './server.js';

const server = createServer();

let db: Db;

beforeEach(() => {
  db = createDb(':memory:');
});

function insertUser(values: Partial<UserRow> = {}): UserRow {
  return db
    .insert(users)
    .values({ username: 'ada', displayName: 'Ada Lovelace', ...values })
    .returning()
    .get();
}

async function execute(query: string, variables?: Record<string, unknown>) {
  const response = await server.executeOperation({ query, variables }, { contextValue: { db } });
  if (response.body.kind !== 'single') throw new Error('Expected a single result');
  return response.body.singleResult;
}

describe('user(username)', () => {
  const query = /* GraphQL */ `
    query User($username: String!) {
      user(username: $username) {
        id
        username
        displayName
        bio
      }
    }
  `;

  it('returns the User with that username', async () => {
    const user = insertUser({ bio: 'First programmer' });

    const result = await execute(query, { username: 'ada' });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      user: { id: user.id, username: 'ada', displayName: 'Ada Lovelace', bio: 'First programmer' },
    });
  });

  it('returns null bio when the User has not written one', async () => {
    insertUser();

    const result = await execute(query, { username: 'ada' });

    expect(result.data).toMatchObject({ user: { bio: null } });
  });

  it('returns null without an error for an unknown username', async () => {
    insertUser();

    const result = await execute(query, { username: 'nobody' });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ user: null });
  });
});

describe('_entities', () => {
  // The query the router sends when another subgraph references a User by id.
  const query = /* GraphQL */ `
    query Entities($representations: [_Any!]!) {
      _entities(representations: $representations) {
        ... on User {
          id
          username
          displayName
          bio
        }
      }
    }
  `;

  it('resolves a User reference to the full User', async () => {
    const user = insertUser({ bio: 'First programmer' });

    const result = await execute(query, {
      representations: [{ __typename: 'User', id: user.id }],
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      _entities: [
        { id: user.id, username: 'ada', displayName: 'Ada Lovelace', bio: 'First programmer' },
      ],
    });
  });

  it('resolves several references in the order they were given', async () => {
    const ada = insertUser();
    const grace = insertUser({ username: 'grace', displayName: 'Grace Hopper' });

    const result = await execute(query, {
      representations: [
        { __typename: 'User', id: grace.id },
        { __typename: 'User', id: ada.id },
      ],
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toMatchObject({
      _entities: [{ username: 'grace' }, { username: 'ada' }],
    });
  });

  it('returns null for a reference to a User that does not exist', async () => {
    const result = await execute(query, {
      representations: [{ __typename: 'User', id: 'missing' }],
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ _entities: [null] });
  });
});

describe('_service', () => {
  it('publishes the SDL with User as an entity keyed by id', async () => {
    const result = await execute('{ _service { sdl } }');

    expect(result.errors).toBeUndefined();
    const { sdl } = (result.data as { _service: { sdl: string } })._service;
    expect(sdl).toMatch(/type User @key\(fields: "id"\)/);
  });
});
