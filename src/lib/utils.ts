import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as USD rounded to the nearest dime (1 decimal place). */
export function fmtUSD(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}
