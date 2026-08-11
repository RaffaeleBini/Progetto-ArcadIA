interface UserDoc {
  _id: unknown;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  bio?: string | null;
  preferredLanguage: string;
  theme: string;
  subscriptionPlan: string;
  subscriptionExpiresAt?: Date | null;
}

export function toPublicUser(user: UserDoc) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? null,
    preferredLanguage: user.preferredLanguage,
    theme: user.theme,
    subscriptionPlan: user.subscriptionPlan,
    subscriptionExpiresAt: user.subscriptionExpiresAt ?? null,
  };
}

export function toPublicProfile(user: UserDoc) {
  return {
    id: String(user._id),
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? null,
  };
}
