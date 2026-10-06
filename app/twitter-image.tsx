import { ImageResponse } from "next/og";

export const alt = "Trustloop";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F3F7F1",
          backgroundImage:
            "radial-gradient(circle at 50% 35%, rgba(18, 148, 95, 0.14), rgba(18, 148, 95, 0) 55%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
          }}
        >
          <div
            style={{
              width: 132,
              height: 132,
              borderRadius: 30,
              background: "#0B2A21",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <svg
              width={90}
              height={90}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
              <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
              <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
              <path d="M2 12a10 10 0 0 1 18-6" />
              <path d="M2 16h.01" />
              <path d="M21.8 16c.2-2 .131-5.354 0-6" />
              <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
              <path d="M8.65 22c.21-.66.45-1.32.57-2" />
              <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
            </svg>
          </div>
          <div
            style={{
              fontSize: 108,
              fontWeight: 700,
              color: "#141A17",
              letterSpacing: -2,
            }}
          >
            Trustloop
          </div>
        </div>
        <div
          style={{
            marginTop: 34,
            fontSize: 34,
            color: "#4C5B54",
            display: "flex",
          }}
        >
          Security questionnaires
        </div>
      </div>
    ),
    { ...size }
  );
}
