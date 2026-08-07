// Stub for the `server-only` guard package: it throws when resolved outside of
// Next.js's server compilation pipeline (see next.config for the real guard),
// which breaks plain Node/Vite test runs. vitest.config.ts aliases "server-only"
// to this no-op so unit tests can still import server-only lib files directly.
export {}
