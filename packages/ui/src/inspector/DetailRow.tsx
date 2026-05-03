export interface DetailRowProps {
  readonly label: string;
  readonly value: string;
}

export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className='flex items-center justify-between gap-3 border-b border-border-subtle pb-1 text-sm'>
      <span className='text-text-muted'>{label}</span>
      <span className='min-w-0 select-text truncate font-mono text-xs text-text-secondary'>
        {value}
      </span>
    </div>
  );
}
