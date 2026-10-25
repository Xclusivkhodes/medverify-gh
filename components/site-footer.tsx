import { footerDisclaimer } from "@/lib/brand";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="gutter mt-10 pb-12 t-small t-subtle">
      <p>{footerDisclaimer()}</p>
      <nav className="site-footer" aria-label="About">
        <Link href="/cabinet">Cabinet</Link>
        <Link href="/pharmacist">Pharmacist</Link>
        <Link href="/map">Regions</Link>
        <Link href="/digest">Digest</Link>
        <Link href="/how-it-works">How it works</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/disclaimer">Disclaimer</Link>
      </nav>
    </footer>
  );
}
