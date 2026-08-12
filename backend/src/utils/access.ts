interface AccessUser {
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
  if (user.subscriptionPlan !== "premium") {
    return false;
  }
  if (user.subscriptionExpiresAt && user.subscriptionExpiresAt.getTime() < Date.now()) {
    return false;
  }
  return true;
}
