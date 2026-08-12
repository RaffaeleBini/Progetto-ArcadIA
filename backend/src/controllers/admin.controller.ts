import type { Request, Response } from "express";
import { z } from "zod";
import { UserModel } from "../models/User.js";
import { sendError } from "../utils/apiError.js";
import { toPublicUser } from "../utils/publicUser.js";

export const subscriptionSchema = z.object({
  subscriptionPlan: z.enum(["free", "premium"]),
  subscriptionExpiresAt: z.coerce.date().nullable().optional(),
});

export async function setSubscription(req: Request, res: Response) {
  const { subscriptionPlan, subscriptionExpiresAt } = req.body as z.infer<typeof subscriptionSchema>;

  const user = await UserModel.findByIdAndUpdate(
    req.params.id,
    { subscriptionPlan, subscriptionExpiresAt: subscriptionExpiresAt ?? null },
    { new: true }
  );

  if (!user) {
    sendError(res, 404, "Utente non trovato");
    return;
  }

  res.json({ user: toPublicUser(user) });
}
