import type { Metadata } from "next";
import { DigestView } from "@/components/digest-view";
import { PRODUCT } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Safety digest",
  description: `Plain-language FDA and WHO notices bundled with ${PRODUCT.name}. Not a live model summary.`,
};

export default function DigestPage() {
  return <DigestView />;
}
