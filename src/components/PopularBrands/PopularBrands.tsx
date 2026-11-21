import Link from 'next/link';
import type { BrandTag } from '@/lib/brands';
import styles from './PopularBrands.module.css';

interface PopularBrandsProps {
  brands: BrandTag[];
}

export default function PopularBrands({ brands }: PopularBrandsProps) {
  if (!brands.length) return null;

  return (
    <section className={styles.brandsSection} id="popular-brands">
      <div className={styles.brandsContainer}>
        <h2 className={styles.brandsTitle}>Popular Brands</h2>

        <div className={styles.tagsList} role="list">
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/brand/${brand.slug}`}
              className={styles.brandTag}
              role="listitem"
              title={brand.name}
            >
              {brand.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
