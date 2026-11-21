'use client';

import { useState } from 'react';
import styles from './FAQ.module.css';

interface FaqItemData {
  id: number;
  question: string;
  answer: string;
}

interface FAQProps {
  items: FaqItemData[];
}

export default function FAQ({ items }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  if (!items.length) return null;

  return (
    <section className={styles.faqSection} id="faq">
      <div className={styles.faqContainer}>
        <div className={styles.faqHeader}>
          <h2 className={styles.faqTitle}>Frequently Asked Questions</h2>
        </div>

        <div role="list">
          {items.map((item, index) => (
            <div key={item.id} className={styles.faqItem} role="listitem">
              <button
                className={styles.faqQuestion}
                onClick={() => toggle(index)}
                aria-expanded={openIndex === index}
                id={`faq-question-${item.id}`}
              >
                <span>{item.question}</span>
                <span
                  className={`${styles.faqChevron} ${openIndex === index ? styles.faqChevronOpen : ''}`}
                >
                  ▼
                </span>
              </button>
              <div
                className={`${styles.faqAnswer} ${openIndex === index ? styles.faqAnswerOpen : ''}`}
              >
                <div className={styles.faqAnswerContent}>
                  {item.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
