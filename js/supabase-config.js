/**
 * Supabase LOCAL (Docker).
 *
 * No PC:     http://127.0.0.1:54321
 * No celular (mesma Wi‑Fi): a URL é trocada automaticamente pelo IP
 *            do host de onde a página foi aberta (ex.: http://192.168.x.x:8080).
 *
 * Subir banco:  npx supabase start
 * Servir o jogo para o celular:
 *   python -m http.server 8080 --bind 0.0.0.0
 *   Abra no celular: http://SEU_IP_DO_PC:8080
 *
 * Em produção na nuvem, use a URL https://xxxx.supabase.co
 */
(function (global) {
  const DEFAULT_URL = "http://127.0.0.1:54321";
  const ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

  function resolveApiUrl(configured) {
    const base = configured || DEFAULT_URL;
    try {
      const u = new URL(base);
      const pageHost =
        typeof location !== "undefined" ? location.hostname : "";
      if (
        pageHost &&
        pageHost !== "localhost" &&
        pageHost !== "127.0.0.1" &&
        (u.hostname === "127.0.0.1" || u.hostname === "localhost")
      ) {
        u.hostname = pageHost;
      }
      return u.origin;
    } catch (_) {
      return base;
    }
  }

  global.SUPABASE_CONFIG = {
    url: resolveApiUrl(DEFAULT_URL),
    anonKey: ANON_KEY,
    /** URL base configurada antes do rewrite (debug) */
    configuredUrl: DEFAULT_URL,
  };
})(window);
