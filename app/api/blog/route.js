import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getAuthUserFromRequest } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

// GET — public blog posts list
export async function GET() {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverImage: true,
      authorName: true,
      createdAt: true,
    },
    take: 50,
  });
  return NextResponse.json(posts);
}

// POST — admin creates a new blog post
export async function POST(req) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const admin = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: { role: true },
  });
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  }

  const body = await req.json();
  const title = String(body?.title || '').trim();
  const slug = String(body?.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  const excerpt = String(body?.excerpt || '').trim() || null;
  const postBody = String(body?.body || '').trim();
  const coverImage = String(body?.coverImage || '').trim() || null;
  const authorName = String(body?.authorName || '').trim() || null;
  const published = Boolean(body?.published);

  if (!title || !slug || !postBody) {
    return NextResponse.json({ error: 'Naslov, slug i sadržaj su obavezni.' }, { status: 400 });
  }

  const post = await prisma.blogPost.create({
    data: { title, slug, excerpt, body: postBody, coverImage, authorName, published },
  });

  return NextResponse.json(post);
}
