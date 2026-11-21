import Link from 'next/link';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <>
      <Header />

      <main className={styles.notFoundMain}>
        <div className={styles.content}>
          <span className={styles.errorCode}>404</span>
          <h1 className={styles.title}>Page Not Found</h1>
          <p className={styles.subtitle}>
            The page or offer you are looking for doesn&apos;t exist or has been removed.
          </p>
          <div className={styles.actions}>
            <Link href="/" className={styles.primaryBtn}>
              Back to Homepage <span>→</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
