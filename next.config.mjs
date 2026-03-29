/** @type {import('next').NextConfig} */
function securityHeaders() {
  const headers = [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=()',
    },
    { key: 'X-DNS-Prefetch-Control', value: 'off' },
    { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  ];
  if (process.env.NODE_ENV === 'production') {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains; preload',
    });
  }
  return headers;
}

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    // U `next dev` ne dodajemo ove headere — na Windowsu + Next 14 ponekad kvare učitavanje statike (gol HTML).
    // Na Netlifyju je NODE_ENV=production, headere i dalje dobijaš.
    if (process.env.NODE_ENV !== 'production') {
      return [];
    }
    const h = securityHeaders();
    return [
      {
        // Bez _next (CSS/JS), /api/* (JSON), javnih fajlova
        source:
          '/((?!_next/|api/|images/|marketing/|favicon\\.ico$).*)',
        headers: h,
      },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev && process.env.WEBPACK_POLL === '1') {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? { exclude: ['error', 'warn'] }
        : false,
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
