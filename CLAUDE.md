# Frontend Development Rules

## Admin Layout

All admin pages that use `AdminSidebar` must use this exact outer wrapper structure to ensure the sidebar fills the full viewport height and the content area scrolls independently:

```tsx
// ✅ Correct
<div className="flex h-screen overflow-hidden bg-background">
  <AdminSidebar ... />
  <div className="flex flex-1 flex-col overflow-hidden">
    <header ...>...</header>
    <main className="flex-1 overflow-y-auto p-4 md:p-6">...</main>
  </div>
</div>

// ❌ Wrong — sidebar will not reach bottom of viewport
<div className="flex min-h-screen bg-background">
```

## Color / Dark Mode Rules

**Never use hardcoded light colors** for backgrounds or text. They are invisible or unreadable in dark mode.

### Backgrounds — use opacity-based utilities

| Purpose | ✅ Use | ❌ Never use |
|---|---|---|
| Muted card / section | `bg-muted/50` or `bg-muted/30` | `bg-white`, `background: '#fff'` |
| Success / green alert | `bg-green-500/10` | `bg-green-50` |
| Warning / amber alert | `bg-amber-500/10` | `bg-amber-50` |
| Error / red alert | `bg-red-500/10` | `bg-red-50` |
| Info / blue alert | `bg-blue-500/10` | `bg-blue-50` |
| Page background | `bg-background` | `bg-white` |
| Card background | `bg-card` | `bg-white` |

### Text — always pair semantic + dark variant

| Purpose | ✅ Use |
|---|---|
| Body text | `text-foreground` |
| Secondary / labels | `text-muted-foreground` |
| Green (success / lower price) | `text-green-600 dark:text-green-400` |
| Red (error / higher price) | `text-red-600 dark:text-red-400` |
| Amber (warning) | `text-amber-700 dark:text-amber-400` |
| Blue (info) | `text-blue-700 dark:text-blue-400` |

### Alert borders

Use `border-*/400/40` (transparent border) instead of solid light borders:
```
border-green-400/40   ← ✅
border-green-200      ← ❌ invisible in dark mode
```

### Example — theme-aware alert box

```tsx
// ✅ Works in both light and dark mode
<div className="rounded-md border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
  Warning message
</div>

// ❌ Invisible in dark mode
<div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
  Warning message
</div>
```
