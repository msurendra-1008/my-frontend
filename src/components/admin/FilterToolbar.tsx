import { useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@utils/cn';
import { Button } from '@/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';

// ── Types ──────────────────────────────────────────────────────────────────

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  id: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  /** Tailwind width class — defaults to 'w-[130px]' */
  width?: string;
}

export interface ResultCount {
  showing: number;
  total: number;
  label: string;
}

export interface FilterToolbarProps {
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: FilterConfig[];
  resultCount?: ResultCount;
  /** Extra content rendered at the far right of the toolbar row (e.g. "New" buttons) */
  actions?: React.ReactNode;
}

// Sentinel used so Radix Select can represent the "All / reset" state
const RESET = '__reset__';

// ── Component ──────────────────────────────────────────────────────────────

export function FilterToolbar({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  filters,
  resultCount,
  actions,
}: FilterToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  const hasActiveFilters = filters.some((f) => f.value !== '');
  const hasAnything      = hasActiveFilters || searchValue !== '';

  const clearAll = () => {
    onSearchChange('');
    filters.forEach((f) => f.onChange(''));
    inputRef.current?.focus();
  };

  // Icon should disappear when the input has content or is focused
  const iconVisible = !searchValue && !focused;

  return (
    <div className="space-y-2">

      {/* ── Main toolbar row ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 flex-wrap">

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground',
              'transition-opacity duration-150',
              iconVisible ? 'opacity-100' : 'opacity-0',
            )}
          />
          <input
            ref={inputRef}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={searchPlaceholder}
            className={cn(
              'h-9 w-full rounded-md border border-input bg-background pr-8 text-sm shadow-sm',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100',
              'transition-[border-color,box-shadow,padding] duration-150',
              // slide text right to make room for icon only when icon is visible
              iconVisible ? 'pl-9' : 'pl-3',
            )}
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => { onSearchChange(''); inputRef.current?.focus(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Dropdown filters */}
        {filters.map((filter) => (
          <Select
            key={filter.id}
            value={filter.value || undefined}
            onValueChange={(v) => filter.onChange(v === RESET ? '' : v)}
          >
            <SelectTrigger
              className={cn(
                filter.width ?? 'w-[130px]',
                // Active / selected state gets the purple tint
                filter.value
                  ? 'bg-[#EEEDFE] border-[#7F77DD] text-[#3C3489] hover:bg-[#E5E3FB]'
                  : '',
              )}
            >
              <SelectValue placeholder={filter.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {/* "All" reset item */}
              <SelectItem value={RESET} className="text-muted-foreground">
                {filter.placeholder}
              </SelectItem>
              {filter.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {/* Divider + Clear — only when something is active */}
        {hasAnything && (
          <>
            <div className="h-5 w-px bg-border mx-0.5 shrink-0" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="gap-1.5 text-muted-foreground hover:text-foreground shrink-0 px-2"
            >
              <X size={13} />
              Clear
            </Button>
          </>
        )}

        {/* Optional action slot (e.g. "New Category" button) */}
        {actions && <div className="ml-auto shrink-0">{actions}</div>}
      </div>

      {/* ── Below-toolbar: count + active chips ──────────────────────── */}
      {(resultCount || hasActiveFilters) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">

          {/* Result count */}
          {resultCount && (
            <p className="text-xs text-muted-foreground shrink-0">
              Showing{' '}
              <span className="font-medium text-foreground">{resultCount.showing}</span>
              {' '}of{' '}
              <span className="font-medium text-foreground">{resultCount.total}</span>
              {' '}{resultCount.label}
            </p>
          )}

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-1.5">
              {filters
                .filter((f) => f.value !== '')
                .map((f) => {
                  const label =
                    f.options.find((o) => o.value === f.value)?.label ?? f.value;
                  return (
                    <span
                      key={f.id}
                      className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-800 border border-purple-200"
                    >
                      {label}
                      <button
                        type="button"
                        onClick={() => f.onChange('')}
                        className="ml-0.5 rounded-full hover:text-purple-900 transition-colors"
                        aria-label={`Remove ${label} filter`}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
