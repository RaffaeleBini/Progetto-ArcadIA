interface AccessUser {
  role?: string;
  subscriptionPlan: string;
  subscriptionExpiresAt?: Date | null;
}

interface AccessCourse {
  accessLevel: string;
}

export function hasAccessToCourse(user: AccessUser, course: AccessCourse): boolean {
  if (course.accessLevel !== "premium") {
    return true;
  }
  // Gli admin vedono anche i contenuti premium, per controllarli senza assegnarsi un piano.
  if (user.role === "admin") {
    return true;
  }
  if (user.subscriptionPlan !== "premium") {
    return false;
  }
  if (user.subscriptionExpiresAt && user.subscriptionExpiresAt.getTime() < Date.now()) {
    return false;
  }
  return true;
}
