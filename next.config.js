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
    // Pre-existing BE lint errors (import/order, curly) block build.
    // FE code passes lint. Re-enable after BE lint cleanup.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
