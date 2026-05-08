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
    { url: `${baseUrl}/privacy`,     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/legal`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  const gameTagRoutes: MetadataRoute.Sitemap = GAME_TAGS.map(tag => ({
    url: `${baseUrl}/tag/${tag}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }));

  return [...staticRoute