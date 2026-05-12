import { ref, set, update } from 'firebase/database';
import { database } from '@/config/firebase';
import { uploadFile, uploadVerificationPhoto } from '@/services/firebaseStorageService';

interface SubmitVerificationRequestParams {
  userId: string;
  userType: 'brand' | 'influencer';
  fullNameOrBrandName: string;
  email: string;
  file: File;
}

export async function submitVerificationRequest({
  userId,
  userType,
  fullNameOrBrandName,
  email,
  file,
}: SubmitVerificationRequestParams): Promise<string> {
  const documentURL =
    userType === 'influencer'
      ? await uploadVerificationPhoto(userId, file)
      : await uploadFile(file, `brand-verification-documents/${userId}`);

  const now = new Date().toISOString();
  const requestPayload = {
    id: userId,
    userId,
    userType,
    name: fullNameOrBrandName,
    email,
    documentURL,
    status: 'beklemede' as const,
    createdAt: now,
    updatedAt: now,
  };

  await set(ref(database, `verificationRequests/${userType}/${userId}`), requestPayload);

  const userPath = userType === 'brand' ? `brands/${userId}` : `influencers/${userId}`;
  await update(ref(database, userPath), {
    verificationRequestStatus: 'beklemede',
    verificationDocumentURL: documentURL,
    /** Red sonrası yeniden talepte hesap durumu tekrar incelemede */
    status: 'beklemede',
    updatedAt: now,
  });

  return documentURL;
}
