import { Button, Card, Badge, Input } from '@components/ui';
import { useState } from 'react';
import styles from './HomePage.module.css';

export function HomePage() {
  const [inputValue, setInputValue] = useState('');

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>React + TypeScript Starter</h1>
        <p className={styles.heroSubtitle}>
          A well-structured project template with reusable components, custom hooks, and best practices built in.
        </p>
        <div className={styles.heroActions}>
          <Button size="lg">Get Started</Button>
          <Button size="lg" variant="outline">
            View Docs
          </Button>
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>UI Components</h2>
        <div className={styles.grid}>
          <Card title="Buttons" description="Multiple variants and sizes">
            <div className={styles.componentGroup}>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
            <div className={styles.componentGroup}>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button isLoading>Loading</Button>
            </div>
          </Card>

          <Card title="Badges" description="Status indicators">
            <div className={styles.componentGroup}>
              <Badge>Default</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
              <Badge variant="info">Info</Badge>
            </div>
          </Card>

          <Card title="Inputs" description="Form controls">
            <div className={styles.inputGroup}>
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
