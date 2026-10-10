import { beforeEach, describe, expect, it } from 'vitest';
import { verifyToken } from '@olg/auth';
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
  const response = await server.executeOperation({ query, variables }, { contextValue: { db, viewer: null } });
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

describe('signUp', () => {
  const mutation = /* GraphQL */ `
    mutation SignUp($username: String!, $displayName: String) {
      signUp(username: $username, displayName: $displayName) {
        token
        user {
          id
          username
          displayName
        }
      }
    }
  `;

  it('creates the User and returns a token whose sub is their id', async () => {
    const result = await execute(mutation, { username: 'ada', displayName: 'Ada Lovelace' });

    expect(result.errors).toBeUndefined();
    const { token, user } = (result.data as { signUp: { token: string; user: { id: string } } })
      .signUp;
    expect(user).toMatchObject({ username: 'ada', displayName: 'Ada Lovelace' });
    await expect(verifyToken(token)).resolves.toEqual({ id: user.id });
    expect(db.select().from(users).all()).toHaveLength(1);
  });

  it('defaults displayName to the username', async () => {
    const result = await execute(mutation, { username: 'ada' });

    expect(result.data).toMatchObject({ signUp: { user: { displayName: 'ada' } } });
  });

  it('fails with BAD_USER_INPUT when the username is taken', async () => {
    insertUser();

    const result = await execute(mutation, { username: 'ada' });

    expect(result.data).toBeNull();
    expect(result.errors?.[0].extensions?.code).toBe('BAD_USER_INPUT');
    expect(db.select().from(users).all()).toHaveLength(1);
  });
});

describe('logIn', () => {
  const mutation = /* GraphQL */ `
    mutation LogIn($username: String!) {
      logIn(username: $username) {
        token
        user {
          id
          username
        }
      }
    }
  `;

  it('returns a token whose sub is the id of the User with that username', async () => {
    const user = insertUser();

    const result = await execute(mutation, { username: 'ada' });

    expect(result.errors).toBeUndefined();
    const { token } = (result.data as { logIn: { token: string } }).logIn;
    expect(result.data).toMatchObject({ logIn: { user: { id: user.id, username: 'ada' } } });
    await expect(verifyToken(token)).resolves.toEqual({ id: user.id });
  });

  it('logs in a User created by signUp', async () => {
    const signUp = await execute(
      /* GraphQL */ `
        mutation {
          signUp(username: "ada") {
            user {
              id
            }
          }
        }
      `,
    );
    const { id } = (signUp.data as { signUp: { user: { id: string } } }).signUp.user;

    const result = await execute(mutation, { username: 'ada' });

    const { token } = (result.data as { logIn: { token: string } }).logIn;
    await expect(verifyToken(token)).resolves.toEqual({ id });
  });

  it('fails with BAD_USER_INPUT for an unknown username', async () => {
    insertUser();

    const result = await execute(mutation, { username: 'nobody' });

    expect(result.data).toBeNull();
    expect(result.errors?.[0].extensions?.code).toBe('BAD_USER_INPUT');
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
