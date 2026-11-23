import type { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';
import { getPopularBrands } from '@/lib/brands';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://digitalfreebies.io';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, offers, forumPosts, brands] = await Promise.all([
    prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { slug: true, updatedAt: true },
    }),
    prisma.offer.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
      select: { slug: true, updatedAt: true, isFeatured: true },
    }),
    prisma.forumPost.findMany({
      where: { status: 'approved' },
      orderBy: { updatedAt: 'desc' },
      select: { slug: true, updatedAt: true },
    }),
    getPopularBrands(100),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/freebies`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/forum`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/sitemap`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/legal`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/terms-of-service`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/disclaimer`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${BASE_URL}/category/${cat.slug}`,
    lastModified: cat.updatedAt,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const brandRoutes: MetadataRoute.Sitemap = brands.map((brand) => ({
    url: `${BASE_URL}/brand/${brand.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  const offerRoutes: MetadataRoute.Sitemap = offers.map((offer) => ({
    url: `${BASE_URL}/${offer.slug}`,
    lastModified: offer.updatedAt,
    changeFrequency: 'daily',
    priority: offer.isFeatured ? 0.9 : 0.8,
  }));

  const forumRoutes: MetadataRoute.Sitemap = forumPosts.map((post) => ({
    url: `${BASE_URL}/forum/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...categoryRoutes, ...brandRoutes, ...offerRoutes, ...forumRoutes];
}
