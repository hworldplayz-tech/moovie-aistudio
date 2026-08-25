'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground font-sans">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-2xl font-bold">Something went wrong!</h2>
          <p className="text-sm text-muted-foreground">
            {error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
