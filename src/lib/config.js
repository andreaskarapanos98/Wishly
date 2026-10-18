export const config = {
  clerkPublishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
}

export const missingConfig = Object.entries({
  VITE_CLERK_PUBLISHABLE_KEY: config.clerkPublishableKey,
  VITE_SUPABASE_URL: config.supabaseUrl,
  VITE_SUPABASE_PUBLISHABLE_KEY: config.supabaseKey,
})
  .filter(([, value]) => !value || value.includes('xxxx'))
  .map(([name]) => name)
