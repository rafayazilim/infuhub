import { auth } from '@/config/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser || (await waitForAuthUser());
  if (!user) return {};
  const token = await user.getIdToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function waitForAuthUser(timeoutMs = 2000): Promise<User | null> {
  return new Promise((resolve) => {
    let unsubscribe = () => {};
    const timer = setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, timeoutMs);

    unsubscribe = onAuthStateChanged(auth, (u) => {
      clearTimeout(timer);
      unsubscribe();
      resolve(u);
    });
  });
}
