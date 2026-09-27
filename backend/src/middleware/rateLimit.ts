import rateLimit from "express-rate-limit";

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: "Troppi tentativi, riprova più tardi" },
});

// Limite generico per l'intera app: protegge le rotte che non hanno un
// limiter dedicato, senza intralciare l'uso normale.
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: "Troppe richieste, riprova più tardi" },
});

// Più stretto per gli upload (avatar, copertine corso): limita spam e
// consumo di spazio Cloudinary anche da un account autenticato.
export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: "Troppi caricamenti, riprova più tardi" },
});

// Endpoint pubblico di verifica certificato: nessun'altra protezione oltre
// a questa, per scoraggiare tentativi automatizzati di indovinare codici.
export const verifyRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: "Troppe richieste, riprova più tardi" },
});
