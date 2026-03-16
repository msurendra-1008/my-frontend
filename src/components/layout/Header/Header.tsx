import { Link, NavLink } from 'react-router-dom';
import { cn } from '@utils/cn';

interface NavItem {
  label: string;
  to: string;
}

interface HeaderProps {
  logo?: React.ReactNode;
  navItems?: NavItem[];
  actions?: React.ReactNode;
}

const defaultNavItems: NavItem[] = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
];

export function Header({ logo, navItems = defaultNavItems, actions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="font-semibold text-foreground transition-colors hover:text-primary">
          {logo ?? <span>MyApp</span>}
        </Link>

        <nav className="flex items-center gap-6" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn('text-sm transition-colors hover:text-primary', isActive ? 'font-medium text-primary' : 'text-muted-foreground')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
