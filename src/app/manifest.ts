import type { MetadataRoute } from "next";

import { APP_NAME } from "@/config/app";

/** Installable app: one "Event Manager" for venue staff and customers; /open sends each to the right place. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: APP_NAME,
    short_name: APP_NAME,
    description: "Booking, kundeportal og planlegging for selskapslokaler.",
    lang: "nb",
    start_url: "/open?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f9faf6",
    theme_color: "#f9faf6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Lets Chromium's getInstalledRelatedApps() recognise this web app once it is installed.
    related_applications: [{ platform: "webapp", url: "/manifest.webmanifest" }],
  };
}
