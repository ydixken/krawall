import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Krawall - AI Chatbot Stress Testing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
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
          backgroundColor: "#030712",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Lightning bolt */}
        <svg
          width="120"
          height="120"
          viewBox="0 0 32 32"
          style={{ marginBottom: 32 }}
        >
          <path
            d="M18.5 4L8 18h7l-1.5 10L24 14h-7z"
            fill="#3B82F6"
            stroke="#60A5FA"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        </svg>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#F9FAFB",
            letterSpacing: "-0.02em",
            marginBottom: 16,
          }}
        >
          Krawall
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: "#9CA3AF",
            maxWidth: 700,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          Prove that your AI chatbot&apos;s API bill is an unguarded attack surface.
        </div>
      </div>
    ),
    { ...size }
  );
}
