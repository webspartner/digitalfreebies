import Script from 'next/script';
import prisma from '@/lib/prisma';
import { getTechnicalSettings } from '@/lib/technicalSettings';

export default async function GoogleAnalyticsTag() {
  let measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

  try {
    const settings = await prisma.analyticsSettings.findUnique({
      where: { id: 1 },
      select: { measurementId: true },
    });
    if (settings?.measurementId) {
      measurementId = settings.measurementId.trim();
    }
  } catch {
    // Fallback to env variable if DB table not yet initialized
  }

  const techSettings = await getTechnicalSettings();
  const hasGa = Boolean(measurementId && /^G-[A-Z0-9]+$/i.test(measurementId));
  const gtmId = techSettings.google.tagManagerId?.trim() || '';
  const hasGtm = Boolean(gtmId && /^GTM-[A-Z0-9]+$/i.test(gtmId));
  const adsenseId = techSettings.google.adsenseClientId?.trim() || '';
  const hasAdsense = Boolean(adsenseId && /^ca-pub-[0-9]+$/i.test(adsenseId));
  const siteVerification = techSettings.google.siteVerification?.trim() || '';

  if (!hasGa && !hasGtm && !hasAdsense && !siteVerification) {
    return null;
  }

  return (
    <>
      {siteVerification && (
        <meta name="google-site-verification" content={siteVerification} />
      )}
      {hasGa && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${measurementId}');
            `}
          </Script>
        </>
      )}
      {hasGtm && (
        <Script id="google-tag-manager-init" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `}
        </Script>
      )}
      {hasAdsense && (
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      )}
    </>
  );
}
