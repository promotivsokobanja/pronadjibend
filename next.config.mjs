/** @type {import('next').NextConfig} */
// Globalni security headere kroz next.config.headers() su uklonjeni: regex isključenja za `/_next/*`
// na Netlify/CDN je često nepouzdan → CSS/JS se ne učitaju (stranica kao „goli“ HTML). Po potrebi: Netlify _headers.

const nextConfig = {
  poweredByHeader: false,
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
