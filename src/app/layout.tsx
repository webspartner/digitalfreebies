import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ForumAuthProvider } from "@/context/ForumAuthContext";
import { RegionProvider } from "@/context/RegionContext";
import { DialogProvider } from "@/components/ConfirmDialog/ConfirmDialog";
import GoogleAnalyticsTag from "@/components/GoogleAnalyticsTag/GoogleAnalyticsTag";
import SiteTrafficTracker from "@/components/SiteTrafficTracker/SiteTrafficTracker";
import { getTechnicalSettings } from "@/lib/technicalSettings";
import { REGION_COOKIE_NAME, isValidRegion } from "@/lib/regions";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-montserrat",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getTechnicalSettings();
  const title =
    settings.seo.homepageTitle ||
    "DigitalFreebies.io — Discover Free Digital Offers, Trials & Promotions";
  const description =
    settings.seo.homepageDescription ||
    "Find the best free digital offers, trials, and promotions. Free streaming, VPN trials, gaming deals, educational resources, and software freebies — all in one place.";
  const keywords =
    settings.seo.homepageKeywords ||
    "free trials, free offers, digital freebies, free streaming, free VPN, free games, free software, promotions";
  const ogTitle = settings.seo.ogTitle || title;
  const ogDescription = settings.seo.ogDescription || description;

  return {
    title,
    description,
    keywords,
    alternates: settings.seo.canonicalUrl
      ? { canonical: settings.seo.canonicalUrl }
      : undefined,
    robots: settings.seo.robotsMeta || "index, follow",
    verification: settings.google.siteVerification
      ? { google: settings.google.siteVerification }
      : undefined,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      type: "website",
      siteName: "DigitalFreebies.io",
    },
    icons: {
      icon: "/images/assets/favicon.png?v=4",
      shortcut: "/images/assets/favicon.png?v=4",
      apple: "/images/assets/favicon.png?v=4",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const rawRegion = cookieStore.get(REGION_COOKIE_NAME)?.value;
  const decodedRegion = rawRegion ? decodeURIComponent(rawRegion) : undefined;
  const initialRegion = isValidRegion(decodedRegion) ? decodedRegion : "Global";

  return (
    <html lang="en" data-scroll-behavior="smooth" className={montserrat.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(typeof performance!=='undefined'&&typeof performance.measure==='function'){var orig=performance.measure.bind(performance);performance.measure=function(name,startOrOptions,endMark){try{if(startOrOptions&&typeof startOrOptions==='object'){if(typeof startOrOptions.start==='number'&&startOrOptions.start<0)startOrOptions.start=0;if(typeof startOrOptions.end==='number'&&startOrOptions.end<0)startOrOptions.end=0;}return orig(name,startOrOptions,endMark);}catch(e){return undefined;}};}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={montserrat.className}>
        <GoogleAnalyticsTag />
        <SiteTrafficTracker />
        <DialogProvider>
          <RegionProvider initialRegion={initialRegion}>
            <ForumAuthProvider>
              {children}
            </ForumAuthProvider>
          </RegionProvider>
        </DialogProvider>
      </body>
    </html>
  );
}
