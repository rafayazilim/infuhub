import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import app from '@/config/firebase';
import { getFirebaseErrorMessage } from '@/lib/firebaseErrorMessages';

const storage = getStorage(app);

const toDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Dosya data URL formatina cevrilemedi'));
    reader.readAsDataURL(file);
  });

// Genel dosya yükleme fonksiyonu
export async function uploadFile(
  file: File,
  path: string
): Promise<string> {
  try {
    const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error: unknown) {
    console.error('Dosya yükleme hatası:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Dosya yüklenirken bir hata oluştu.'));
  }
}

// Dosya silme fonksiyonu
export async function deleteFile(fileURL: string): Promise<void> {
  try {
    const fileRef = ref(storage, fileURL);
    await deleteObject(fileRef);
  } catch (error: unknown) {
    console.error('Dosya silme hatası:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Dosya silinirken bir hata oluştu.'));
  }
}

// Doğrulama fotoğrafı yükle
export async function uploadVerificationPhoto(
  userId: string,
  file: File
): Promise<string> {
  try {
    return await uploadFile(file, `verification-photos/${userId}`);
  } catch (error: unknown) {
    console.error('Fotoğraf yükleme hatası:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Fotoğraf yüklenirken bir hata oluştu.'));
  }
}

// Kampanya görseli yükle
// Not: Storage rules farklı ortamlarda farklı olabildiği için
// marka-bazlı path + geriye dönük fallback path'ler denenir.
export async function uploadCampaignImage(
  brandId: string,
  campaignId: string,
  file: File
): Promise<string> {
  const candidatePaths = [
    `campaign-images/${brandId}/${campaignId}`,
    `campaign-images/${campaignId}`,
    `brand-photos/${brandId}/campaigns/${campaignId}`,
  ];

  let lastError: any = null;

  for (const path of candidatePaths) {
    try {
      return await uploadFile(file, path);
    } catch (error: any) {
      lastError = error;
      // Sonraki path'i dene
    }
  }
  const message = String(lastError?.message || '');
  const isUnauthorized =
    message.includes('storage/unauthorized') ||
    message.includes('403') ||
    message.toLowerCase().includes('permission');

  if (isUnauthorized) {
    try {
      const dataUrl = await toDataUrl(file);
      console.warn('Storage yetkisi yok, kampanya gorseli data-url fallback ile kaydedildi.');
      return dataUrl;
    } catch (fallbackError: unknown) {
      console.error('Data URL fallback hatasi:', fallbackError);
      throw new Error(getFirebaseErrorMessage(fallbackError, 'Görsel yüklenemedi.'));
    }
  }

  console.error('Görsel yükleme hatası:', lastError);
  throw new Error(getFirebaseErrorMessage(lastError, 'Görsel yüklenirken bir hata oluştu.'));
}

// Portfolyo dosyası yükle (PDF veya görsel)
export async function uploadPortfolioFile(
  influencerId: string,
  file: File
): Promise<{ url: string; storagePath: string }> {
  try {
    const fileType = file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : null;
    if (!fileType) {
      throw new Error('Sadece PDF ve görsel dosyaları yüklenebilir.');
    }
    
    const storagePath = `portfolio-items/${influencerId}`;
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `${storagePath}/${fileName}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      url: downloadURL,
      storagePath: `${storagePath}/${fileName}`,
    };
  } catch (error: unknown) {
    console.error('Portfolyo dosyası yükleme hatası:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Portfolyo dosyası yüklenirken bir hata oluştu.'));
  }
}

// Portfolyo dosyası sil
export async function deletePortfolioFile(storagePath: string): Promise<void> {
  try {
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);
  } catch (error: unknown) {
    console.error('Portfolyo dosyası silme hatası:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Portfolyo dosyası silinirken bir hata oluştu.'));
  }
}


