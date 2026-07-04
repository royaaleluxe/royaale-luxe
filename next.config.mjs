import { IMAGE_HOSTS } from "./image-hosts.mjs";

const isAdminSite = process.env.NEXT_PUBLIC_SITE_MODE === "admin";

const ADMIN_REDIRECTS = [
  { source: "/", destination: "/admin-portal", permanent: false },
  { source: "/about", destination: "/admin-portal", permanent: false },
  { source: "/account", destination: "/admin-portal", permanent: false },
  { source: "/account/orders/:path*", destination: "/admin-portal", permanent: false },
  { source: "/bestsellers", destination: "/admin-portal", permanent: false },
  { source: "/checkout", destination: "/admin-portal", permanent: false },
  { source: "/checkout/confirmation", destination: "/admin-portal", permanent: false },
  { source: "/collections", destination: "/admin-portal", permanent: false },
  { source: "/contact", destination: "/admin-portal", permanent: false },
  { source: "/new-arrivals", destination: "/admin-portal", permanent: false },
  { source: "/products/:path*", destination: "/admin-portal", permanent: false },
  { source: "/returns", destination: "/admin-portal", permanent: false },
  { source: "/search", destination: "/admin-portal", permanent: false },
  { source: "/shipping", destination: "/admin-portal", permanent: false },
  { source: "/size-guide", destination: "/admin-portal", permanent: false },
  { source: "/terms", destination: "/admin-portal", permanent: false },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: IMAGE_HOSTS.map((hostname) => ({
      protocol: "https",
      hostname,
    })),
  },
  async redirects() {
    return isAdminSite ? ADMIN_REDIRECTS : [];
  },
  webpack: (config, { dev }) => {
    // Windows often misses file-save events; polling makes HMR/rebuilds reliable.
    if (dev && process.platform === "win32") {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
