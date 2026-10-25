import { ALERTS, type AlertRecord } from "./corpus";

export interface DigestItem {
  id: string;
  source: string;
  productName: string;
  batches: string;
  issued: string;
  url: string;
  plain: string;
}

function plain(alert: AlertRecord): string {
  const batches = alert.batches.length ? `Batches named: ${alert.batches.join(", ")}.` : "The notice is not limited to one batch in this snapshot.";
  return `${alert.productName}. ${batches} ${alert.summary}`;
}

/** Plain-language digest of the bundled notices. No model call. */
export function weeklyDigest(): DigestItem[] {
  return ALERTS.map((alert) => ({
    id: alert.id,
    source: alert.source === "who" ? "WHO" : "Ghana FDA",
    productName: alert.productName,
    batches: alert.batches.join(", "),
    issued: alert.issued,
    url: alert.url,
    plain: plain(alert),
  }));
}
