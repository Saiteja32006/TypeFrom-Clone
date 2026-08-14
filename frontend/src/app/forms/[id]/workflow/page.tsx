"use client";

import { Workflow } from "lucide-react";

import { ComingSoon } from "@/components/builder/ComingSoon";
import { PlaceholderTab } from "@/components/builder/PlaceholderTab";

/**
 * Workflow tab. Typeform's logic canvas lives here; conditional branching is on
 * the brief's placeholder list, so the tab exists to keep the navigation
 * familiar without pretending the feature is built.
 */
export default function WorkflowPage() {
  return (
    <PlaceholderTab active="workflow">
      <ComingSoon
        icon={Workflow}
        title="Workflow"
        description="Branch respondents down different paths based on how they answer."
        items={[
          "Logic jumps between questions",
          "Scoring and outcome quizzes",
          "Conditional endings",
        ]}
      />
    </PlaceholderTab>
  );
}
