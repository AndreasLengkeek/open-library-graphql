/**
 * Milestone 4 measurement: logs in as the seeded `andreas`, runs each scenario a few times through
 * the router and records the catalog's Open Library request count and the operation's latency.
 * Talks to the real Open Library, so it isn't part of `pnpm test`.
 *
 * Run `pnpm seed && pnpm dev` first. Local `rover dev` only: a GraphOS-connected router on the
 * Free plan is rate limited and would distort the numbers.
 */
import assert from 'node:assert/strict';

const ROUTER_URL = 'http://127.0.0.1:4000/';
const COUNTER_URL = 'http://127.0.0.1:4012/open-library-requests';
const RUNS = 5;

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

const MY_SHELVES_WITH_BIOS = /* GraphQL */ `
  query MyShelvesWithBios {
    me {
      displayName
      shelves {
        __typename
        name
        books {
          title
          authors {
            name
            bio
          }
        }
      }
    }
  }
`;

const BOOK_DETAIL = /* GraphQL */ `
  query BookDetail {
    book(id: "OL893414W") {
      title
      description
      subjects
      isbns
      authors {
        name
        bio
        birthDate
        books {
          title
        }
      }
      averageRating
      reviews {
        rating
        text
        user {
          displayName
        }
      }
    }
  }
`;

const SCENARIOS = [
  { name: '`MyShelves`', query: MY_SHELVES },
  { name: '`MyShelves` + `authors { bio }`', query: MY_SHELVES_WITH_BIOS },
  { name: '`BookDetail` (`OL893414W`)', query: BOOK_DETAIL },
];

type GraphQLResponse<T> = { data?: T; errors?: { message: string }[] };

async function graphql<T>(query: string, token?: string): Promise<GraphQLResponse<T>> {
  const res = await fetch(ROUTER_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token && { authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ query }),
  });
  return (await res.json()) as GraphQLResponse<T>;
}

async function readOpenLibraryRequests() {
  const res = await fetch(COUNTER_URL);
  return ((await res.json()) as { count: number }).count;
}

async function resetOpenLibraryRequests() {
  await fetch(COUNTER_URL, { method: 'DELETE' });
}

/** Nearest-rank percentile. With 5 runs, p50 is the 3rd fastest and p95 the slowest. */
function percentile(values: number[], p: number) {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.ceil((p / 100) * sorted.length) - 1];
}

async function measure(query: string, token: string) {
  // Discarded, so connection setup to Open Library and query planning don't land in the p95.
  await graphql(query, token);

  const counts: number[] = [];
  const latencies: number[] = [];
  let errors = 0;
  for (let run = 0; run < RUNS; run++) {
    await resetOpenLibraryRequests();
    const start = performance.now();
    const result = await graphql(query, token);
    latencies.push(performance.now() - start);
    counts.push(await readOpenLibraryRequests());
    errors += result.errors?.length ?? 0;
  }
  return { counts, median: percentile(latencies, 50), p95: percentile(latencies, 95), errors };
}

async function run() {
  await readOpenLibraryRequests().catch(() => {
    throw new Error(`The catalog's counter isn't reachable at ${COUNTER_URL}. Run \`pnpm dev\` first.`);
  });

  const login = await graphql<{ logIn: { token: string } }>('mutation { logIn(username: "andreas") { token } }');
  assert.ok(login.data?.logIn.token, `logIn failed: ${JSON.stringify(login.errors)}`);
  const token = login.data.logIn.token;

  const ms = (value: number) => `${Math.round(value)} ms`;
  console.log(`${RUNS} runs each, after one discarded warm-up run.\n`);
  console.log('| Operation | Open Library requests | Median | p95 | GraphQL errors |');
  console.log('| --- | --- | --- | --- | --- |');
  for (const scenario of SCENARIOS) {
    const { counts, median, p95, errors } = await measure(scenario.query, token);
    // The count should be the same every run; show every run's count if it isn't.
    const requests = new Set(counts).size === 1 ? String(counts[0]) : counts.join(', ');
    console.log(`| ${scenario.name} | ${requests} | ${ms(median)} | ${ms(p95)} | ${errors} |`);
    if (errors > 0) process.exitCode = 1;
  }
  if (process.exitCode) {
    console.error('\nSome runs had GraphQL errors (often an Open Library timeout). Those numbers are not a baseline.');
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
