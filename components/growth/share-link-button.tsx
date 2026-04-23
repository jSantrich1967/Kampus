"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/growth/analytics";
import { buildGrowthShareUrl, type ShareCampaign } from "@/lib/growth/share-links";
import { cn } from "@/lib/cn";

type ShareLinkButtonProps = {
  pathname: string;
  campaign: ShareCampaign;
  extra?: Record<string, string | undefined>;
  refHandle?: string;
  label: string;
  copiedLabel: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function ShareLinkButton({
  pathname,
  campaign,
  extra,
  refHandle,
  label,
  copiedLabel,
  variant = "secondary",
  size = "sm",
  className,
}: ShareLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = buildGrowthShareUrl(origin, { pathname, campaign, extra, ref: refHandle });
    try {
      await navigator.clipboard.writeText(url);
      trackEvent("share_link_copied", {
        campaign,
        pathname,
        ref: refHandle,
        ...(extra as Record<string, string | undefined>),
      });
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button type="button" variant={variant} size={size} className={cn("gap-2", className)} onClick={onCopy}>
      {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Link2 className="h-4 w-4" />}
      {copied ? copiedLabel : label}
    </Button>
  );
}
