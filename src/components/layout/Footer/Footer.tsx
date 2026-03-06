import styles from './Footer.module.css';

interface FooterProps {
  copyright?: string;
  links?: { label: string; href: string }[];
}

export function Footer({ copyright = `© ${new Date().getFullYear()} MyApp. All rights reserved.`, links }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.copyright}>{copyright}</p>
        {links && links.length > 0 && (
          <nav className={styles.links} aria-label="Footer navigation">
            {links.map((link) => (
              <a key={link.href} href={link.href} className={styles.link} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </footer>
  );
}
