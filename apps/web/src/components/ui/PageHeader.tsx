import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  onRefresh,
  refreshing = false,
}: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions || onRefresh ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {actions}
          {onRefresh ? (
            <Button
              aria-label="Aktualisieren"
              title="Aktualisieren"
              variant="ghost"
              icon={<RefreshCw size={17} />}
              loading={refreshing}
              className="h-9 w-9 border border-line bg-white text-ink hover:border-fern"
              onClick={() => void onRefresh()}
            />
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
