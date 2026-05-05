import { MetadataRoute } from 'next';

const GAME_TAGS = ['valorant', 'apex', 'fortnite', 'minecraft', 'cod', 'overwatch', 'lol', 'genshin', 'pubg', 'r6'];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vlyp.app';

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl,                  lastModified: new Date(), changeFrequency: 'daily',   priority: 1   },
    { url: `${baseUrl}/search`,      lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${baseUrl}/leaderboard`, lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: `${baseUrl}/login`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/terms`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },