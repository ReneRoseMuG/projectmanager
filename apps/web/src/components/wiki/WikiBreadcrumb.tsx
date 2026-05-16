import type { WikiBreadcrumb as WikiBreadcrumbItem } from "@taskmanager/shared-types";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface WikiBreadcrumbProps {
  items: WikiBreadcrumbItem[];
}

export function WikiBreadcrumb({ items }: WikiBreadcrumbProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
      <Link className="hover:text-fern" to="/wiki">
        Wiki
      </Link>
      {items.map((item, index) => (
        <span key={item.id} className="inline-flex items-center gap-2">
          <ChevronRight size={16} />
          {index === items.length - 1 ? (
            <span className="text-ink">{item.title}</span>
          ) : (
            <Link className="hover:text-fern" to={`/wiki/${item.id}`}>
              {item.title}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
