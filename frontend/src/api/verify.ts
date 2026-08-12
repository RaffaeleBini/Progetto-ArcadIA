import { apiClient } from "./client";

export interface CertificateVerification {
  userName: string;
  courseTitle: string;
  completedAt: string;
  certificateId: string;
}

export async function verifyCertificate(certificateId: string): Promise<CertificateVerification> {
  const { data } = await apiClient.get<CertificateVerification>(`/api/verify/${certificateId}`);
  return data;
}
