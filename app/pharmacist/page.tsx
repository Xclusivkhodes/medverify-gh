import type { Metadata } from "next";
import { PharmacistView } from "@/components/pharmacist-view";
import { PRODUCT } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Pharmacist stock",
  description: `Log batches checked at intake with ${PRODUCT.name}. The verified-on time stays on this phone.`,
};

export default function PharmacistPage() {
  return <PharmacistView />;
}
