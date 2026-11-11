import { AudienceSection } from "@/components/landing/audience-section";
import { BenefitsPricingSection } from "@/components/landing/benefits-pricing-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { FinalCtaSection } from "@/components/landing/final-cta-section";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { ProblemSection } from "@/components/landing/problem-section";
import { ProductPreviewSection } from "@/components/landing/product-preview-section";
import type { Metadata } from "next";

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
        <HeroSection />
        <ProblemSection />
        <FeaturesSection />
        <HowItWorksSection />
        <ProductPreviewSection />
        <AudienceSection />
        <BenefitsPricingSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
