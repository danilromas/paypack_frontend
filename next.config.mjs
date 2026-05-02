/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  basePath: '', 
  assetPrefix: '',           // ← меняем на пустую строку
  trailingSlash: true,
}

export default nextConfig