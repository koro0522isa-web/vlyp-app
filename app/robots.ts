import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vlyp-app.vercel.app';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/studio/'], // 管理画面やAPIは検索に出さない
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
