import { Link } from 'react-router-dom';
import { Button } from '@components/ui';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-7xl font-bold text-primary">404</p>
      <h1 className="text-2xl font-semibold text-foreground">Page not found</h1>
      <p className="max-w-sm text-muted-foreground">Sorry, we couldn&apos;t find the page you&apos;re looking for.</p>
      <Link to="/">
        <Button variant="primary">Go back home</Button>
      </Link>
    </div>
  );
}
