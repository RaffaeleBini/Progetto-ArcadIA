import { useEffect } from "react";

interface SeoOptions {
  title: string;
  description: string;
  /** false per pagine pubbliche senza valore di indicizzazione (login, registrazione, verifica certificato). */
  indexable?: boolean;
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

/**
 * Imposta title/description/canonical/Open Graph per la pagina corrente.
 * Pensato solo per le rotte pubbliche (SPA client-side, nessun SSR): le
 * pagine dietro login non hanno bisogno di metadati per i motori di ricerca.
 */
export function useSeo({ title, description, indexable = true }: SeoOptions) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", indexable ? "index, follow" : "noindex, follow");

    const canonicalUrl = `${window.location.origin}${window.location.pathname}`;
    upsertCanonical(canonicalUrl);

    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:type", "website");

    return () => {
      document.title = previousTitle;
    };
  }, [title, description, indexable]);
}
