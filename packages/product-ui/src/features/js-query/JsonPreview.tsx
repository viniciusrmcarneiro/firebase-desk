import { cn } from '@firebase-desk/ui';

export function JsonPreview(
  { className, value }: { readonly className?: string; readonly value: unknown; },
) {
  return (
    <pre
      className={cn(
        'overflow-auto rounded-md border border-border-subtle bg-bg-subtle p-3 font-mono text-xs leading-relaxed text-text-secondary',
        className,
      )}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
