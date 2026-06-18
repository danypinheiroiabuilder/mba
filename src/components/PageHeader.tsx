"use client";

type HeadingLevel = "h1" | "h2";

interface PageHeaderProps {
  label: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  as?: HeadingLevel;
}

export function PageHeader({ label, title, subtitle, actions, as = "h2" }: PageHeaderProps) {
  const Heading = as;
  const headingClassName = "text-2xl font-semibold tracking-tight text-text";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="text-sm font-medium text-muted">{label}</div>
        <Heading className={headingClassName}>{title}</Heading>
        {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
