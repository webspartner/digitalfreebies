import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import LegalEmailReveal from './LegalEmailReveal';
import styles from './legal.module.css';

export const metadata: Metadata = {
  title: 'Legal & Takedowns — DigitalFreebies.io',
  description:
    'Independent directory disclosure, trademark & brand asset notice, and copyright or takedown request instructions for DigitalFreebies.io.',
  openGraph: {
    title: 'Legal & Takedowns — DigitalFreebies.io',
    description:
      'Learn about DigitalFreebies.io trademark attribution, non-affiliation policy, and how rights holders can submit copyright or takedown requests.',
  },
};

export default function LegalPage() {
  return (
    <>
      <Header />

      <main className={styles.legalPage}>
        <div className={styles.container}>
          <div className={styles.breadcrumb}>
            <Link href="/" className={styles.breadcrumbLink}>
              ← Back to Home
            </Link>
          </div>

          <article className={styles.legalCard}>
            <header className={styles.headerSection}>
              <span className={styles.badge}>Legal &amp; Compliance</span>
              <h1 className={styles.mainTitle}>Legal &amp; Takedowns</h1>
              <div className={styles.metaRow}>
                <span>Last Updated: November 23, 2026</span>
                <span>•</span>
                <span>DigitalFreebies.io</span>
              </div>
            </header>

            <div className={styles.content}>
              {/* 1. Independent Directory & Non-Affiliation Disclaimer */}
              <section id="non-affiliation">
                <h2>1. Independent Directory &amp; Non-Affiliation Disclaimer</h2>
                <p>
                  <strong>DigitalFreebies.io</strong> is an independent informational directory that curates and links to publicly available official promotions, free trials, student perks, and digital offers. We are not affiliated with, sponsored by, authorized by, or endorsed by any listed brand, merchant, or company.
                </p>
                <div className={styles.highlightBox}>
                  <strong>Important Notice:</strong> DigitalFreebies.io does not host, distribute, crack, or sell any third-party software, subscriptions, or digital services. Every listing directs visitors to the official third-party website. Visitors should always verify current offer eligibility, regional availability, and renewal terms directly on each brand&rsquo;s official Terms of Service before signing up.
                </div>
              </section>

              {/* 2. Trademarks & Brand Assets Notice */}
              <section id="trademarks">
                <h2>2. Trademarks &amp; Brand Assets Notice</h2>
                <p>
                  All product names, trademarks, service marks, trade names, logos, and brand imagery referenced or displayed on DigitalFreebies.io are the sole property of their respective owners.
                </p>
                <p>
                  Any use of third-party brand names or logos on this website is strictly for nominative identification purposes so visitors can recognize the official promotion being referenced, and does not imply any partnership, sponsorship, or endorsement by the trademark holder.
                </p>
              </section>

              {/* 3. Copyright, Trademark & Takedown Requests */}
              <section id="takedowns">
                <h2>3. Copyright, Trademark &amp; Takedown Requests</h2>
                <p>
                  We respect the intellectual property rights of all brands, publishers, and content owners. If you are a rights holder or authorized representative and would like an asset modified or a listing removed, please send us a request containing the following details:
                </p>
                <ul>
                  <li>
                    <strong>Page URL:</strong> The exact URL on DigitalFreebies.io where the content or asset appears.
                  </li>
                  <li>
                    <strong>Brand or Asset in Question:</strong> The specific trademark, logo, image, or offer description you own or represent.
                  </li>
                  <li>
                    <strong>Preferred Action:</strong> Specify whether you would like a <strong>logo/image replaced with plain text</strong> or the <strong>entire listing permanently removed</strong>.
                  </li>
                </ul>
                <p>
                  All valid copyright, trademark, and takedown requests are reviewed and processed promptly within <strong>24–48 hours</strong>.
                </p>

                <LegalEmailReveal />
              </section>
            </div>
          </article>
        </div>
      </main>

      <Footer hideNewsletter />
    </>
  );
}
