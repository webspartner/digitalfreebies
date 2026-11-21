'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './AdminNav.module.css';

export default function AdminNav() {
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'moderator'>('admin');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem('admin_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.role === 'moderator') {
          setUserRole('moderator');
        } else {
          setUserRole('admin');
        }
      }
    } catch {
      // ignore
    }
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      // ignore
    }
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    router.push('/df-admin77/login');
  };

  const allNavLinks = [
    { label: 'Dashboard', href: '/df-admin77', exact: true, moderatorAllowed: true },
    { label: 'Freebies', href: '/df-admin77/offers', exact: false, moderatorAllowed: true },
    { label: 'Not Working', href: '/df-admin77/not-working', exact: false, moderatorAllowed: true },
    { label: 'Categories', href: '/df-admin77/categories', exact: false, moderatorAllowed: false },
    { label: 'Media', href: '/df-admin77/media', exact: false, moderatorAllowed: true },
    { label: 'FAQ', href: '/df-admin77/faq', exact: false, moderatorAllowed: false },
    { label: 'Newsletter', href: '/df-admin77/newsletter', exact: false, moderatorAllowed: false },
    { label: 'Users', href: '/df-admin77/users', exact: false, moderatorAllowed: true },
    { label: 'Forum', href: '/df-admin77/forum', exact: false, moderatorAllowed: true },
    { label: 'Logs', href: '/df-admin77/logs', exact: false, moderatorAllowed: false },
    { label: 'Settings', href: '/df-admin77/settings', exact: false, moderatorAllowed: false },
    { label: 'My Account', href: '/df-admin77/profile', exact: false, moderatorAllowed: true },
  ];

  const navLinks =
    mounted && userRole === 'moderator'
      ? allNavLinks.filter((l) => l.moderatorAllowed)
      : allNavLinks;

  const isActive = (href: string, exact: boolean) => {
    if (!pathname) return false;
    if (exact) return pathname === href || pathname === `${href}/`;
    return pathname === href || pathname.startsWith(`${href}/`) || pathname.startsWith(href);
  };

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <nav className={styles.adminNav}>
      <div className={styles.navContainer}>
        {/* Brand / Logo */}
        <Link href="/df-admin77" className={styles.adminLogo} onClick={closeMenu}>
          <div className={styles.adminLogoIcon}>D</div>
          <span className={styles.adminLogoText}>DigitalFreebies</span>
          <span
            className={styles.adminBadge}
            style={
              mounted && userRole === 'moderator'
                ? { background: '#0284c7', color: '#ffffff' }
                : undefined
            }
          >
            {mounted && userRole === 'moderator' ? 'Moderator' : 'Admin'}
          </span>
        </Link>

        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          className={`${styles.menuToggle} ${mobileMenuOpen ? styles.menuToggleOpen : ''}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          <span className={styles.hamburgerLine}></span>
          <span className={styles.hamburgerLine}></span>
          <span className={styles.hamburgerLine}></span>
        </button>

        {/* Desktop Links */}
        <div className={styles.desktopLinks}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${isActive(link.href, link.exact) ? styles.navLinkActive : ''}`}
            >
              {link.label}
            </Link>
          ))}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.viewSiteLink}
          >
            ↗ View Site
          </a>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className={styles.mobileMenuBackdrop} onClick={closeMenu}>
          <div className={styles.mobileMenu} onClick={(e) => e.stopPropagation()}>
            <div className={styles.mobileMenuLinks}>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${styles.mobileNavLink} ${isActive(link.href, link.exact) ? styles.mobileNavLinkActive : ''}`}
                  onClick={closeMenu}
                >
                  {link.label}
                </Link>
              ))}
              <hr className={styles.mobileDivider} />
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.mobileNavLink}
                onClick={closeMenu}
              >
                ↗ View Live Site
              </a>
              <button
                onClick={() => {
                  closeMenu();
                  handleLogout();
                }}
                className={styles.mobileLogoutBtn}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
