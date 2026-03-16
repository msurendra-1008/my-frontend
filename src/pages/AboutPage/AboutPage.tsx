import { Card } from '@components/ui';

const features = [
  { title: 'React 19 + TypeScript', description: 'Latest React with full TypeScript strict mode for type-safe development.' },
  { title: 'Vite', description: 'Lightning-fast build tool with HMR and optimized production builds.' },
  { title: 'Path Aliases', description: 'Clean imports using @components, @hooks, @utils, etc.' },
  { title: 'Tailwind CSS + shadcn/ui', description: 'Utility-first styling with beautiful, accessible components out of the box.' },
  { title: 'Reusable Components', description: 'Button, Input, Card, Badge, Spinner with variants and accessibility.' },
  { title: 'Custom Hooks', description: 'useLocalStorage, useDebounce, useFetch, useMediaQuery ready to use.' },
];

export function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground">About This Starter</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        This project is a production-ready React + TypeScript starter built with scalability and developer experience in mind.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title} title={feature.title}>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
