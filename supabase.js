// supabase.js — loads Supabase UMD (for GitHub Pages) and returns a client (ES module)

let _loading = null;

export function ensureSupabaseLoaded() {
  if (window.supabase && typeof window.supabase.createClient === "function") return Promise.resolve(true);
  if (_loading) return _loading;

  _loading = new Promise((resolve, reject) => {
    try {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
      s.async = true;
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error("Failed to load Supabase JS from CDN"));
      document.head.appendChild(s);
    } catch (e) {
      reject(e);
    }
  });

  return _loading;
}

export async function createSupabaseClient(url, anonKey) {
  await ensureSupabaseLoaded();
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    throw new Error("Supabase library not available after load");
  }
  return window.supabase.createClient(url, anonKey);
}
