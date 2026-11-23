import Link from 'next/link';
import Image from 'next/image';
import Newsletter from '@/components/Newsletter/Newsletter';
import CookieBanner from '@/components/CookieBanner/CookieBanner';
import styles from './Footer.module.css';

interface FooterProps {
  hideNewsletter?: boolean;
}

export default function Footer({ hideNewsletter = false }: FooterProps) {
  return (
    <>
      {!hideNewsletter && <Newsletter noBottomMargin />}
      <CookieBanner />
      <footer className={styles.footer}>
      <div className={styles.footerContent}>
        {/* Brand column */}
        <div className={styles.footerBrand}>
          <div className={styles.footerLogo}>
            <Image 
              src="/images/assets/logo_white.png" 
              alt="DigitalFreebies.io" 
              width={160} 
              height={40} 
              style={{ width: '160px', height: 'auto', objectFit: 'contain' }}
            />
          </div>
          <p className={styles.footerDescription}>
            Your go-to platform for discovering the best free digital offers, trials, and
            promotions. We curate and verify deals so you never miss out.
          </p>
          <div className={styles.footerSocials}>
            <a
              href="https://www.tiktok.com/@digitalfreebies"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
              aria-label="TikTok"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
              </svg>
            </a>
            <a
              href="https://x.com/digitalfreebie_"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
              aria-label="X"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a
              href="https://instagram.com/digitalfreebies.io"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
              aria-label="Instagram"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
          </div>
          <p className={styles.footerDisclaimer}>
            All product names, logos, and brands are property of their respective owners and are used for identification purposes only. DigitalFreebies.io is an independent directory and is not affiliated with, sponsored by, or endorsed by any listed company.
          </p>
        </div>

        {/* Categories */}
        <div className={styles.footerColumn}>
          <h4>Categories</h4>
          <div className={styles.footerLinks}>
            <Link href="/category/streaming" className={styles.footerLink}>Streaming</Link>
            <Link href="/category/subscription" className={styles.footerLink}>Subscription</Link>
            <Link href="/category/vpns" className={styles.footerLink}>VPNs</Link>
            <Link href="/category/gaming" className={styles.footerLink}>Gaming</Link>
            <Link href="/category/education" className={styles.footerLink}>Education</Link>
            <Link href="/category/software" className={styles.footerLink}>Software</Link>
          </div>
        </div>

        {/* Company */}
        <div className={styles.footerColumn}>
          <h4>Company</h4>
          <div className={styles.footerLinks}>
            <Link href="/legal#takedowns" className={styles.footerLink}>Contact</Link>
            <Link href="/#faq" className={styles.footerLink}>FAQ</Link>
            <Link href="/forum" className={styles.footerLink}>Community Forum</Link>
          </div>
        </div>

        {/* Legal */}
        <div className={styles.footerColumn}>
          <h4>Legal</h4>
          <div className={styles.footerLinks}>
            <Link href="/legal" className={styles.footerLink}>Legal &amp; Takedowns</Link>
            <Link href="/privacy-policy" className={styles.footerLink}>Privacy Policy</Link>
            <Link href="/terms-of-service" className={styles.footerLink}>Terms of Service</Link>
            <Link href="/privacy-policy#cookies" className={styles.footerLink}>Cookie Policy</Link>
            <Link href="/disclaimer" className={styles.footerLink}>Disclaimer</Link>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className={styles.footerBottom}>
        <div className={styles.footerBottomContent}>
          <span>© {new Date().getFullYear()} DigitalFreebies.io — All rights reserved.</span>
          <div className={styles.footerBottomLinks}>
            <Link href="/legal" className={styles.footerBottomLink}>Legal &amp; Takedowns</Link>
            <Link href="/privacy-policy" className={styles.footerBottomLink}>Privacy</Link>
            <Link href="/terms-of-service" className={styles.footerBottomLink}>Terms</Link>
            <Link href="/disclaimer" className={styles.footerBottomLink}>Disclaimer</Link>
            <Link href="/sitemap" className={styles.footerBottomLink}>Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
    </>
  );
}
