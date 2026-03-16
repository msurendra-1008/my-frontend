interface FooterProps {
  copyright?: string;
  links?: { label: string; href: string }[];
}

export function Footer({ copyright = `© ${new Date().getFullYear()} MyApp. All rights reserved.`, links }: FooterProps) {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <p className="text-sm text-muted-foreground">{copyright}</p>
        {links && links.length > 0 && (
          <nav className="flex items-center gap-4" aria-label="Footer navigation">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </footer>
  );
}
