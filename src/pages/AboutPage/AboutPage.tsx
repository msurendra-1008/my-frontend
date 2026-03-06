import { Card } from '@components/ui';
import styles from './AboutPage.module.css';

const features = [
  { title: 'React 19 + TypeScript', description: 'Latest React with full TypeScript strict mode for type-safe development.' },
  { title: 'Vite', description: 'Lightning-fast build tool with HMR and optimized production builds.' },
  { title: 'Path Aliases', description: 'Clean imports using @components, @hooks, @utils, etc.' },
  { title: 'CSS Modules', description: 'Scoped styles per component, zero runtime overhead, full IDE support.' },
  { title: 'Reusable Components', description: 'Button, Input, Card, Badge, Spinner with variants and accessibility.' },
  { title: 'Custom Hooks', description: 'useLocalStorage, useDebounce, useFetch, useMediaQuery ready to use.' },
];

export function AboutPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>About This Starter</h1>
      <p className={styles.intro}>
        This project is a production-ready React + TypeScript starter built with scalability and developer experience in mind.
      </p>

      <div className={styles.grid}>
        {features.map((feature) => (
          <Card key={feature.title} title={feature.title}>
            <p className={styles.featureDesc}>{feature.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
