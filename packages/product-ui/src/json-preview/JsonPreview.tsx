import { cn } from '@firebase-desk/ui';
import { useEffect, useState } from 'react';

export function JsonPreview(
  {
    active = true,
    ariaLabel,
    className,
    mode = 'pre',
    value,
  }: {
    readonly active?: boolean;
    readonly ariaLabel?: string;
    readonly className?: string;
    readonly mode?: 'pre' | 'textarea';
    readonly value: unknown;
  },
) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (!active) {
      setText(null);
      return;
    }
    setText(null);
    const timeout = setTimeout(() => {
      setText(formatJson(value));
    }, 0);
    return () => clearTimeout(timeout);
  }, [active, value]);

  if (!active) return null;
  if (text === null) {
    return (
      <div
        className={cn(
          'grid h-full min-h-0 place-items-center text-sm text-text-secondary',
          className,
        )}
      >
        Formatting JSON...
      </div>
    );
  }

  if (mode === 'textarea') {
    return (
      <textarea
        aria-label={ariaLabel ?? 'JSON preview'}
        className={cn(
          'block h-full min-h-0 w-full resize-none border-0 bg-bg-panel p-3 font-mono text-xs text-text-secondary outline-none',
          className,
        )}
        readOnly
        value={text}
      />
    );
  }

  return (
    <pre
      className={cn(
        'h-full min-h-0 select-text overflow-auto rounded-md border border-border-subtle bg-bg-subtle p-3 font-mono text-xs leading-relaxed text-text-secondary',
        className,
      )}
    >
      {text}
    </pre>
  );
}

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}
