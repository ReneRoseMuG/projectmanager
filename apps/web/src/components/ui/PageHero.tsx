import type { ReactNode } from "react";

interface PageHeroListProps {
  variant: "list";
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  fixedHeight?: boolean;
}

interface PageHeroDetailProps {
  variant: "detail";
  title: string;
  breadcrumb?: string[];
  subtitle?: ReactNode;
  icon?: ReactNode;
  metaPills?: ReactNode;
  actions?: ReactNode;
  fixedHeight?: boolean;
}

type PageHeroProps = PageHeroListProps | PageHeroDetailProps;

function listHeroClass(fixedHeight: boolean): string {
  return `relative shrink-0 overflow-hidden border-b border-steel-700 bg-gradient-to-br from-steel-700 to-steel-600 px-5 py-5 text-white md:px-6 ${
    fixedHeight ? "h-[var(--hero-h,128px)]" : ""
  }`;
}

function detailHeroClass(fixedHeight: boolean): string {
  return `relative shrink-0 overflow-hidden border-b border-steel-700 bg-gradient-to-br from-steel-700 to-steel-600 px-5 py-5 text-white md:px-6 ${
    fixedHeight ? "h-[var(--hero-h,128px)]" : ""
  }`;
}

export function PageHero(props: PageHeroProps) {
  const fixedHeight = props.fixedHeight ?? true;

  if (props.variant === "list") {
    return (
      <header
        className={listHeroClass(fixedHeight)}
        data-testid="page-hero"
        data-variant="list"
      >
        <div className="pointer-events-none absolute -right-8 -top-32 h-80 w-80 rounded-full bg-white/12 blur-sm" />
        <div className="relative flex h-full flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold leading-tight tracking-normal text-white md:text-3xl">
              {props.title}
            </h1>
            {props.subtitle ? (
              <p className="mt-0.5 text-sm text-white/60">{props.subtitle}</p>
            ) : null}
          </div>
          {props.actions ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {props.actions}
            </div>
          ) : null}
        </div>
      </header>
    );
  }

  return (
    <header
      className={detailHeroClass(fixedHeight)}
      data-testid="page-hero"
      data-variant="detail"
    >
      <div className="pointer-events-none absolute -right-8 -top-32 h-80 w-80 rounded-full bg-white/12 blur-sm" />
      <div className="relative flex h-full flex-col justify-between gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {props.breadcrumb && props.breadcrumb.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/60">
              {props.breadcrumb.map((item, index) => (
                <span
                  key={`${item}-${index}`}
                  className="inline-flex items-center gap-2"
                >
                  {index > 0 ? <span className="text-white/40">·</span> : null}
                  <span>{item}</span>
                </span>
              ))}
            </div>
          ) : (
            <span />
          )}
          {props.actions ? (
            <div className="flex shrink-0 items-center gap-1">
              {props.actions}
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-3">
          {props.icon ? (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/12 text-white">
              {props.icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="max-w-[760px] text-2xl font-bold leading-tight tracking-normal text-white md:text-3xl">
              {props.title}
            </h2>
            {props.subtitle ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {props.subtitle}
              </div>
            ) : null}
          </div>
        </div>

        {props.metaPills ? (
          <div className="flex flex-wrap items-center gap-2">
            {props.metaPills}
          </div>
        ) : (
          <span />
        )}
      </div>
    </header>
  );
}
