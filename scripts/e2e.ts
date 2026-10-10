/**
 * End-to-end check for milestone 3: seed, start the whole stack with `pnpm dev`, log in as the
 * seeded `andreas` and run `MyShelves` through the router. Talks to the real Open Library, so it
 * isn't part of `pnpm test`.
 */
import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ROUTER_URL = 'http://127.0.0.1:4000/';
const SUBGRAPH_URLS = [4001, 4002, 4003].map((port) => `http://localhost:${port}/graphql`);
const STARTUP_TIMEOUT_MS = 90_000;

const MY_SHELVES = /* GraphQL */ `
  query MyShelves {
    me {
      displayName
      shelves {
        __typename
        name
        books {
          title
          authors {
            name
          }
        }
      }
    }
  }
`;

type GraphQLResponse<T> = { data?: T; errors?: { message: string }[] };

async function graphql<T>(url: string, query: string, token?: string): Promise<GraphQLResponse<T>> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      // Apollo Server's CSRF prevention rejects simple requests without this.
      'apollo-require-preflight': 'true',
      ...(token && { authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ query }),
  });
  return (await res.json()) as GraphQLResponse<T>;
}

const isUp = (url: string) =>
  graphql(url, '{ __typename }').then(
    (res) => res.data !== undefined,
    () => false,
  );

async function waitForStack() {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const up = await Promise.all([ROUTER_URL, ...SUBGRAPH_URLS].map(isUp));
    if (up.every(Boolean)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`The stack didn't come up within ${STARTUP_TIMEOUT_MS / 1000}s.`);
}

async function run() {
  if (await isUp(ROUTER_URL)) {
    throw new Error(`Something is already serving ${ROUTER_URL}. Stop \`pnpm dev\` first.`);
  }

  console.log('Seeding…');
  execSync('pnpm seed', { cwd: ROOT, stdio: 'inherit' });

  console.log('Starting the stack…');
  // Its own process group, so one signal stops concurrently, the subgraphs and the router.
  const stack = spawn('pnpm', ['dev'], { cwd: ROOT, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  stack.stdout.on('data', (chunk) => (logs += chunk));
  stack.stderr.on('data', (chunk) => (logs += chunk));
  const stop = () => {
    try {
      process.kill(-stack.pid!, 'SIGTERM');
    } catch {
      // Already gone.
    }
  };
  process.on('SIGINT', () => {
    stop();
    process.exit(130);
  });

  try {
    await waitForStack();

    const anonymous = await graphql<{ me: unknown }>(ROUTER_URL, MY_SHELVES);
    assert.deepEqual(anonymous, { data: { me: null } }, 'Without a token, `me` should be null.');
    console.log('✓ Without a token, `me` is null.');

    const login = await graphql<{ logIn: { token: string } }>(
      ROUTER_URL,
      'mutation { logIn(username: "andreas") { token } }',
    );
    assert.ok(login.data?.logIn.token, `logIn failed: ${JSON.stringify(login.errors)}`);
    console.log('✓ Logged in as andreas.');

    const result = await graphql<MyShelvesData>(ROUTER_URL, MY_SHELVES, login.data.logIn.token);
    for (const shelf of result.data?.me?.shelves ?? []) {
      console.log(`\n${shelf.name} (${shelf.__typename})`);
      for (const book of shelf.books) {
        console.log(book ? `  ${book.title} — ${book.authors.map((author) => author.name).join(', ')}` : '  null');
      }
    }
    console.log();
    checkMyShelves(result);
    console.log('✓ MyShelves returned andreas’s seeded Shelves with titles and Authors.');
  } catch (error) {
    console.error('\nStack output:\n' + logs);
    throw error;
  } finally {
    stop();
  }
}

type MyShelvesData = {
  me: {
    displayName: string;
    shelves: {
      __typename: string;
      name: string;
      books: ({ title: string; authors: { name: string }[] } | null)[];
    }[];
  } | null;
};

function checkMyShelves({ data, errors }: GraphQLResponse<MyShelvesData>) {
  // `displayName` comes from users, `shelves` from library, `title` and `authors` from catalog.
  const me = data?.me;
  assert.ok(me, '`me` should resolve with a token.');
  assert.equal(me.displayName, 'Andreas');

  assert.deepEqual(
    me.shelves.map((shelf) => [shelf.__typename, shelf.name, shelf.books.length]),
    [
      ['StatusShelf', 'Want to read', 8],
      ['StatusShelf', 'Reading', 4],
      ['StatusShelf', 'Read', 8],
      ['CustomShelf', 'Favourites', 5],
      ['CustomShelf', 'Borrowed', 2],
    ],
  );

  // The seed's unknown Book on Borrowed is the only one Open Library can't resolve. Any other null
  // means a catalog fetch failed, often an Open Library timeout.
  const nulls = me.shelves.flatMap((shelf) => shelf.books.flatMap((book) => (book ? [] : [shelf.name])));
  assert.deepEqual(nulls, ['Borrowed'], `Unexpected null Books. Errors: ${JSON.stringify(errors ?? [], null, 2)}`);

  const books = me.shelves.flatMap((shelf) => shelf.books).filter((book) => book !== null);
  for (const book of books) {
    assert.ok(book.title, 'Every Book should have a title.');
    assert.ok(book.authors.length > 0, `"${book.title}" should have Authors.`);
  }
  const hobbit = books.find((book) => book.title === 'The Hobbit');
  assert.deepEqual(hobbit?.authors.map((author) => author.name), ['J.R.R. Tolkien']);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
