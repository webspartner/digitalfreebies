'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: 'light' | 'dark' | 'auto';
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onStatusChange?: (enabled: boolean) => void;
  resetKey?: number;
}

export default function TurnstileWidget({
  onVerify,
  onStatusChange,
  resetKey = 0,
}: TurnstileWidgetProps) {
  const [siteKey, setSiteKey] = useState<string>('');
  const [enabled, setEnabled] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onStatusChangeRef.current = onStatusChange;
  }, [onVerify, onStatusChange]);

  useEffect(() => {
    let active = true;
    fetch('/api/turnstile', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        const isEnabled = Boolean(data?.enabled && data?.siteKey);
        setEnabled(isEnabled);
        setSiteKey(isEnabled ? data.siteKey : '');
        onStatusChangeRef.current?.(isEnabled);
      })
      .catch(() => {
        if (!active) return;
        setEnabled(false);
        setSiteKey('');
        onStatusChangeRef.current?.(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !siteKey) return;

    const renderWidget = () => {
      if (!containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
      containerRef.current.innerHTML = '';
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'light',
        callback: (token: string) => {
          onVerifyRef.current(token);
        },
        'expired-callback': () => {
          onVerifyRef.current('');
        },
        'error-callback': () => {
          onVerifyRef.current('');
        },
      });
    };

    const existingScript = document.getElementById(
      'cf-turnstile-script'
    ) as HTMLScriptElement | null;

    if (window.turnstile) {
      renderWidget();
    } else if (existingScript) {
      existingScript.addEventListener('load', renderWidget);
      return () => existingScript.removeEventListener('load', renderWidget);
    } else {
      const script = document.createElement('script');
      script.id = 'cf-turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [enabled, siteKey]);

  useEffect(() => {
    if (resetKey > 0 && widgetIdRef.current && window.turnstile) {
      try {
        onVerifyRef.current('');
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        // ignore
      }
    }
  }, [resetKey]);

  if (!enabled || !siteKey) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        margin: '12px 0 8px',
        minHeight: '65px',
      }}
    >
      <div ref={containerRef} />
    </div>
  );
}
