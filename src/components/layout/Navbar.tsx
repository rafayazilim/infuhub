import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, LogIn, UserPlus } from 'lucide-react';

const navLinks = [
  { label: 'Özellikler', href: '#ozellikler' },
  { label: 'Markalar İçin', href: '#markalar' },
  { label: 'Influencerlar İçin', href: '#influencerlar' },
  { label: 'Nasıl Çalışır', href: '#nasil-calisir' },
  { label: 'İletişim', href: '#iletisim' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleAnchorClick = (href: string) => {
    setMobileOpen(false);
    const id = href.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'py-3' : 'py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div
            className={`relative flex items-center justify-between rounded-full border bg-white/70 backdrop-blur-[22px] shadow-[0_12px_40px_rgba(15,23,42,0.18)] transition-all duration-300 ${
              scrolled
                ? 'border-white/40 px-4 md:px-6 py-2'
                : 'border-white/60 px-5 md:px-7 py-3'
            }`}
          >
            <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-white/40 via-white/10 to-white/30 opacity-80" />
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="flex items-center gap-2.5 group"
            >
              <img
                src="/pics/infulogo.png"
                alt="INFUHUB Logo"
                className="h-9 w-auto transition-transform duration-300 group-hover:scale-110"
              />
            </a>

            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleAnchorClick(link.href)}
                  className="px-4 py-2 rounded-full text-sm font-medium text-slate-700 hover:text-[#08afd5] hover:bg-[#08afd5]/10 transition-all duration-200"
                >
                  {link.label}
                </button>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-2">
              <Link
                to="/giris"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-slate-700 border border-slate-200 hover:border-[#08afd5]/40 hover:text-[#08afd5] transition-all duration-200"
              >
                <LogIn size={14} />
                Giriş Yap
              </Link>
              <Link
                to="/kayit-sec"
                className="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-[#08afd5] to-[#0b96b8] shadow-[0_6px_18px_rgba(8,175,213,0.35)] hover:shadow-[0_10px_24px_rgba(8,175,213,0.5)] transition-all duration-300 hover:-translate-y-0.5"
              >
                <UserPlus size={14} />
                Hemen Başla
              </Link>
            </div>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden w-10 h-10 rounded-full bg-white/80 border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-white transition-all"
              aria-label="Menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-0 right-0 w-[300px] max-w-[85vw] h-full bg-white/95 dark:bg-gray-950/95 backdrop-blur-2xl shadow-[-20px_0_60px_rgba(0,0,0,0.15)] p-6 pt-20 flex flex-col gap-2 overflow-y-auto animate-in slide-in-from-right duration-300">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleAnchorClick(link.href)}
                className="w-full text-left px-4 py-3 rounded-full text-base font-medium text-gray-700 dark:text-gray-200 bg-white/20 dark:bg-white/5 backdrop-blur-xl border border-white/30 dark:border-white/10 hover:text-[#08afd5] hover:bg-white/30 dark:hover:bg-white/10 hover:border-[#08afd5]/30 transition-all"
              >
                {link.label}
              </button>
            ))}
            <div className="mt-6 pt-6 border-t border-gray-200/60 dark:border-gray-800/60 space-y-3">
              <Link
                to="/giris"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center px-5 py-3 rounded-full text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white/20 dark:bg-white/5 backdrop-blur-xl border border-white/30 dark:border-white/10 hover:border-[#08afd5]/40 hover:text-[#08afd5] hover:bg-white/30 dark:hover:bg-white/10 transition-all"
              >
                Giriş Yap
              </Link>
              <Link
                to="/kayit-sec"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center px-5 py-3 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-[#08afd5]/90 to-[#0b96b8]/90 backdrop-blur-xl border border-white/30 shadow-[0_4px_20px_rgba(8,175,213,0.35)]"
              >
                Hemen Başla
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
