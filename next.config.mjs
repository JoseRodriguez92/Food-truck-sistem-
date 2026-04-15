/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    typescript: { ignoreBuildErrors: true },
    eslint: { ignoreDuringBuilds: true },
    output: "standalone",
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
