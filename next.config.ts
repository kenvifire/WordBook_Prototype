import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // pdfjs-dist's Node build dynamically imports its own worker script
  // relative to itself at runtime; webpack rewrites that import to a path
  // inside .next/server where the worker file was never emitted, breaking
  // PDF parsing in production ("Cannot find module '.../pdf.worker.mjs'").
  // Excluding it from the server bundle lets Node resolve it straight from
  // node_modules instead, the same way it already works under `npm test`.
  serverExternalPackages: ['pdfjs-dist'],
};

export default nextConfig;
