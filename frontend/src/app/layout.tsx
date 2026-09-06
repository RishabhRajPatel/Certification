import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Maayad — Admin",
    template: "%s · Maayad",
  },
  description:
    "Maayad — Internship, offer letter & certificate management admin panel.",
  robots: { index: false, follow: false },
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234F46E5'%3E%3Cpath d='M12 1l3 5 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z'/%3E%3C/svg%3E",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
