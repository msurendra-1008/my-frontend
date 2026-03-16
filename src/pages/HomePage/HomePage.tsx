import { Button, Card, Badge, Input } from '@components/ui';
import { useState } from 'react';

export function HomePage() {
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-12">
      {/* Hero */}
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          React + TypeScript Starter
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          A well-structured project template with reusable components, custom hooks, and best practices built in.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button size="lg">Get Started</Button>
          <Button size="lg" variant="outline">View Docs</Button>
        </div>
      </section>

      {/* Components showcase */}
      <section>
        <h2 className="mb-6 text-2xl font-semibold text-foreground">UI Components</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card title="Buttons" description="Multiple variants and sizes">
            <div className="flex flex-wrap gap-2">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button isLoading>Loading</Button>
            </div>
          </Card>

          <Card title="Badges" description="Status indicators">
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
              <Badge variant="info">Info</Badge>
            </div>
          </Card>

          <Card title="Inputs" description="Form controls">
            <div className="space-y-3">
              <Input
                label="Email address"
                placeholder="you@example.com"
                type="email"
                fullWidth
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                hint="We'll never share your email."
              />
              <Input label="With error" placeholder="Enter value" fullWidth error="This field is required" />
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
