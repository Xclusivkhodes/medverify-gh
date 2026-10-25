export const GHANA_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Western North",
  "Central",
  "Eastern",
  "Volta",
  "Oti",
  "Northern",
  "Savannah",
  "North East",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
] as const;

export type GhanaRegion = (typeof GHANA_REGIONS)[number];

export function isRegion(value: string): value is GhanaRegion {
  return (GHANA_REGIONS as readonly string[]).includes(value);
}
