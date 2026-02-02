/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true, // For static export
  },
  skipTrailingSlashRedirect: true,
  distDir: 'out',
  webpack: (config, { isServer }) => {
    // Handle Node.js modules used in server components
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // These modules are only used server-side
        net: false,
        tls: false,
        dns: false,
        fs: false,
        path: false,
      };
    }
    
    return config;
  },
};
module.exports = nextConfig;
