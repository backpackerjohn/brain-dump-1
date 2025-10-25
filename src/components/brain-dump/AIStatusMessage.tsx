import { Sparkles } from "lucide-react";
import { ReactNode } from "react";

interface AIStatusMessageProps {
  message: string;
  detail?: string;
  icon?: ReactNode;
}

export function AIStatusMessage({ message, detail, icon }: AIStatusMessageProps) {
  return (
    <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20 animate-in fade-in duration-300">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {icon || <Sparkles className="h-5 w-5 text-primary animate-pulse" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
          {detail && (
            <p className="text-xs text-muted-foreground mt-1">{detail}</p>
          )}
        </div>
      </div>
    </div>
  );
}

