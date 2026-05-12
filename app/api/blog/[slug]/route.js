import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const url = new URL(request.url);
  const slug = url.pathname.split('/').pop();

  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
  }

  const post = await prisma.blogPost.findUnique({
    where: { slug },
  });

  if (!post || !post.published) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  return NextResponse.json(post);
}
