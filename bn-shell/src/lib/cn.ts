import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const mergeTailwindClasses = extendTailwindMerge({ prefix: "tw-" });

/**
 * Joins class names and resolves conflicting tw- utilities (shadcn pattern).
 * @param {...ClassValue} inputs
 * @returns {string}
 */
export const cn = (...inputs: ClassValue[]): string => mergeTailwindClasses(clsx(inputs));
