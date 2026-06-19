import { ImageResponse } from "next/og";

export const alt = "Seasons & Sights — travel in the right season";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f7f1e6",
          color: "#1c1917",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 36 }}>
          <span>🌤️</span>
          <span style={{ fontWeight: 700 }}>Seasons & Sights</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 30, color: "#0e7490", letterSpacing: 6 }}>
            PLAN AROUND THE WEATHER
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", fontSize: 86, fontWeight: 700, lineHeight: 1.05 }}>
            <span>Travel in the&nbsp;</span>
            <span style={{ color: "#f97316" }}>right season.</span>
          </div>
          <div style={{ fontSize: 30, color: "#57534e", maxWidth: 940 }}>
            Dry/wet seasons, crowds, festivals & a season-optimizing trip planner
            across 46 destinations.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ width: 130, height: 18, background: "#f59e0b", borderRadius: 6 }} />
          <div style={{ width: 130, height: 18, background: "#10b981", borderRadius: 6 }} />
          <div style={{ width: 130, height: 18, background: "#38bdf8", borderRadius: 6 }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
