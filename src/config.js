export const SUPABASE_CONFIG = {
  url: "https://iacavguxrbegikjaclgb.supabase.co",
  anonKey: "sb_publishable_iu0gx0fnWyeaWmTujhEvJw_awQjSoES",
  mediaBucket: "live-media",
};

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
}
