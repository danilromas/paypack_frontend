/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  basePath: '', 
  assetPrefix: '',
  trailingSlash: true,
}

export default nextConfig