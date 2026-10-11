import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useConsent } from "../context/ConsentContext";
import { trackPageView } from "../lib/analytics";

/**
 * Invia una pageview a Google Analytics a ogni cambio di rotta, incluso il
 * primo mount: necessario perché gtag di per sé registra solo il caricamento
 * iniziale della SPA, non la navigazione client-side di React Router.
 * Non renderizza nulla, va montato una sola volta dentro <BrowserRouter>.
 */
export default function AnalyticsRouteTracker() {
  const location = useLocation();
  const { preferences } = useConsent();

  useEffect(() => {
    if (!preferences.analytics) return;
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search, preferences.analytics]);

  return null;
}
