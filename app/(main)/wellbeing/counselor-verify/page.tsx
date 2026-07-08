import { WellbeingCounselorVerifyPanel } from "@/components/wellbeing/wellbeing-counselor-verify-panel";
import { WellbeingSubnav } from "@/components/wellbeing/wellbeing-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";

export default function CounselorVerifyPage() {
  const t = wellbeingCopy.es;
  return (
    <div className="space-y-10">
      <PageHeader eyebrow={t.eyebrow} title={t.counselorVerifyPageTitle} description={t.counselorVerifyPageHint} />
      <WellbeingSubnav />
      <WellbeingCounselorVerifyPanel />
    </div>
  );
}
