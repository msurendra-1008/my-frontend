import { useAuth } from '@context/AuthContext';
import styles from './DashboardPage.module.css';

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statSub}>{sub}</p>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const joined = user?.created_at
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(user.created_at))
    : '—';

  return (
    <div className={styles.page}>
      <div className={styles.welcome}>
        <div>
          <h1 className={styles.heading}>
            Welcome back, {user?.first_name || user?.email}!
          </h1>
          <p className={styles.sub}>Here&apos;s what&apos;s happening with your account today.</p>
        </div>
      </div>

      <div className={styles.stats}>
        <StatCard label="Account Status" value="Active" sub="Your account is in good standing" />
        <StatCard label="Member Since" value={joined} sub="Thank you for being with us" />
        <StatCard label="Email" value={user?.email ?? '—'} sub="Primary contact address" />
        <StatCard label="Full Name" value={user?.full_name || '—'} sub="Displayed across your profile" />
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actions}>
          <a href="/dashboard/account" className={styles.actionCard}>
            <span className={styles.actionIcon}>👤</span>
            <span className={styles.actionLabel}>Edit Profile</span>
            <span className={styles.actionArrow}>→</span>
          </a>
          <a href="/dashboard/settings" className={styles.actionCard}>
            <span className={styles.actionIcon}>⚙️</span>
            <span className={styles.actionLabel}>Settings</span>
            <span className={styles.actionArrow}>→</span>
          </a>
        </div>
      </div>
    </div>
  );
}
