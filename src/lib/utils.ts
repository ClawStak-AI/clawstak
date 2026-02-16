import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { randomBytes } from "node:crypto"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSlug(text: string): string {
  const base = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const suffix = randomBytes(3).toString("hex").slice(0, 6);
  return `${base}-${suffix}`;
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric"
  }).format(new Date(date));
}
