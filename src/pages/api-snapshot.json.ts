import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify(
      {
        message: 'Use the Worker /api/snapshot endpoint for live CMS snapshots. Astro can consume exported snapshots during build.',
      },
      null,
      2,
    ),
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
    },
  );
};
