'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Calendar, ArrowRight } from 'lucide-react';

export default function BlogListPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/blog')
      .then((r) => r.json())
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="blog-page page-below-fixed-nav">
      <div className="container blog-container">
        <header className="blog-header">
          <h1><BookOpen size={28} /> Blog &amp; Saveti</h1>
          <p>Korisni saveti za organizaciju proslava, izbor benda i mnogo više.</p>
        </header>

        {loading ? (
          <div className="blog-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="blog-card-skeleton" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="blog-empty">
            <p>Još nema objavljenih članaka. Uskoro stiže novi sadržaj!</p>
          </div>
        ) : (
          <div className="blog-grid">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="blog-card">
                {post.coverImage && (
                  <div className="blog-card-cover">
                    <img src={post.coverImage} alt={post.title} loading="lazy" />
                  </div>
                )}
                <div className="blog-card-body">
                  <h2>{post.title}</h2>
                  {post.excerpt && <p className="blog-card-excerpt">{post.excerpt}</p>}
                  <div className="blog-card-meta">
                    <span><Calendar size={12} /> {new Date(post.createdAt).toLocaleDateString('sr-Latn')}</span>
                    {post.authorName && <span>{post.authorName}</span>}
                  </div>
                  <span className="blog-card-link">Pročitaj više <ArrowRight size={14} /></span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .blog-page {
          min-height: 100vh;
          background: radial-gradient(circle at 20% 10%, rgba(139, 92, 246, 0.12), transparent 55%), #030308;
          color: #f8fafc;
          padding-bottom: 4rem;
        }
        .blog-container {
          padding-top: 8rem;
          max-width: 900px;
        }
        .blog-header {
          margin-bottom: 2.5rem;
        }
        .blog-header h1 {
          font-size: 2.2rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .blog-header p {
          color: #94a3b8;
          font-size: 1rem;
        }
        .blog-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        .blog-card {
          display: block;
          text-decoration: none;
          color: inherit;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          overflow: hidden;
          background: rgba(255,255,255,0.02);
          transition: border-color 0.2s, transform 0.2s;
        }
        .blog-card:hover {
          border-color: rgba(139, 92, 246, 0.3);
          transform: translateY(-2px);
        }
        .blog-card-cover {
          aspect-ratio: 16/7;
          overflow: hidden;
        }
        .blog-card-cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .blog-card-body {
          padding: 1.2rem 1.4rem;
        }
        .blog-card-body h2 {
          font-size: 1.25rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
          color: #f1f5f9;
        }
        .blog-card-excerpt {
          color: #94a3b8;
          font-size: 0.9rem;
          line-height: 1.55;
          margin-bottom: 0.75rem;
        }
        .blog-card-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        .blog-card-meta span {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        .blog-card-link {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.82rem;
          font-weight: 700;
          color: #8b5cf6;
        }
        .blog-card-skeleton {
          height: 200px;
          border-radius: 16px;
          background: rgba(255,255,255,0.04);
          animation: pulse 1.4s ease infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .blog-empty {
          text-align: center;
          padding: 3rem;
          color: #64748b;
        }
        @media (max-width: 640px) {
          .blog-container { padding-top: 6.5rem; }
          .blog-header h1 { font-size: 1.6rem; }
          .blog-card-body { padding: 0.9rem 1rem; }
          .blog-card-body h2 { font-size: 1.05rem; }
          .blog-card-cover { aspect-ratio: 16/9; }
        }
      `}</style>
    </div>
  );
}
