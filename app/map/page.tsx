import type { Metadata } from "next";
import { MapView } from "@/components/map-view";
import { PRODUCT } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Reports by region",
  description: `Region notes saved on this phone in ${PRODUCT.name}, plus an excerpt of FDA licensed manufacturers.`,
};

export default function MapPage() {
  return <MapView />;
}
