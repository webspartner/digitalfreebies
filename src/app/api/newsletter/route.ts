import { NextResponse } from 'next/server';
import {
  addNewsletterSubscriber,
  getNewsletterStore,
  saveNewsletterStore,
  syncSubscriberToPlatform,
} from '@/lib/newsletterStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    const { subscriber } = await addNewsletterSubscriber(normalizedEmail, 'website');

    // Auto-sync to external marketing platform if configured
    const store = await getNewsletterStore();
    if (
      store.platform.enabled &&
      store.platform.autoSyncNewSubscribers &&
      store.platform.provider !== 'smtp'
    ) {
      const syncResult = await syncSubscriberToPlatform(
        normalizedEmail,
        store.platform
      );
      if (syncResult.synced) {
        const target = store.subscribers.find((s) => s.id === subscriber.id);
        if (target) {
          target.syncedToPlatform = true;
          await saveNewsletterStore(store);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed! You will receive new freebie alerts.',
    });
  } catch (error) {
    console.error('Newsletter error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to subscribe. Please try again later.' },
      { status: 500 }
    );
  }
}
