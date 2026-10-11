const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const SCRIPT_ID = "ga-gtag-script";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

function gtag(...args: unknown[]) {
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(args);
}

/**
 * Inietta lo script gtag.js la prima volta che serve (idempotente). Va
 * attivata solo dopo che l'utente ha dato consenso esplicito alla categoria
 * "analytics" nel banner cookie (vedi ConsentContext): nessuno script non
 * essenziale deve caricarsi prima del consenso.
 *
 * `send_page_view: false` perché ArcadIA è una SPA con un solo index.html:
 * la pageview iniziale, come tutte le successive, viene inviata da
 * trackPageView a ogni cambio di rotta (AnalyticsRouteTracker), non dalla
 * config stessa — altrimenti la prima pagina vista verrebbe contata due volte.
 */
function ensureGtagLoaded() {
  if (!GA_MEASUREMENT_ID || document.getElementById(SCRIPT_ID)) {
    return;
  }

  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

export function loadGoogleAnalytics() {
  ensureGtagLoaded();
}

/**
 * Da chiamare a ogni cambio di rotta (anche la prima, al mount) mentre il
 * consenso analytics è attivo — vedi AnalyticsRouteTracker. Si auto-inizializza:
 * funziona anche se è la primissima chiamata dopo il consenso, senza dipendere
 * dall'ordine in cui React esegue gli effect dei vari provider.
 */
export function trackPageView(path: string) {
  if (!GA_MEASUREMENT_ID) {
    return;
  }
  ensureGtagLoaded();
  gtag("event", "page_view", { page_path: path, page_location: window.location.href });
}

/**
 * Rimuove lo script e azzera i cookie `_ga*`: usata quando l'utente revoca
 * il consenso analytics dopo averlo concesso in precedenza nella stessa
 * sessione. Non garantisce che Google interrompa il tracciamento già in
 * corso in quella pagina — un refresh completa la pulizia.
 */
export function revokeGoogleAnalytics() {
  document.getElementById(SCRIPT_ID)?.remove();
  window.dataLayer = [];
  document.cookie.split(";").forEach((entry) => {
    const name = entry.split("=")[0]?.trim();
    if (name?.startsWith("_ga")) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  });
}

export function isGoogleAnalyticsConfigured(): boolean {
  return Boolean(GA_MEASUREMENT_ID);
}
