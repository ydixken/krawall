import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Krawall",
  description: "Prove that your AI chatbot's API bill is an unguarded attack surface.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Krawall",
    description: "Prove that your AI chatbot's API bill is an unguarded attack surface.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Krawall",
    description: "Prove that your AI chatbot's API bill is an unguarded attack surface.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
