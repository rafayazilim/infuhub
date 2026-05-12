# Realtime Database — `supportMessages` kuralları

İletişim formundan gelen mesajların yazılabilmesi ve yalnızca adminlerin okuyabilmesi için kök `rules` nesnesine aşağıdaki bloğu **ekleyin** (mevcut kurallarla birleştirin).

Tam parça: `rtdb-rules-supportMessages.json` dosyasına bakın.

Özet:

- `supportMessages`: okuma yalnızca `admins/{auth.uid}` kaydı olan kullanıcılar.
- `supportMessages/{pushId}`: yalnızca **yeni kayıt** (güncelleme/silme yok); alan doğrulaması `category`, `email`, `phone`, `message`, `createdAt` ve isteğe bağlı `senderUid`.

Firebase Console → Realtime Database → Rules içinde birleştirip **Yayınla** yapın.
