import { LandingHeader } from "@/components/landing/landing-header";
import { Faq } from "@/components/landing/v2/faq";
import { Features } from "@/components/landing/v2/features";
import { FinalCta } from "@/components/landing/v2/final-cta";
import { LandingV2Footer } from "@/components/landing/v2/footer";
import { Hero } from "@/components/landing/v2/hero";
import { HowItWorks } from "@/components/landing/v2/how-it-works";
import { Pricing } from "@/components/landing/v2/pricing";
import { Showcase } from "@/components/landing/v2/showcase";
import type { Metadata } from "next";

import "@/components/landing/v2/landing-v2.css";

export const metadata: Metadata = {
  title: "Event Manager | Venue Booking and Finance Dashboard",
  description:
    "Manage venue bookings, customers, payments, pricing, assets, and reports from one simple SaaS dashboard.",
};

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <LandingHeader />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Showcase />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <LandingV2Footer />
    </div>
  );
}
