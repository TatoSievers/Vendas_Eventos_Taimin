// Fix: The triple-slash directive for Vite client types was causing a resolution
// error. To ensure the code compiles without relying on specific tsconfig.json
// settings, we'll access environment variables by casting `import.meta` to `any`.
// This resolves all related TypeScript errors in this file.

import { createClient } from '@supabase/supabase-js';

// Fix: Cast `import.meta` to `any` to access the `env` property. This bypasses
// the TypeScript error "Property 'env' does not exist on type 'ImportMeta'"
// when Vite's type definitions are not found.
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided in environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
