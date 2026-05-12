import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-purple-600">
            İNFUHUB
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/giris">
              <Button variant="ghost">Giriş Yap</Button>
            </Link>
            <Link to="/kayit-sec">
              <Button>Kayıt Ol</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
