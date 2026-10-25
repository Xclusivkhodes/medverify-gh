import type { Metadata } from "next";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Page not found",
  description: "That address is not a page on MedVerify GH.",
};

export default function NotFound() {
  return (
    <Shell title="Page not found">
      <main className="gutter legal pt-6 pb-6">
        <p className="t-eyebrow">404</p>
        <h1 className="t-h1">That page is not here</h1>
        <p>The link may be old, or the address may be mistyped. The medicine check is still on the home page.</p>
        <div className="flex flex-wrap gap-3">
          <Link className="btn btn-primary" href="/">Check a medicine</Link>
          <Link className="btn btn-outline" href="/how-it-works">How it works</Link>
        </div>
      </main>
      <SiteFooter />
    </Shell>
  );
}
