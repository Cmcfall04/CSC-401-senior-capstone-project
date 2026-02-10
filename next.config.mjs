/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.spoonacular.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;