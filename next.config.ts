import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co', // 自分のSupabaseストレージ用
      },
    ],
  },
  async headers() {
    return [];
  },
};

export default nextConfig;
