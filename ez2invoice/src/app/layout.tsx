import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "EZ2Invoice - Complete Truck Shop Management Solution",
  description: "Streamline your truck service business with powerful tools for work orders, customer management, inventory tracking, and more. Built specifically for semi-truck repair shops.",
  keywords: "truck repair, shop management, work orders, invoicing, inventory management, semi-truck repair",
  authors: [{ name: "EZ2Invoice Team" }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning={true}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}