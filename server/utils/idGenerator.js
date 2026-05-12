// Benzersiz ID oluşturma fonksiyonu
function generateUniqueId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = { generateUniqueId };
