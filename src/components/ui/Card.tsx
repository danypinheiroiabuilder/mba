export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        "rounded-3xl border border-border bg-card/45 p-4 shadow-[0_22px_60px_-46px_var(--shadow)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

