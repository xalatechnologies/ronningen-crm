import { use } from "react";

/** Unwrap Next.js 16 async `searchParams` page prop. */
export function usePageSearchParams<T>(searchParams: Promise<T>): T {
  return use(searchParams);
}

/** Unwrap Next.js 16 async `params` page prop. */
export function usePageParams<T>(params: Promise<T>): T {
  return use(params);
}
