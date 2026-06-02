import type { ReactNode } from "react";

interface DetailBoardShellProps {
  children: ReactNode;
}

/** Standard wrapper for board/list tabs inside detail forms and pages.
 *  Provides: white card background, full-height fill, consistent inner padding.
 */
export function DetailBoardShell({ children }: DetailBoardShellProps) {
  return (
    <div className="flex min-h-full flex-col rounded-lg border border-line bg-white p-2.5 shadow-panel">
      {children}
    </div>
  );
}
