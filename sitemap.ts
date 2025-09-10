import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const now = new Date().toISOString();
  const paths = ['/', '/boka', '/om-oss', '/villkor', '/sa-funkar-det', '/tjanster', '/kontakt', '/faq'];
  return paths.map((p) => ({ url: `${base}${p}`, lastModified: now, changeFrequency: 'weekly', priority: p === '/' ? 1 : 0.6 }));
}


