import { Button, InlineAlert } from '@firebase-desk/ui';
import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface RenderErrorBoundaryProps {
  readonly children: ReactNode;
  readonly label: string;
  readonly onError?: ((message: string) => void) | undefined;
  readonly resetKey: string;
}

interface RenderErrorBoundaryState {
  readonly error: Error | null;
}

export class RenderErrorBoundary extends Component<
  RenderErrorBoundaryProps,
  RenderErrorBoundaryState
> {
  override readonly state: RenderErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RenderErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    this.props.onError?.(messageFromError(error));
  }

  override componentDidUpdate(previousProps: RenderErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  override render() {
    const { children, label } = this.props;
    const { error } = this.state;
    if (!error) return children;
    return (
      <section className='grid h-full min-h-0 place-items-center bg-bg-app p-4'>
        <div className='grid w-full max-w-xl gap-3'>
          <InlineAlert variant='danger'>
            {label} failed: {messageFromError(error)}
          </InlineAlert>
          <div className='flex justify-end'>
            <Button variant='secondary' onClick={() => this.setState({ error: null })}>
              Retry view
            </Button>
          </div>
        </div>
      </section>
    );
  }
}

function messageFromError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Unexpected render error.';
}
