import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import styles from './disclaimer.module.css';

export const metadata: Metadata = {
  title: 'Disclaimer — DigitalFreebies.io',
  description:
    'Read the official Disclaimer for DigitalFreebies.io. Important notices regarding free trials, third-party promotions, affiliate disclosures, and our immediate correction policy.',
  openGraph: {
    title: 'Disclaimer — DigitalFreebies.io',
    description:
      'Official Disclaimer covering third-party freebie links, auto-renewal notices, affiliate commissions, and our commitment to fix any mistakes immediately.',
  },
};

export default function DisclaimerPage() {
  return (
    <>
      <Header />

      <main className={styles.disclaimerPage}>
        <div className={styles.container}>
          {/* Breadcrumb */}
          <div className={styles.breadcrumb}>
            <Link href="/" className={styles.breadcrumbLink}>
              ← Back to Home
            </Link>
          </div>

          <article className={styles.disclaimerCard}>
            <header className={styles.headerSection}>
              <span className={styles.badge}>Notice &amp; Disclaimers</span>
              <h1 className={styles.mainTitle}>Website Disclaimer</h1>
              <div className={styles.metaRow}>
                <span>Effective Date: October 6, 2026</span>
                <span>•</span>
                <span>Last Updated: October 2026</span>
                <span>•</span>
                <span>DigitalFreebies.io</span>
              </div>
            </header>

            {/* Notice Callout */}
            <div className={styles.noticeCallout}>
              <div>
                <div className={styles.noticeTitle}>
                  Important Consumer &amp; Promotional Notice
                </div>
                <p className={styles.noticeText}>
                  DigitalFreebies.io is an independent promotional directory. We do not provide, sell, or bill for the external services listed on our site. Free trials often automatically renew into paid plans unless canceled before the trial period concludes. Always verify terms directly on the official merchant&rsquo;s website before entering payment details.
                </p>
              </div>
            </div>

            {/* Quick Navigation */}
            <nav className={styles.quickNav} aria-label="Table of contents">
              <div className={styles.quickNavTitle}>Quick Navigation</div>
              <ul className={styles.quickNavList}>
                <li>
                  <a href="#general" className={styles.quickNavLink}>
                    1. General Information Disclaimer
                  </a>
                </li>
                <li>
                  <a href="#free-trials" className={styles.quickNavLink}>
                    2. Free Trials &amp; Auto-Renewals
                  </a>
                </li>
                <li>
                  <a href="#third-party-links" className={styles.quickNavLink}>
                    3. Third-Party Links &amp; Merchants
                  </a>
                </li>
                <li>
                  <a href="#affiliate-disclosure" className={styles.quickNavLink}>
                    4. Affiliate Disclosure (FTC)
                  </a>
                </li>
                <li>
                  <a href="#pricing-expiration" className={styles.quickNavLink}>
                    5. Availability &amp; Expired Deals
                  </a>
                </li>
                <li>
                  <a href="#community-forum" className={styles.quickNavLink}>
                    6. Community Forum &amp; User Deals
                  </a>
                </li>
                <li>
                  <a href="#immediate-correction" className={styles.quickNavLink}>
                    7. Immediate Correction Policy
                  </a>
                </li>
                <li>
                  <a href="#limitation-liability" className={styles.quickNavLink}>
                    8. Limitation of Liability
                  </a>
                </li>
                <li>
                  <a href="#contact" className={styles.quickNavLink}>
                    9. Contact &amp; Corrections
                  </a>
                </li>
              </ul>
            </nav>

            <div className={styles.content}>
              {/* Highlights Grid */}
              <div className={styles.disclaimerGrid}>
                <div className={styles.disclaimerCardItem}>
                  <div className={styles.disclaimerCardItemTitle}>Informational Directory</div>
                  <p className={styles.disclaimerCardItemText}>
                    All deals and freebies are curated for informational purposes. We do not guarantee offer approval by merchants.
                  </p>
                </div>

                <div className={styles.disclaimerCardItem}>
                  <div className={styles.disclaimerCardItemTitle}>Cancel Before Trial Ends</div>
                  <p className={styles.disclaimerCardItemText}>
                    Remember to set a reminder and cancel free trials in your merchant account if you do not wish to be billed.
                  </p>
                </div>

                <div className={styles.disclaimerCardItem}>
                  <div className={styles.disclaimerCardItemTitle}>Fast Error Corrections</div>
                  <p className={styles.disclaimerCardItemText}>
                    If we make any mistake or list an invalid promo, we will fix or take down the offer immediately once reported.
                  </p>
                </div>
              </div>

              {/* 1. General */}
              <section id="general">
                <h2>1. General Information Disclaimer</h2>
                <p>
                  The information provided by <strong>DigitalFreebies.io</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) on our website is for general informational and discovery purposes only. All information is provided in good faith; however, we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any promotion, discount, coupon code, or freebie listed.
                </p>
                <div className={styles.highlightBox}>
                  <strong>No Professional or Legal Advice:</strong> DigitalFreebies.io is an aggregator of digital offers. Nothing on this website constitutes legal, financial, cybersecurity, or contractual advice. Your choice to sign up for any software, VPN, subscription, or trial is solely your responsibility.
                </div>
              </section>

              {/* 2. Free Trials */}
              <section id="free-trials">
                <h2>2. Free Trials, Payment Methods &amp; Auto-Renewal Disclaimer</h2>
                <p>
                  Many of the digital deals highlighted on DigitalFreebies.io (such as streaming platforms, cloud storage, music apps, and VPN services) are structured as <strong>Free Trials</strong>:
                </p>
                <ul>
                  <li>
                    <strong>Payment Information Required:</strong> Most service providers require users to submit valid credit card, debit card, or PayPal details to initiate a free trial period.
                  </li>
                  <li>
                    <strong>Automatic Billing / Subscriptions:</strong> Unless explicitly noted as a non-renewing freebie, trials generally convert into paid recurring subscriptions automatically once the trial duration finishes.
                  </li>
                  <li>
                    <strong>User Responsibility to Cancel:</strong> You are solely responsible for managing your subscriptions and canceling before the trial concludes if you do not wish to continue as a paying subscriber.
                  </li>
                  <li>
                    <strong>No Liability for Charges:</strong> DigitalFreebies.io does not process payments, handle subscriptions, or have access to merchant accounts. We are not liable or responsible for any charges, recurring fees, overdraft fees, or refund disputes resulting from third-party services.
                  </li>
                </ul>
              </section>

              {/* 3. Third-Party Links */}
              <section id="third-party-links">
                <h2>3. Third-Party Merchants, Trademarks &amp; External Links Disclaimer</h2>
                <div className={styles.highlightBox}>
                  <strong>Trademark &amp; Non-Affiliation Disclaimer:</strong> All product names, logos, and brands are property of their respective owners and are used for identification purposes only. This site is independent and not affiliated with or endorsed by any listed company.
                </div>
                <p>
                  DigitalFreebies.io contains outbound links to external websites that are not provided, maintained, or in any way affiliated with us. When you click &ldquo;Go to Offer&rdquo; or any deal button, you leave DigitalFreebies.io and enter a third-party website.
                </p>
                <p>
                  Please note that we do not guarantee the accuracy, relevance, timeliness, security, or completeness of any information on external websites. We do not warrant the quality, safety, or legality of items offered by external brands, nor do we assume responsibility for any loss or damage incurred as a result of using third-party services.
                </p>
              </section>

              {/* 4. Affiliate Disclosure */}
              <section id="affiliate-disclosure">
                <h2>4. Affiliate &amp; Advertising Disclosure (FTC Compliance)</h2>
                <p>
                  In accordance with the Federal Trade Commission (FTC) guidelines, please be advised that DigitalFreebies.io may participate in various affiliate marketing programs.
                </p>
                <div className={styles.highlightBox}>
                  <strong>How Commissions Work:</strong> When you click on certain deal links and complete a registration, trial activation, or purchase, DigitalFreebies.io may receive a referral commission or compensation from the merchant. This occurs at <strong>no additional cost to you</strong>.
                </div>
                <p>
                  Our goal is to highlight genuine, working promotions. Deal listings, community upvotes, and editorial reviews are curated based on authentic value to users, not solely by commercial partnerships.
                </p>
              </section>

              {/* 5. Pricing & Expiration */}
              <section id="pricing-expiration">
                <h2>5. Deal Availability, Expiration Dates &amp; Pricing Changes</h2>
                <p>
                  Digital deals, trial offers, and promo codes are subject to rapid change. Merchants frequently:
                </p>
                <ul>
                  <li>End promotions earlier than originally scheduled.</li>
                  <li>Limit redemption quotas to specific countries or new accounts only.</li>
                  <li>Alter promotional codes, subscription terms, or trial durations without prior notice.</li>
                </ul>
                <p>
                  While our moderators and automated monitors verify offers daily, we cannot guarantee that every listed freebie will remain active or redeemable at the time you view it.
                </p>
              </section>

              {/* 6. Community Forum */}
              <section id="community-forum">
                <h2>6. Community Forum &amp; User-Generated Content Disclaimer</h2>
                <p>
                  DigitalFreebies.io features a community forum where registered members can share digital promotions and leave comments.
                </p>
                <ul>
                  <li>
                    <strong>User Opinions:</strong> Submissions, reviews, and comments posted on our forum reflect the personal experiences and views of their respective authors and do not represent the views or endorsement of DigitalFreebies.io.
                  </li>
                  <li>
                    <strong>User Verifications:</strong> While we employ anti-spam protections and review community submissions, we cannot guarantee the reliability or safety of external links posted by community members. Users should exercise caution when visiting unfamiliar websites.
                  </li>
                </ul>
              </section>

              {/* 7. Immediate Correction */}
              <section id="immediate-correction">
                <h2>7. Immediate Correction &amp; Notice-and-Takedown Policy</h2>
                <p>
                  We are committed to operating an honest, transparent, and error-free directory. In the event that:
                </p>
                <ul>
                  <li>A listing contains typographical mistakes, incorrect instructions, or outdated terms;</li>
                  <li>A promotion is reported as expired, misleading, or non-functional;</li>
                  <li>A link violates trademark, copyright, or third-party merchant rules;</li>
                </ul>
                <p>
                  <strong>Once contacted, we will immediately review and correct the mistake, update the terms, or permanently take down the offending post without hesitation.</strong>
                </p>
              </section>

              {/* 8. Limitation of Liability */}
              <section id="limitation-liability">
                <h2>8. Limitation of Liability</h2>
                <p>
                  Under no circumstance shall DigitalFreebies.io, its owners, operators, partners, or contributors be held liable for any direct, indirect, incidental, consequential, special, or exemplary damages arising out of or in connection with your access to, or inability to access or use, our website or any third-party offers linked from our platform.
                </p>
              </section>

              {/* 9. Contact */}
              <section id="contact">
                <h2>9. Contact Us for Inquiries &amp; Corrections</h2>
                <p>
                  If you spot an error, have a question regarding any listed offer, or need to request the immediate removal or correction of any content, please contact our team:
                </p>
                <div className={styles.contactBox}>
                  <div className={styles.contactBoxTitle}>DigitalFreebies Correction &amp; Inquiries Team</div>
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
                    We treat all correction requests with immediate priority and aim to resolve them within hours.
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
