/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ lets Vercel deploy even if lint errors
  },
};

export default nextConfig;