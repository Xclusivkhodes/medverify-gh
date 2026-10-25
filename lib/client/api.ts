/** Empty base means same origin. Set NEXT_PUBLIC_API_BASE when the UI and API are on different hosts. */
export function apiUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
