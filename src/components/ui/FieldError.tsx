export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      aria-live="polite"
      className="text-xs text-expense"
    >
      {message}
    </div>
  );
}
