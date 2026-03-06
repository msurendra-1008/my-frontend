import { clsx, type ClassValue } from 'clsx';

/**
 * Merges class names using clsx.
 * Usage: cn('base-class', condition && 'conditional-class', { 'object-class': true })
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
