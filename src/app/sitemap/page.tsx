import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import prisma from '@/lib/prisma';
import styles from './sitemap.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sitemap — DigitalFreebies.io',
  description:
    'Complete directory of all digital freebies, categories, special collections, community forum deals, and pages on DigitalFreebies.io.',
};

const MAIN_PAGES = [
  { label: 'Home', href: '/' },
  { label: 'Search Digital Offers', href: '/search' },
  { label: 'Community Forum', href: '/forum' },
  { label: 'Submit a Community Deal', href: '/forum/new' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms of Service', href: '/terms-of-service' },
  { label: 'Disclaimer', href: '/disclaimer' },
  { label: 'XML Sitemap', href: '/sitemap.xml' },
];

export default async function SitemapPage() {
  const [categories, offers, forumPosts] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.offer.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.forumPost.findMany({
      where: { status: 'approved' },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const standardCategories = categories.filter((c) => c.type !== 'special');
  const specialCategories = categories.filter((c) => c.type === 'special');

  // Group active offers by category
  const offersByCategory = offers.reduce<Record<string, typeof offers>>((acc, offer) => {
    const key = offer.category.toLowerCase();
    if (!acc[key]) acc[key] = [];
    acc[key].push(offer);
    return acc;
  }, {});

  const categoryKeys = Object.keys(offersByCategory).sort();

  return (
    <>
      <Header />

      <main className={styles.sitemapPage}>
        <div className={styles.container}>
          <div className={styles.breadcrumb}>
            <Link href="/" className={styles.breadcrumbLink}>
              ← Back to Home
            </Link>
          </div>

          {/* Hero Card */}
          <div className={styles.heroCard}>
            <div className={styles.heroLeft}>
              <span className={styles.badge}>Site Directory</span>
              <h1 className={styles.mainTitle}>Sitemap</h1>
              <p className={styles.subtitle}>
                Automatically updated directory of all pages, categories, verified digital offers, and community forum deals on DigitalFreebies.io.
              </p>
            </div>

            <div className={styles.statsRow}>
              <div className={styles.statBox}>
                <span className={styles.statNum}>{offers.length}</span>
                <span className={styles.statLabel}>Active Offers</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statNum}>{categories.length}</span>
                <span className={styles.statLabel}>Categories</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statNum}>{forumPosts.length}</span>
                <span className={styles.statLabel}>Forum Deals</span>
              </div>
              <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className={styles.xmlBtn}>
                XML Sitemap →
              </a>
            </div>
          </div>

          {/* Top Grid: Main Pages, Standard Categories, Special Categories */}
          <div className={styles.topGrid}>
            {/* Main Pages */}
            <section className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Main Pages</h2>
                <span className={styles.countBadge}>{MAIN_PAGES.length}</span>
              </div>
              <ul className={styles.linkList}>
                {MAIN_PAGES.map((page) => (
                  <li key={page.href} className={styles.linkItem}>
                    <Link href={page.href} className={styles.sitemapLink}>
                      <span className={styles.linkArrow}>→</span>
                      {page.label}
                    </Link>
                    <span className={styles.linkPath}>{page.href}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Standard Categories */}
            <section className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Categories</h2>
                <span className={styles.countBadge}>{standardCategories.length}</span>
              </div>
              <ul className={styles.linkList}>
                {standardCategories.map((cat) => (
                  <li key={cat.id} className={styles.linkItem}>
                    <Link href={`/category/${cat.slug}`} className={styles.sitemapLink}>
                      <span className={styles.linkArrow}>→</span>
                      {cat.name}
                    </Link>
                    <span className={styles.linkPath}>/category/{cat.slug}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Special Categories */}
            {specialCategories.length > 0 && (
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Special Collections</h2>
                  <span className={styles.countBadge}>{specialCategories.length}</span>
                </div>
                <ul className={styles.linkList}>
                  {specialCategories.map((cat) => (
                    <li key={cat.id} className={styles.linkItem}>
                      <Link href={`/category/${cat.slug}`} className={styles.sitemapLink}>
                        <span className={styles.linkArrow}>→</span>
                        {cat.name}
                      </Link>
                      <span className={styles.linkPath}>/category/{cat.slug}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* All Active Offers Grouped by Category */}
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>All Digital Freebies &amp; Offers</h2>
              <span className={styles.countBadge}>{offers.length} Active</span>
            </div>

            {categoryKeys.length === 0 ? (
              <p className={styles.subtitle}>No active offers available right now.</p>
            ) : (
              <div className={styles.categoryGroupsGrid}>
                {categoryKeys.map((catKey) => {
                  const catOffers = offersByCategory[catKey];
                  return (
                    <div key={catKey} className={styles.categoryGroup}>
                      <div className={styles.categoryGroupHeader}>
                        <Link href={`/category/${catKey}`} className={styles.categoryGroupTitle}>
                          {catKey}
                        </Link>
                        <span className={styles.countBadge}>{catOffers.length}</span>
                      </div>
                      <ul className={styles.offerList}>
                        {catOffers.map((offer) => (
                          <li key={offer.id} className={styles.offerItem}>
                            <span className={styles.offerBrand}>{offer.brand}</span>
                            <Link href={`/${offer.slug}`} className={styles.offerLink}>
                              {offer.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Approved Community Forum Posts */}
          {forumPosts.length > 0 && (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Community Forum Deals</h2>
                <span className={styles.countBadge}>{forumPosts.length}</span>
              </div>
              <ul className={styles.forumGrid}>
                {forumPosts.map((post) => (
                  <li key={post.id} className={styles.forumItem}>
                    {post.brand && <span className={styles.offerBrand}>{post.brand}</span>}
                    <div>
                      <Link href={`/forum/${post.slug}`} className={styles.offerLink}>
                        {post.title}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
