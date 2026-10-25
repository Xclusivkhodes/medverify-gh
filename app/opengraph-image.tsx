import { ImageResponse } from "next/og";
import { PRODUCT } from "@/lib/brand";

export const alt = `${PRODUCT.name}. ${PRODUCT.tagline} Public FDA Ghana alerts. Not medical advice.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FAFAFA",
          color: "#111113",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#0B7A73",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 26,
                height: 44,
                borderRadius: 14,
                border: "3px solid #ffffff",
                display: "flex",
                alignItems: "center",
              }}
            >
              <div style={{ height: 3, width: "100%", background: "#ffffff" }} />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{PRODUCT.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>{PRODUCT.tagline}</div>
          <div style={{ fontSize: 30, color: "#52525B" }}>Public FDA Ghana alerts. Not medical advice.</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
