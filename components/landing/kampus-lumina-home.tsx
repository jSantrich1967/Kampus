import { KampusContactFooter } from "@/components/landing/kampus-contact-footer";
import { KampusLuminaNav } from "@/components/landing/kampus-lumina-nav";
import { FeaturesSection } from "@/components/landing/sections/features-section";
import { FaqSection } from "@/components/landing/sections/faq-section";
import { HeroSection } from "@/components/landing/sections/hero-section";
import { PricingSection } from "@/components/landing/sections/pricing-section";
import { TestimonialsSection } from "@/components/landing/sections/testimonials-section";

export function KampusLuminaHome() {
  return (
    <div className="overflow-x-hidden bg-[#131318] text-white selection:bg-purple-500/30">
      <KampusLuminaNav />

      <main>
        <HeroSection />
        <FeaturesSection />
        <TestimonialsSection />
        <PricingSection />
        <FaqSection />
      </main>

      <KampusContactFooter />
    </div>
  );
}
