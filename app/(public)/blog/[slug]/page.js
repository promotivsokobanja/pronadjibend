'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, User } from 'lucide-react';

export default function BlogPostPage() {
  const params = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.slug) return;
    fetch(`/api/blog/${params.slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setPost(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params?.slug]);

  if (loading) {
    return (
      <div className="blog-post-page page-below-fixed-nav">
        <div className="container" style={{ paddingTop: '8rem', maxWidth: 760 }}>
          <div style={{ height: 32, width: '60%', background: 'rgba(255,255,255,0.06)', borderRadius: 8, marginBottom: '1rem' }} />
          <div style={{ height: 16, width: '40%', background: 'rgba(255,255,255,0.04)', borderRadius: 6, marginBottom: '2rem' }} />
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height: 14, width: `${90 - i*10}%`, background: 'rgba(255,255,255,0.03)', borderRadius: 5, marginBottom: '0.7rem' }} />
          ))}
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="blog-post-page page-below-fixed-nav">
        <div className="container" style={{ paddingTop: '8rem', maxWidth: 760, textAlign: 'center' }}>
          <h1 style={{ color: '#f1f5f9', fontSize: '1.5rem' }}>Članak nije pronađen</h1>
          <Link href="/blog" style={{ color: '#8b5cf6', fontWeight: 700, marginTop: '1rem', display: 'inline-block' }}>
            ← Nazad na blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-post-page page-below-fixed-nav">
      <div className="container blog-post-container">
        <Link href="/blog" className="back-link">
          <ArrowLeft size={14} /> Nazad na blog
        </Link>

        {post.coverImage && (
          <div className="post-cover">
            <img src={post.coverImage} alt={post.title} />
          </div>
        )}

        <h1 className="post-title">{post.title}</h1>

        <div className="post-meta">
          <span><Calendar size={13} /> {new Date(post.createdAt).toLocaleDateString('sr-Latn')}</span>
          {post.authorName && <span><User size={13} /> {post.authorName}</span>}
        </div>

        <article className="post-body" dangerouslySetInnerHTML={{ __html: post.body.replace(/\n/g, '<br/>') }} />
      </div>

      <style jsx>{`
        .blog-post-page {
          min-height: 100vh;
          background: #030308;
          color: #f8fafc;
          padding-bottom: 4rem;
        }
        .blog-post-container {
          padding-top: 8rem;
          max-width: 760px;
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          color: #8b5cf6;
          font-weight: 700;
          font-size: 0.85rem;
          text-decoration: none;
          margin-bottom: 1.5rem;
        }
        .post-cover {
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 1.5rem;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .post-cover img {
          width: 100%;
          height: auto;
          display: block;
        }
        .post-title {
          font-size: clamp(1.6rem, 4vw, 2.4rem);
          font-weight: 800;
          line-height: 1.15;
          margin-bottom: 0.75rem;
        }
        .post-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 600;
          margin-bottom: 2rem;
        }
        .post-meta span {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        .post-body {
          font-size: 1.05rem;
          line-height: 1.8;
          color: #cbd5e1;
        }
        @media (max-width: 640px) {
          .blog-post-container { padding-top: 6.5rem; }
          .post-title { font-size: 1.4rem; }
          .post-body { font-size: 0.95rem; line-height: 1.7; }
          .post-cover { border-radius: 12px; }
        }
      `}</style>
    </div>
  );
}
