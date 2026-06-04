# OpenNext Composable Cache revalidateTag Repro

Minimal reproduction of a bug where `revalidateTag()` does not invalidate
composable cache (`'use cache'`) entries on `@opennextjs/aws` 4.x.

## Setup

```bash
npm install
npx sst init  # if you haven't already
```

## Deploy

```bash
npx sst deploy --stage dev
```

## Reproduce

1. Visit the deployed page — note the "Rendered at" timestamp
2. Refresh — confirm it stays the same (cached, `x-nextjs-cache: HIT`)
3. Hit `/api/revalidate` — returns `{ revalidated: true }`
4. Refresh the page — **BUG:** timestamp is unchanged, `x-nextjs-cache: HIT`
5. Hit the page with header `x-prerender-revalidate: <token from .next/prerender-manifest.json>` — timestamp updates, proving the cache read path is at fault

## Expected

After step 3, the next page request should show a new timestamp (cache miss or stale-while-revalidate).

## Actual

The composable cache entry is served indefinitely as HIT despite the tag
invalidation being written to DynamoDB.

## Environment

- Next.js 16.2.6
- @opennextjs/aws 4.0.2
- SST 3.x
- cacheComponents: true

## Works on

- @opennextjs/aws 3.10.4 (same Next.js version, same cacheComponents config)
