// Type declarations for Deno Edge Functions
// This file tells TypeScript to ignore Deno-specific imports

declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js';
}

declare module 'https://esm.sh/@supabase/supabase-js@2.38.0' {
  export * from '@supabase/supabase-js';
}

// Declare Deno global for Edge Functions
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};
