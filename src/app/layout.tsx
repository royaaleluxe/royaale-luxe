import type { Metadata, Viewport } from "next";
import { Great_Vibes, Montserrat, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/context/Providers";
import { StorefrontShell } from "@/components/Layout/StorefrontShell";
import { PWARegister } from "@/components/Elements/PWARegister";

const greatVibes = Great_Vibes({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-great-vibes",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  style: ["italic", "normal"],
});

export function generateMetadata(): Metadata {
  if (process.env.NEXT_PUBLIC_SITE_MODE === "admin") {
    return {
      title: "Royaale Admin",
      description: "Royaale Luxe administration portal",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: "Royaale Luxe | Premium Saint Lucia Fashion",
    description:
      "Ultra-luxurious premium clothing brand based in Saint Lucia. Island elegance meets couture refinement.",
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Royaale Luxe",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#f9a8d4",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${greatVibes.variable} ${montserrat.variable} ${playfair.variable} font-sans`}>
        <Providers>
          <PWARegister />
          <StorefrontShell>{children}</StorefrontShell>
        </Providers>
      </body>
    </html>
  );
}
