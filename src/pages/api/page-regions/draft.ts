import type { APIRoute } from 'astro';
import { demoContentStore } from '../../../cms/demo-store';
import { handleApiRequest } from '../../../worker/routes';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  return handleApiRequest(request, demoContentStore);
};

export const POST: APIRoute = async ({ request }) => {
  return handleApiRequest(request, demoContentStore);
};

