import React from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-transparent text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-2xl font-bold text-purple-400 mb-4">İNFUHUB</h3>
            <p className="text-gray-400">
              Markalar ve influencer'ları bir araya getiren platform
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Hızlı Linkler</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-white transition">
                  Ana Sayfa
                </Link>
              </li>
              <li>
                <Link to="/giris" className="text-gray-400 hover:text-white transition">
                  Giriş Yap
                </Link>
              </li>
              <li>
                <Link to="/kayit-sec" className="text-gray-400 hover:text-white transition">
                  Kayıt Ol
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Destek</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition">
                  SSS
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition">
                  İletişim
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Yasal</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition">
                  Gizlilik Politikası
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition">
                  Kullanım Koşulları
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 İNFUHUB. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </footer>
  );
}
