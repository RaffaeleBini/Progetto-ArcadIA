import { LoginAttemptModel } from "../models/LoginAttempt.js";
import { NotificationModel } from "../models/Notification.js";
import { UserModel } from "../models/User.js";

const ALERT_THRESHOLD = 5;
const ALERT_WINDOW_MS = 15 * 60 * 1000;

// Registra un login fallito (email+IP, come richiesto dall'audit) e, se
// l'account esiste, avvisa il proprietario in-app al raggiungimento esatto
// della soglia — non ad ogni tentativo successivo, per non spammare
// notifiche durante un attacco a forza bruta prolungato.
export async function recordFailedLoginAttempt(email: string, ip: string): Promise<void> {
  await LoginAttemptModel.create({ email, ip });

  const since = new Date(Date.now() - ALERT_WINDOW_MS);
  const recentAttempts = await LoginAttemptModel.countDocuments({ email, createdAt: { $gte: since } });

  if (recentAttempts !== ALERT_THRESHOLD) {
    return;
  }

  const user = await UserModel.findOne({ email });
  if (!user) {
    return;
  }

  await NotificationModel.create({
    recipient: user._id,
    type: "security_alert",
    message: `Rilevati ${ALERT_THRESHOLD} tentativi di accesso falliti sul tuo account nelle ultime 15 minuti. Se non sei stato tu, valuta di cambiare la password.`,
  });
}
