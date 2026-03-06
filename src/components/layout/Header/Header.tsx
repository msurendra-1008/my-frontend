import { Link, NavLink } from 'react-router-dom';
import { cn } from '@utils/cn';
import styles from './Header.module.css';

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
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          {logo ?? <span className={styles.logoText}>MyApp</span>}
        </Link>

        <nav className={styles.nav} aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(styles.navLink, isActive && styles.active)}
              end={item.to === '/'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </header>
  );
}
