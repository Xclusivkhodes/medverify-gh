import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { PRODUCT, footerDisclaimer } from "@/lib/brand";
import "./globals.css";

const onest = localFont({
  src: [
    { path: "../node_modules/@fontsource/onest/files/onest-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../node_modules/@fontsource/onest/files/onest-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../node_modules/@fontsource/onest/files/onest-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-onest",
  display: "swap",
  adjustFontFallback: "Arial",
});

const sourceSans = localFont({
  src: [
    { path: "../node_modules/@fontsource/source-sans-3/files/source-sans-3-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../node_modules/@fontsource/source-sans-3/files/source-sans-3-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../node_modules/@fontsource/source-sans-3/files/source-sans-3-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-source",
  display: "swap",
  adjustFontFallback: "Arial",
});

const geist = localFont({
  src: [
    { path: "../node_modules/@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../node_modules/@fontsource/geist-mono/files/geist-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-geist",
  display: "swap",
  adjustFontFallback: false,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:43123";
const description = footerDisclaimer();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${PRODUCT.name} — ${PRODUCT.tagline}`,
    template: `%s · ${PRODUCT.name}`,
  },
  description,
  applicationName: PRODUCT.name,
  keywords: ["FDA Ghana", "medicine batch", "recall", "safety alert", "pharmacist"],
  openGraph: {
    title: `${PRODUCT.name} — ${PRODUCT.tagline}`,
    description,
    siteName: PRODUCT.name,
    type: "website",
    locale: "en_GH",
  },
  twitter: {
    card: "summary_large_image",
    title: `${PRODUCT.name} — ${PRODUCT.tagline}`,
    description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#18181B" },
  ],
};

const themeScript = `(function(){try{var q=new URLSearchParams(location.search).get("theme");var t=(q==="light"||q==="dark")?q:localStorage.getItem("mv-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${onest.variable} ${sourceSans.variable} ${geist.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
