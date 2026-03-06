/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode for better development experience
  reactStrictMode: true,

  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Configure TypeScript strict checking
  typescript: {
    // Type errors will fail the build
    ignoreBuildErrors: false,
  },

  // Configure ESLint
  eslint: {
    // Lint errors will fail the build
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
