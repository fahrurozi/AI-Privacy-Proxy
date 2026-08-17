import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString() + ' ' + new Date(timestamp).toLocaleTimeString();
}

export function truncate(str: string, maxLen = 20): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen / 2) + '...' + str.slice(-maxLen / 2);
}
