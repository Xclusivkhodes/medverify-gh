/** Short excerpt of FDA Ghana’s September 2026 local-manufacturer list. Not a live register and not a retail-pharmacy directory. */
export const FACILITY_SOURCE = {
  title: "FDA licensed local pharmaceutical manufacturing sites, 4 September 2026",
  url: "https://fdaghana.gov.gh/wp-content/uploads/2026/09/LICENSED-LOCAL-PHARMA-SEPTEMBER-FOR-PUBLISHIING.-VERSION-3.0.pdf",
  search: "https://fdaghana.gov.gh/licensed-facilities-register/",
} as const;

export interface FacilityExcerpt {
  region: string;
  name: string;
  where: string;
  certificate: string;
  expires: string;
}

export const FACILITY_EXCERPT: FacilityExcerpt[] = [
  {
    region: "Greater Accra",
    name: "Kinapharma Limited",
    where: "North Industrial Area, Accra",
    certificate: "PPM/GMP/021/09/25",
    expires: "20 Sep 2026",
  },
  {
    region: "Greater Accra",
    name: "GR Industries Limited",
    where: "Heavy Industrial Area, Accra",
    certificate: "PPM/GMP/025/09/25",
    expires: "24 Sep 2026",
  },
  {
    region: "Ashanti",
    name: "Pokupharma Limited",
    where: "Fumesua, Kumasi",
    certificate: "PPM/GMP/029/04/25",
    expires: "31 Dec 2026",
  },
  {
    region: "Greater Accra",
    name: "Ernest Chemist Limited",
    where: "Heavy Industrial Area, Tema",
    certificate: "PPM/GMP/011/02/26",
    expires: "16 Feb 2027",
  },
];
