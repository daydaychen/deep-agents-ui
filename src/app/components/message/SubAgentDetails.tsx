"use client";

import { MarkdownContent } from "@/app/components/MarkdownContent";
import type { UISubAgent } from "@/app/types/messages";
import { extractSubAgentContent } from "@/app/utils/utils";
import { Terminal } from "lucide-react";
import React from "react";

interface SubAgentDetailsProps {
  subAgent: UISubAgent;
  isLoading?: boolean;
}

export const SubAgentDetails = React.memo<SubAgentDetailsProps>(
  ({ subAgent }) => {

    return (
      <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/10 p-4 shadow-sm">
        {/* Input Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Terminal size={10} className="text-muted-foreground/40" />
            <h4 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Protocol Input
            </h4>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/30 dark:bg-zinc-950/50 p-3 text-sm shadow-inner">
            <MarkdownContent content={extractSubAgentContent(subAgent.input)} />
          </div>
        </div>

        {/* Output Section */}
        {subAgent.output && (
          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex items-center gap-2 px-1">
              <div className="h-2 w-2 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <div className="h-1 w-1 rounded-full bg-emerald-500" />
              </div>
              <h4 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Final Result
              </h4>
            </div>
            <div className="rounded-xl border border-emerald-500/10 bg-muted/30 dark:bg-emerald-500/[0.05] dark:bg-zinc-950/50 p-3 text-sm shadow-inner">
              <MarkdownContent
                content={extractSubAgentContent(subAgent.output)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }
);

SubAgentDetails.displayName = "SubAgentDetails";
