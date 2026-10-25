import type { Metadata } from "next";
import { CabinetView } from "@/components/cabinet-view";
import { PRODUCT } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Medicine cabinet",
  description: `Saved packs in ${PRODUCT.name} are re-checked against FDA and WHO notices on this phone.`,
};

export default function CabinetPage() {
  return <CabinetView />;
}
