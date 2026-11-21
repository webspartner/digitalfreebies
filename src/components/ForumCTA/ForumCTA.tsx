import Link from 'next/link';
import styles from './ForumCTA.module.css';

export default function ForumCTA() {
  return (
    <section className={styles.section} aria-label="Community Forum Callout">
      <div className={styles.container}>
        <h2 className={styles.title}>Got a freebie to share with the community?</h2>
        <p className={styles.subtitle}>
          Found a working digital freebie, free trial, or hidden promo? Post it in our
          community forum and help thousands of members discover deals for their favorite brands.
        </p>
        <div className={styles.actions}>
          <Link href="/forum/new" className={styles.primaryBtn}>
            Post a Freebie <span className={styles.btnArrow}>→</span>
          </Link>
          <Link href="/forum" className={styles.secondaryLink}>
            Browse Community Forum
          </Link>
        </div>
      </div>
    </section>
  );
}
