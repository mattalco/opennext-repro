import { cacheLife, cacheTag } from 'next/cache';

// This function uses 'use cache' to cache its output in the composable cache.
// The 'pages' tag should allow on-demand invalidation via revalidateTag('pages').
async function getData() {
  'use cache';
  cacheLife('max');
  cacheTag('pages');

  // Use no-store so the fetch always hits the source when the cache re-executes.
  // This isolates the test to ONLY the composable cache layer.
  const res = await fetch(
    'https://jsonplaceholder.typicode.com/posts/1',
    { cache: 'no-store' },
  );
  const post = await res.json();

  return { title: post.title, renderedAt: Date.now() };
}

export default async function Page() {
  const data = await getData();

  return (
    <main style={{ fontFamily: 'monospace', padding: '2rem' }}>
      <h1>OpenNext Composable Cache Repro</h1>
      <p><strong>Title:</strong> {data.title}</p>
      <p><strong>Rendered at:</strong> {new Date(data.renderedAt).toISOString()}</p>
      <p style={{ marginTop: '2rem', color: '#666' }}>
        If revalidateTag works correctly, hitting /api/revalidate then refreshing
        this page should show a new &quot;Rendered at&quot; timestamp.
      </p>
    </main>
  );
}
