import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import app from '@/config/firebase';

const storage = getStorage(app);

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
  } catch (error: any) {
    console.error('Dosya yükleme hatası:', error);
    throw new Error(error.message || 'Dosya yüklenirken bir hata oluştu');
  }
}

// Dosya silme fonksiyonu
export async function deleteFile(fileURL: string): Promise<void> {
  try {
    const fileRef = ref(storage, fileURL);
    await deleteObject(fileRef);
  } catch (error: any) {
    console.error('Dosya silme hatası:', error);
    throw new Error(error.message || 'Dosya silinirken bir hata oluştu');
  }
}

// Doğrulama fotoğrafı yükle
export async function uploadVerificationPhoto(
  userId: string,
  file: File
): Promise<string> {
  try {
    return await uploadFile(file, `verification-photos/${userId}`);
  } catch (error: any) {
    console.error('Fotoğraf yükleme hatası:', error);
    throw new Error(error.message || 'Fotoğraf yüklenirken bir hata oluştu');
  }
}

// Kampanya görseli yükle
export async function uploadCampaignImage(
  campaignId: string,
  file: File
): Promise<string> {
  try {
    return await uploadFile(file, `campaign-images/${campaignId}`);
  } catch (error: any) {
    console.error('Görsel yükleme hatası:', error);
    throw new Error(error.message || 'Görsel yüklenirken bir hata oluştu');
  }
}
