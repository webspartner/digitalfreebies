import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import styles from './terms.module.css';

export const metadata: Metadata = {
  title: 'Terms of Service — DigitalFreebies.io',
  description:
    'Read the Terms of Service for DigitalFreebies.io. Learn about our content policies, affiliate disclosures, community forum rules, and our commitment to fix any mistakes immediately.',
  openGraph: {
    title: 'Terms of Service — DigitalFreebies.io',
    description:
      'DigitalFreebies.io Terms of Service. Covers freebie terms disclosure, affiliate commission notices, liability disclaimers, and our immediate correction policy.',
  },
};

export default function TermsOfServicePage() {
  return (
    <>
      <Header />

      <main className={styles.termsPage}>
        <div className={styles.container}>
          {/* Breadcrumb */}
          <div className={styles.breadcrumb}>
            <Link href="/" className={styles.breadcrumbLink}>
              ← Back to Home
            </Link>
          </div>

          <article className={styles.termsCard}>
            <header className={styles.headerSection}>
              <span className={styles.badge}>Legal &amp; Terms</span>
              <h1 className={styles.mainTitle}>Terms of Service</h1>
              <div className={styles.metaRow}>
                <span>Effective Date: October 6, 2026</span>
                <span>•</span>
                <span>Last Updated: October 2026</span>
                <span>•</span>
                <span>DigitalFreebies.io</span>
              </div>
            </header>

            {/* Immediate Correction Commitment Banner */}
            <div className={styles.actionBanner}>
              <div>
                <div className={styles.actionBannerTitle}>
                  Our Immediate Correction Commitment
                </div>
                <p className={styles.actionBannerText}>
                  We work hard to keep all deals accurate, safe, and up-to-date. If you ever spot an error, an expired link, or anything that violates terms or should not be on our site, please contact us at{' '}
                  <a
                    href="mailto:info@digitalfreebies.com"
                    style={{ color: '#15803d', fontWeight: 700, textDecoration: 'underline' }}
                  >
                    info@digitalfreebies.com
                  </a>
                  . <strong>We will review and fix or remove any mistake immediately.</strong>
                </p>
              </div>
            </div>

            {/* Quick Navigation */}
            <nav className={styles.quickNav} aria-label="Table of contents">
              <div className={styles.quickNavTitle}>Quick Navigation</div>
              <ul className={styles.quickNavList}>
                <li>
                  <a href="#acceptance" className={styles.quickNavLink}>
                    1. Acceptance of Terms
                  </a>
                </li>
                <li>
                  <a href="#nature-of-service" className={styles.quickNavLink}>
                    2. Nature of Service &amp; Freebie Terms
                  </a>
                </li>
                <li>
                  <a href="#affiliate-commission" className={styles.quickNavLink}>
                    3. Affiliate Commission Disclosure
                  </a>
                </li>
                <li>
                  <a href="#forbidden-content" className={styles.quickNavLink}>
                    4. Disclaimer on Forbidden Content
                  </a>
                </li>
                <li>
                  <a href="#mistakes-disclaimer" className={styles.quickNavLink}>
                    5. Disclaimer of Liability for Mistakes
                  </a>
                </li>
                <li>
                  <a href="#immediate-correction" className={styles.quickNavLink}>
                    6. Notice &amp; Immediate Takedown Policy
                  </a>
                </li>
                <li>
                  <a href="#community-forum" className={styles.quickNavLink}>
                    7. Community Forum &amp; User Conduct
                  </a>
                </li>
                <li>
                  <a href="#third-party-links" className={styles.quickNavLink}>
                    8. Outbound Merchant Deals
                  </a>
                </li>
                <li>
                  <a href="#intellectual-property" className={styles.quickNavLink}>
                    9. Intellectual Property, Design &amp; Content Protection
                  </a>
                </li>
                <li>
                  <a href="#contact" className={styles.quickNavLink}>
                    10. Contact for Corrections
                  </a>
                </li>
              </ul>
            </nav>

            <div className={styles.content}>
              {/* 1. Acceptance */}
              <section id="acceptance">
                <h2>1. Acceptance of Terms</h2>
                <p>
                  By accessing or using <strong>DigitalFreebies.io</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), whether as a casual visitor or as a registered community member, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please do not access or use our website.
                </p>
              </section>

              {/* 2. Nature of Service & Freebie Terms */}
              <section id="nature-of-service">
                <h2>2. Nature of Our Service &amp; Freebie Terms</h2>
                <p>
                  DigitalFreebies.io is an informational directory and community forum dedicated to sharing digital promotions, trial offers, student perks, and software discounts.
                </p>
                <div className={styles.highlightBox}>
                  <strong>Always Sharing Freebie Terms:</strong> We make every effort to always transparently share the terms, conditions, trial lengths, eligibility requirements, and cancellation policies associated with each freebie or promotion (e.g. &ldquo;new subscribers only&rdquo;, &ldquo;requires credit card&rdquo;, or &ldquo;cancels anytime before 30 days&rdquo;).
                </div>
                <p>
                  While we strive to disclose all terms clearly, external merchants and service providers retain the unilateral right to modify, terminate, or cancel their promotions at any time without prior notice to us. You should always verify the terms directly on the official merchant&rsquo;s page prior to redeeming any offer.
                </p>
              </section>

              {/* 3. Affiliate Commission */}
              <section id="affiliate-commission">
                <h2>3. Affiliate Commission Disclosure</h2>
                <p>
                  In accordance with consumer protection guidelines and the Federal Trade Commission (FTC) requirements:
                </p>
                <div className={styles.highlightBox}>
                  <strong>Affiliate Disclosure:</strong> Some of the links on DigitalFreebies.io are affiliate or referral links. This means that if you click on a deal and sign up, claim an offer, or make a purchase, we may receive a commission or referral credit from the merchant. This comes at <strong>no additional cost to you</strong> and helps us keep DigitalFreebies.io running, maintained, and spam-free for everyone.
                </div>
                <p>
                  Our editorial choices, community forum rankings, and upvote systems are driven by deal quality, community verification, and user value, not by affiliate relationships.
                </p>
              </section>

              {/* 4. Forbidden Content Disclaimer */}
              <section id="forbidden-content">
                <h2>4. Disclaimer of Responsibility for Forbidden Content</h2>
                <p>
                  We strictly prohibit any unlawful, illegal, forbidden, fraudulent, copyright-infringing, or malicious content on DigitalFreebies.io. However, as an open aggregation service that includes public user submissions:
                </p>
                <div className={styles.warningBox}>
                  <strong>No Responsibility for Forbidden Items:</strong> If, through human oversight, third-party syndication, or user-generated submissions, anything is placed or linked on our website that is forbidden, restricted by law, prohibited by third-party brand policies, or unauthorized, <strong>we do not accept or assume any responsibility or legal liability for such content</strong>.
                </div>
                <p>
                  We do not manufacture, host, or sell the underlying digital goods or services displayed. When you navigate to an external link, you do so entirely at your own discretion and risk.
                </p>
              </section>

              {/* 5. Mistakes Disclaimer */}
              <section id="mistakes-disclaimer">
                <h2>5. Disclaimer of Liability for Mistakes &amp; Inaccuracies</h2>
                <p>
                  While we work tirelessly to ensure the accuracy of all listings:
                </p>
                <ul>
                  <li>
                    <strong>No Liability for Errors:</strong> We do not take responsibility or legal liability if mistakes, typographical errors, outdated pricing, expired coupon codes, or inaccurate descriptions appear on our site.
                  </li>
                  <li>
                    <strong>&ldquo;As-Is&rdquo; Basis:</strong> All content, deals, freebies, software lists, and community posts are provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind, whether express or implied.
                  </li>
                  <li>
                    <strong>Third-Party Billing:</strong> We are never responsible if an external merchant charges your payment method after a free trial period expires, or if a merchant denies an offer or alters its eligibility rules.
                  </li>
                </ul>
              </section>

              {/* 6. Immediate Correction Policy */}
              <section id="immediate-correction">
                <h2>6. Notice &amp; Immediate Takedown / Correction Policy</h2>
                <p>
                  Our relationship with our community, visitors, and rights holders is founded on trust and rapid responsiveness:
                </p>
                <div className={styles.actionBanner}>
                  <div>
                    <div className={styles.actionBannerTitle}>
                      Immediate Resolution Guarantee
                    </div>
                    <p className={styles.actionBannerText}>
                      If we make a mistake, if an offer violates any rights, or if an item that is forbidden has been posted inadvertently: <strong>once contacted, we will immediately investigate and fix the mistake, correct inaccurate terms, or permanently remove the offending listing without delay.</strong>
                    </p>
                  </div>
                </div>
                <p>
                  To report any mistake, copyright concern, or forbidden link, please email our rapid response team at{' '}
                  <a
                    href="mailto:info@digitalfreebies.com"
                    style={{ color: 'var(--color-primary)', fontWeight: 700 }}
                  >
                    info@digitalfreebies.com
                  </a>{' '}
                  with the deal URL and a brief explanation. We prioritize these reports above all other inquiries.
                </p>
              </section>

              {/* 7. Community Forum */}
              <section id="community-forum">
                <h2>7. Community Forum &amp; User Conduct</h2>
                <p>
                  To protect our platform and community against spam and malicious links, all users must register an account to submit deals or leave comments. By posting on our forum, you agree to:
                </p>
                <ul>
                  <li>Only share legitimate, working, and lawful freebies and promotions.</li>
                  <li>Never submit malware, phishing links, warez, pirated content, or scam offers.</li>
                  <li>Refrain from spamming duplicate posts, automated bot traffic, or deceptive referral schemes.</li>
                  <li>Treat other community members with civility and respect.</li>
                </ul>
                <p>
                  We reserve the right to remove any submission or comment, suspend or terminate any user account, and take appropriate anti-spam measures at our sole discretion, without prior notice.
                </p>
              </section>

              {/* 8. Outbound Links */}
              <section id="third-party-links">
                <h2>8. Outbound Merchant Deals &amp; Third-Party Services</h2>
                <p>
                  DigitalFreebies.io contains links to websites operated by independent third parties. When you click an external link, you leave DigitalFreebies.io and become subject to the terms and privacy practices of that third-party platform. We do not endorse, guarantee, or assume responsibility for any products, services, or representations made by external providers.
                </p>
              </section>

              {/* 9. Intellectual Property, Design & Content Protection */}
              <section id="intellectual-property">
                <h2>9. Intellectual Property, Design &amp; Content Protection</h2>
                <p>
                  All elements of <strong>DigitalFreebies.io</strong> — including our website design, visual style, user interface (UI/UX), layout, custom graphics, branding, logos, source code, stylesheets, curated freebie descriptions, and original content — are the exclusive intellectual property of DigitalFreebies.io and are protected by applicable copyright, trademark, and intellectual property laws.
                </p>
                <div className={styles.warningBox}>
                  <strong>Strict Prohibition Against Copying or Theft:</strong> You may <strong>not</strong> copy, steal, clone, scrape, reproduce, republish, redistribute, mirror, or otherwise use our website design, visual style, layout, code, or content — in whole or in part — without our prior explicit written permission.
                </div>
                <ul>
                  <li>
                    <strong>Design &amp; Style Protection:</strong> Replicating, imitating, or redistributing our site&rsquo;s look and feel, card layouts, CSS styling, or page structures for any other website, application, or commercial project is strictly prohibited.
                  </li>
                  <li>
                    <strong>Content &amp; Data Scraping:</strong> Automated scraping, harvesting, bulk copying, or republishing of our curated freebie listings, descriptions, images, or community posts without written authorization is strictly forbidden.
                  </li>
                  <li>
                    <strong>Enforcement:</strong> Unauthorized use of our design, style, or content will result in immediate legal action, DMCA takedown notices to hosting providers and search engines, and pursuit of all available remedies under law.
                  </li>
                </ul>
              </section>

              {/* 10. Contact */}
              <section id="contact">
                <h2>10. Contact Us for Inquiries &amp; Corrections</h2>
                <p>
                  If you have questions regarding these Terms of Service or need to notify us of any error or forbidden content for immediate correction, please contact us:
                </p>
                <div className={styles.contactBox}>
                  <div className={styles.contactBoxTitle}>DigitalFreebies Legal &amp; Moderation Team</div>
                  <p className={styles.contactBoxText}>
                    <strong>Contact &amp; Immediate Corrections:</strong>{' '}
                    <a
                      href="mailto:info@digitalfreebies.com"
                      style={{ color: 'var(--color-primary)', fontWeight: 600 }}
                    >
                      info@digitalfreebies.com
                    </a>
                    <br />
                    <strong>Website:</strong> DigitalFreebies.io
                  </p>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '10px', marginBottom: 0 }}>
                    We monitor incoming reports continuously and will act immediately to rectify any verified errors.
                  </p>
                </div>
              </section>
            </div>
          </article>
        </div>
      </main>

      <Footer />
    </>
  );
}
