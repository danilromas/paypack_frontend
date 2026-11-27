/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Nobody may frame PayPack pages — the checkout and "Pay into escrow" buttons are clickjacking targets.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
]

const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },

  basePath: '',
  assetPrefix: '',
  trailingSlash: true,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
}

export default nextConfig
