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
            "radial-gradient(circle at 50% 35%, rgba(1, 121, 83, 0.14), rgba(1, 121, 83, 0) 55%)",
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
              background: "#017953",
              color: "#ffffff",
              fontSize: 76,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            T
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
