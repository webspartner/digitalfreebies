import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import styles from './privacy.module.css';

export const metadata: Metadata = {
  title: 'Privacy Policy — DigitalFreebies.io',
  description:
    'Learn how DigitalFreebies.io collects, uses, and safeguards your data, including community forum contributions, Google Analytics, Facebook Pixel, and Microsoft Clarity.',
  openGraph: {
    title: 'Privacy Policy — DigitalFreebies.io',
    description:
      'Our commitment to your privacy. Explains our data collection, community forum information, analytics tracking, and user privacy rights.',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <Header />

      <main className={styles.privacyPage}>
        <div className={styles.container}>
          {/* Breadcrumb */}
          <div className={styles.breadcrumb}>
            <Link href="/" className={styles.breadcrumbLink}>
              ← Back to Home
            </Link>
          </div>

          <article className={styles.privacyCard}>
            <header className={styles.headerSection}>
              <span className={styles.badge}>Legal &amp; Privacy</span>
              <h1 className={styles.mainTitle}>Privacy Policy</h1>
              <div className={styles.metaRow}>
                <span>Effective Date: October 6, 2026</span>
                <span>•</span>
                <span>Last Updated: October 2026</span>
                <span>•</span>
                <span>DigitalFreebies.io</span>
              </div>
            </header>

            {/* Quick Navigation */}
            <nav className={styles.quickNav} aria-label="Table of contents">
              <div className={styles.quickNavTitle}>Quick Navigation</div>
              <ul className={styles.quickNavList}>
                <li>
                  <a href="#introduction" className={styles.quickNavLink}>
                    1. Introduction &amp; Overview
                  </a>
                </li>
                <li>
                  <a href="#forum-data" className={styles.quickNavLink}>
                    2. Community Forum &amp; Account Data
                  </a>
                </li>
                <li>
                  <a href="#analytics-tracking" className={styles.quickNavLink}>
                    3. Analytics &amp; Tracking Tools
                  </a>
                </li>
                <li>
                  <a href="#cookies" className={styles.quickNavLink}>
                    4. Cookies &amp; Storage Technologies
                  </a>
                </li>
                <li>
                  <a href="#how-we-use-data" className={styles.quickNavLink}>
                    5. How We Use Information
                  </a>
                </li>
                <li>
                  <a href="#third-party-links" className={styles.quickNavLink}>
                    6. Third-Party Links &amp; Offers
                  </a>
                </li>
                <li>
                  <a href="#security-retention" className={styles.quickNavLink}>
                    7. Data Security &amp; Retention
                  </a>
                </li>
                <li>
                  <a href="#your-rights" className={styles.quickNavLink}>
                    8. Your Rights &amp; Choices (GDPR/CCPA)
                  </a>
                </li>
                <li>
                  <a href="#contact" className={styles.quickNavLink}>
                    9. Contact &amp; Data Requests
                  </a>
                </li>
              </ul>
            </nav>

            <div className={styles.content}>
              {/* 1. Introduction */}
              <section id="introduction">
                <h2>1. Introduction &amp; Overview</h2>
                <p>
                  Welcome to <strong>DigitalFreebies.io</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). We are dedicated to helping our visitors discover and claim legitimate digital promotions, free trials, software discounts, and community-shared deals.
                </p>
                <p>
                  This Privacy Policy outlines the types of personal and behavioral information we collect when you visit our website, register for an account, interact with our community forum, or use our services, as well as how we store, protect, and share that data.
                </p>
                <div className={styles.highlightBox}>
                  <strong>Key Takeaway:</strong> We respect your privacy. We only collect the necessary information required to operate our platform, facilitate community discussion, protect our users from spam and abuse, and analyze aggregate traffic trends. We do not sell your personal data to third parties.
                </div>
              </section>

              {/* 2. Forum Data */}
              <section id="forum-data">
                <h2>2. Community Forum &amp; User Account Information</h2>
                <p>
                  To foster an authentic, helpful environment and combat automated bots, link spam, and deceptive submissions, DigitalFreebies.io requires community members to register an account before submitting new freebies or leaving comments.
                </p>
                <h3>A. Account Registration Information</h3>
                <p>When you create an account on our forum, we collect:</p>
                <ul>
                  <li>
                    <strong>Username:</strong> A public display name of your choice, visible next to your posted freebies, comments, and upvotes.
                  </li>
                  <li>
                    <strong>Email Address:</strong> Used for account recovery, authentication verification, and administrative communications. Your email address is never made public.
                  </li>
                  <li>
                    <strong>Password:</strong> Securely stored using industry-standard salted cryptographic hashing (bcrypt). We never store or have access to your plaintext password.
                  </li>
                </ul>

                <h3>B. Forum Submissions &amp; Activity</h3>
                <p>When you participate in our community, we collect and publicly display:</p>
                <ul>
                  <li>
                    <strong>Deal Submissions:</strong> Deal title, target URL, brand name, category, instructions, and description submitted by you.
                  </li>
                  <li>
                    <strong>Comments &amp; Feedback:</strong> Discussion messages, tips, and verification reports you post under deals.
                  </li>
                  <li>
                    <strong>Upvotes &amp; Interactions:</strong> Upvote records and deal engagement metrics used to rank trending freebies.
                  </li>
                </ul>

                <h3>C. Anti-Spam &amp; Moderation Telemetry</h3>
                <p>
                  To safeguard the community against spam campaigns, phishing links, and abuse, we collect connection timestamps, rate-limiting counters, and IP addresses. These logs are strictly utilized for moderation, fraud prevention, and enforcing our terms of service.
                </p>
              </section>

              {/* 3. Analytics & Tracking */}
              <section id="analytics-tracking">
                <h2>3. Analytics, Tracking &amp; Advertising Technologies</h2>
                <p>
                  We utilize third-party analytics and optimization services to measure website traffic, understand user behavior, diagnose technical issues, and improve our deal recommendation engine.
                </p>

                <div className={styles.toolCardGrid}>
                  {/* Google Analytics */}
                  <div className={styles.toolCard}>
                    <div className={styles.toolCardHeader}>
                      <div>
                        <div className={styles.toolCardTitle}>Google Analytics (GA4)</div>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Google LLC</span>
                      </div>
                    </div>
                    <p className={styles.toolCardDesc}>
                      Measures page views, session durations, device and browser types, referral sources, and approximate geographical location (country/city level). IP masking is enabled.
                    </p>
                  </div>

                  {/* Facebook Pixel */}
                  <div className={styles.toolCard}>
                    <div className={styles.toolCardHeader}>
                      <div>
                        <div className={styles.toolCardTitle}>Facebook Pixel (Meta Pixel)</div>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Meta Platforms, Inc.</span>
                      </div>
                    </div>
                    <p className={styles.toolCardDesc}>
                      Tracks conversions, ad campaign effectiveness, and user interactions with digital offers to deliver relevant promotions and community announcements across Meta services.
                    </p>
                  </div>

                  {/* Microsoft Clarity */}
                  <div className={styles.toolCard}>
                    <div className={styles.toolCardHeader}>
                      <div>
                        <div className={styles.toolCardTitle}>Microsoft Clarity (&ldquo;Clarify&rdquo;)</div>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Microsoft Corporation</span>
                      </div>
                    </div>
                    <p className={styles.toolCardDesc}>
                      Captures behavioral metrics, heatmaps, scroll depth, and anonymous session replays to identify broken links, navigation hurdles, and layout bugs. Form inputs and personal identifiers are masked.
                    </p>
                  </div>
                </div>

                <h3>How These Tools Process Data</h3>
                <ul>
                  <li>
                    <strong>Google Analytics:</strong> Provides aggregated statistical insights into which categories (such as streaming or VPNs) are most popular. You can opt out using the{' '}
                    <a
                      href="https://tools.google.com/dlpage/gaoptout"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      Google Analytics Opt-out Browser Add-on
                    </a>.
                  </li>
                  <li>
                    <strong>Facebook Pixel:</strong> Enables us to analyze how users navigate our site after clicking on social media promotions. You can customize your ad settings in your{' '}
                    <a
                      href="https://www.facebook.com/adpreferences"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      Facebook Ad Preferences
                    </a>.
                  </li>
                  <li>
                    <strong>Microsoft Clarity:</strong> Helps us see where users click or encounter errors so we can refine mobile usability and fix non-responsive UI elements. More details can be found in the{' '}
                    <a
                      href="https://privacy.microsoft.com/privacystatement"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      Microsoft Privacy Statement
                    </a>.
                  </li>
                </ul>
              </section>

              {/* 4. Cookies */}
              <section id="cookies">
                <h2>4. Cookies &amp; Local Storage</h2>
                <p>
                  Cookies are small text files placed on your device to ensure website functionality, retain preferences, and support analytics. We utilize the following categories of cookies:
                </p>
                <ul>
                  <li>
                    <strong>Essential / Authentication Cookies:</strong> Includes our secure session cookie (<code>forum_token</code>) which keeps you logged in to your forum account as you browse between pages.
                  </li>
                  <li>
                    <strong>Preference Cookies:</strong> Remembers your chosen regional filter (e.g., Global, North America, UK, Europe) and UI settings across visits.
                  </li>
                  <li>
                    <strong>Analytics &amp; Performance Cookies:</strong> Set by Google Analytics (<code>_ga</code>, <code>_gid</code>) and Microsoft Clarity (<code>_clck</code>, <code>_clsk</code>) to record anonymized browsing behavior.
                  </li>
                  <li>
                    <strong>Marketing &amp; Retargeting Cookies:</strong> Set by Facebook Pixel (<code>_fbp</code>) to optimize marketing campaigns and track conversions.
                  </li>
                </ul>
                <p>
                  You can configure your browser to reject cookies or notify you when a cookie is placed. However, disabling essential cookies may impact your ability to log in or post in the community forum.
                </p>
              </section>

              {/* 5. How We Use Data */}
              <section id="how-we-use-data">
                <h2>5. How We Use Your Information</h2>
                <p>We process the information collected for legitimate operational purposes:</p>
                <ul>
                  <li>To provide, manage, and enhance DigitalFreebies.io and its directory of offers.</li>
                  <li>To verify, approve, and display community-submitted deals and comments.</li>
                  <li>To prevent fraud, automated bot registrations, expired link spam, and abusive conduct.</li>
                  <li>To personalize your experience and show freebies relevant to your selected region.</li>
                  <li>To evaluate website speed, navigation workflows, and device compatibility.</li>
                  <li>To address your questions, feedback, or content moderation inquiries.</li>
                </ul>
              </section>

              {/* 6. Third-Party Links */}
              <section id="third-party-links">
                <h2>6. Outbound Links &amp; Third-Party Merchant Deals</h2>
                <p>
                  DigitalFreebies.io aggregates digital offers and contains outbound links to third-party services (e.g., Spotify, NordVPN, Apple, Amazon, GitHub, Canva, etc.).
                </p>
                <div className={styles.highlightBox}>
                  <strong>External Site Notice:</strong> When you click on &ldquo;Go to Offer&rdquo; or any outbound deal link, you leave DigitalFreebies.io. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party websites or services. We encourage you to review the privacy policies of any merchant website you visit.
                </div>
                <p>
                  Some outbound links may be affiliate links. If you sign up or redeem an offer through these links, we may earn a small referral commission at no additional cost to you.
                </p>
              </section>

              {/* 7. Security & Retention */}
              <section id="security-retention">
                <h2>7. Data Security &amp; Retention</h2>
                <p>
                  We implement robust technical and organizational security measures to protect your personal data:
                </p>
                <ul>
                  <li>
                    <strong>Encryption:</strong> All communication between your browser and our servers is secured using HTTPS/TLS encryption.
                  </li>
                  <li>
                    <strong>Password Protection:</strong> Passwords are cryptographically salted and hashed using bcrypt before storage.
                  </li>
                  <li>
                    <strong>Tokenized Access:</strong> Sessions are authenticated using signed JSON Web Tokens (JWT) stored in HTTP-only, secure cookies.
                  </li>
                </ul>
                <p>
                  We retain forum account data as long as your account remains active. If you request account deletion, your personal credentials will be purged, and public posts/comments can be anonymized upon request.
                </p>
              </section>

              {/* 8. Your Rights */}
              <section id="your-rights">
                <h2>8. Your Rights &amp; Choices (GDPR, UK DPA &amp; CCPA/CPRA)</h2>
                <p>
                  Depending on your jurisdiction (such as the European Economic Area, United Kingdom, or California), you may have certain rights regarding your personal information:
                </p>
                <ul>
                  <li>
                    <strong>Right of Access:</strong> You can request a copy of the personal data we hold about you.
                  </li>
                  <li>
                    <strong>Right to Rectification:</strong> You can update or correct inaccuracies in your account details.
                  </li>
                  <li>
                    <strong>Right to Erasure (&ldquo;Right to be Forgotten&rdquo;):</strong> You can request the permanent deletion of your forum account and associated personal data.
                  </li>
                  <li>
                    <strong>Right to Restrict or Object to Processing:</strong> You may object to certain forms of data analysis or targeted marketing.
                  </li>
                  <li>
                    <strong>Right to Data Portability:</strong> You can request your data in a structured, commonly used format.
                  </li>
                  <li>
                    <strong>Non-Discrimination:</strong> We will never discriminate against you for exercising any of your privacy rights.
                  </li>
                </ul>
              </section>

              {/* 9. Contact */}
              <section id="contact">
                <h2>9. Contact Us &amp; Privacy Requests</h2>
                <p>
                  If you have any questions about this Privacy Policy, wish to exercise your data rights, or need assistance deleting your forum account or submissions, please contact our privacy team:
                </p>
                <div className={styles.contactBox}>
                  <div className={styles.contactBoxTitle}>Privacy &amp; Data Protection Officer</div>
                  <p className={styles.contactBoxText}>
                    <strong>DigitalFreebies.io</strong>
                    <br />
                    Email:{' '}
                    <a
                      href="mailto:info@digitalfreebies.com"
                      style={{ color: 'var(--color-primary)', fontWeight: 600 }}
                    >
                      info@digitalfreebies.com
                    </a>
                  </p>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '10px', marginBottom: 0 }}>
                    We aim to respond to all legitimate requests within 30 days.
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
