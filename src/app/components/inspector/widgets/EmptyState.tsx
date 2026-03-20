import type { LucideIcon } from "lucide-react";
import React from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
}

export const EmptyState = React.memo<EmptyStateProps>(({ icon: Icon, message }) => (
  <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
    <Icon
      size={32}
      className="mb-4 text-muted-foreground/20"
    />
    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/40">
      {message}
    </p>
  </div>
));

EmptyState.displayName = "EmptyState";
