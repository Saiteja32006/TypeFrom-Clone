"use client";

import { Plug } from "lucide-react";

import { ComingSoon } from "@/components/builder/ComingSoon";
import { PlaceholderTab } from "@/components/builder/PlaceholderTab";

/**
 * Connect tab. Scoped out by the brief; present so the builder's tab bar
 * matches Typeform's and the boundary of what is built stays obvious.
 */
export default function ConnectPage() {
  return (
    <PlaceholderTab active="connect">
      <ComingSoon
        icon={Plug}
        title="Connect"
        description="Send responses to the tools your team already uses, the moment they arrive."
        items={[
          "Webhooks for every new response",
          "Google Sheets and Slack delivery",
          "Zapier and Make integrations",
        ]}
      />
    </PlaceholderTab>
  );
}
