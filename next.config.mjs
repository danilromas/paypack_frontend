/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // /api/extension/download zips this folder at request time via fs, which the
  // file tracer can't see — without this it 404s in standalone/serverless builds.
  outputFileTracingIncludes: {
    '/api/extension/download': ['./extensions/paypack-marketplace/**/*'],
  },
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