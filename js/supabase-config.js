/**
 * Supabase — local (Docker) + produção (Vercel).
 *
 * Local PC:     http://127.0.0.1:54321
 * Celular LAN:  troca o host só se a página estiver em IP privado (192.168 / 10 / 172.16–31)
 *
 * Produção (https://destart.vercel.app):
 *   - NÃO usa :54321 (isso gerava Mixed Content / Failed to fetch)
 *   - Preencha CLOUD_URL + CLOUD_ANON com o projeto em supabase.com
 *   - Se vazio, cadastro fica só no localStorage (jogo segue normal)
 *
 * Subir banco local: npx supabase start
 */
(function (global) {
  const LOCAL_URL = "http://127.0.0.1:54321";
  const LOCAL_ANON =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

  /** Produção (Supabase Cloud). Ex.: "https://xxxx.supabase.co" */
  const CLOUD_URL = "";
  /** anon / publishable key do projeto na nuvem */
  const CLOUD_ANON = "";

  function isPrivateHost(host) {
    if (!host) return true;
    if (host === "localhost" || host === "127.0.0.1") return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    return false;
  }

  function buildConfig() {
    const pageHost =
      typeof location !== "undefined" ? location.hostname || "" : "";
    const pageProto =
      typeof location !== "undefined" ? location.protocol || "" : "";
    const onPrivateNet = isPrivateHost(pageHost);

    // Site público (Vercel etc.) → só cloud HTTPS
    if (!onPrivateNet) {
      if (CLOUD_URL && CLOUD_ANON && /^https:\/\//i.test(CLOUD_URL)) {
        return {
          url: CLOUD_URL.replace(/\/$/, ""),
          anonKey: CLOUD_ANON,
          enabled: true,
          mode: "cloud",
        };
      }
      return {
        url: "",
        anonKey: "",
        enabled: false,
        mode: "localStorage-only",
      };
    }

    // Rede local / LAN → Docker
    try {
      const u = new URL(LOCAL_URL);
      if (
        pageHost &&
        pageHost !== "localhost" &&
        pageHost !== "127.0.0.1" &&
        (u.hostname === "127.0.0.1" || u.hostname === "localhost")
      ) {
        u.hostname = pageHost;
      }
      let url = u.origin;
      // Página HTTPS nunca pode chamar API HTTP (Mixed Content)
      if (pageProto === "https:" && url.indexOf("http:") === 0) {
        return {
          url: "",
          anonKey: "",
          enabled: false,
          mode: "blocked-mixed-content",
        };
      }
      return {
        url: url,
        anonKey: LOCAL_ANON,
        enabled: true,
        mode: "local",
      };
    } catch (_) {
      return {
        url: LOCAL_URL,
        anonKey: LOCAL_ANON,
        enabled: true,
        mode: "local",
      };
    }
  }

  const resolved = buildConfig();

  global.SUPABASE_CONFIG = {
    url: resolved.url,
    anonKey: resolved.anonKey,
    enabled: resolved.enabled,
    mode: resolved.mode,
    configuredUrl: LOCAL_URL,
  };
})(window);
