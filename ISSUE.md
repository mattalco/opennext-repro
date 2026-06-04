# `revalidateTag()` does not invalidate composable cache entries (`'use cache'` + `cacheTag`)

## Description

When using Next.js 16's composable cache (`cacheComponents: true` + `'use cache'` directive + `cacheTag()`), calling `revalidateTag()` does not cause subsequent requests to serve fresh content. The page continues to return stale cached data indefinitely.

The **write side works correctly** — DynamoDB tag invalidation records are created with the proper `revalidatedAt` timestamp. The **read side is broken** — when the Lambda serves a request, the composable cache `get()` reads the S3 entry, checks DynamoDB, but incorrectly returns the entry as fresh (`x-nextjs-cache: HIT`).

Bypassing the cache with the `x-prerender-revalidate` header returns updated content (`x-nextjs-cache: MISS`), confirming the data source is fresh and only the cache read path is broken.

This reproduces on both `@opennextjs/aws` 3.10.4 and 4.0.3. It works correctly on `next start` locally.

## Reproduction

Minimal repro repo: [link to repo]

### Setup

```bash
pnpm install
npx open-next build
sst deploy
```

### `next.config.ts`

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  cacheComponents: true,
};

export default nextConfig;
```

### `open-next.config.ts`

```ts
import type { OpenNextConfig } from '@opennextjs/aws/types/open-next';

const config = {
  default: {},
} satisfies OpenNextConfig;

export default config;
```

### `src/app/page.tsx`

```tsx
import { cacheLife, cacheTag } from 'next/cache';

async function getData() {
  'use cache';
  cacheLife('max');
  cacheTag('pages');

  const res = await fetch('https://jsonplaceholder.typicode.com/posts/1', {
    cache: 'no-store',
  });
  const post = await res.json();

  return { title: post.title, renderedAt: Date.now() };
}

export default async function Page() {
  const data = await getData();

  return (
    <main>
      <h1>OpenNext Composable Cache Repro</h1>
      <p>Title: {data.title}</p>
      <p>Rendered at: {new Date(data.renderedAt).toISOString()}</p>
    </main>
  );
}
```

### `src/app/api/revalidate/route.ts`

```ts
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function GET() {
  revalidateTag('pages', { expire: 0 });

  return NextResponse.json({
    revalidated: true,
    tag: 'pages',
    now: Date.now(),
  });
}
```

## Steps to reproduce

1. Deploy the app with `sst deploy`
2. Visit the page — note the "Rendered at" timestamp
3. Hit `/api/revalidate` — response confirms `{ revalidated: true }`
4. Refresh the page — **timestamp does not change** (bug)
5. Add `x-prerender-revalidate: <token>` header — timestamp updates (proves data is fresh)

## Expected behavior

After calling `revalidateTag('pages')`, the next request to the page should serve fresh content with an updated timestamp.

## Actual behavior

The page continues to serve the stale cached entry. The `x-nextjs-cache: HIT` header confirms the composable cache is returning the old entry without honoring the tag invalidation.

## Root cause analysis

The composable cache write path correctly records tag invalidation in DynamoDB:
- `revalidateTag('pages')` writes `revalidatedAt` / `expire` / `stale` timestamps for composable cache entries tagged with `pages`

The composable cache read path does **not** correctly check these records:
- On a subsequent request, `composable-cache.get()` reads the cached entry from S3
- It checks DynamoDB for tag invalidation records
- It incorrectly determines the entry is still valid and returns it as a cache HIT

## Environment

- `next`: 16.2.7
- `@opennextjs/aws`: 4.0.3 (also reproduced on 3.10.4)
- `sst`: 4.15.2
- Deployment: AWS Lambda + S3 + DynamoDB (default SST Nextjs component)
- Region: us-east-1

## Workaround

Remove `cacheComponents: true` from `next.config.ts` and replace `'use cache'` directives with fetch-level caching using `next: { tags: [...] }`. The fetch-level ISR cache path handles tag invalidation correctly.
