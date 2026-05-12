import React from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Instagram, Twitter, Linkedin, Mail, MapPin } from 'lucide-react';

function TikTokIcon({ className, ...rest }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
      {...rest}
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

const footerLinks = [
  {
    title: 'Platform',
    links: [
      { label: 'Özellikler', href: '#ozellikler' },
      { label: 'Markalar İçin', href: '#markalar' },
      { label: 'Influencerlar İçin', href: '#influencerlar' },
      { label: 'Nasıl Çalışır', href: '#nasil-calisir' },
    ],
  },
  {
    title: 'Hesap',
    links: [
      { label: 'Giriş Yap', to: '/giris' },
      { label: 'Kayıt Ol', to: '/kayit-sec' },
    ],
  },
  {
    title: 'Yasal',
    links: [
      { label: 'Gizlilik Politikası', href: '#' },
      { label: 'Kullanım Koşulları', href: '#' },
      { label: 'KVKK', href: '#' },
    ],
  },
];

const socialLinks: {
  Icon: LucideIcon | React.FC<React.SVGProps<SVGSVGElement>>;
  href: string;
  label: string;
}[] = [
  { Icon: Instagram, href: '#', label: 'Instagram' },
  { Icon: TikTokIcon, href: '#', label: 'TikTok' },
  { Icon: Twitter, href: '#', label: 'Twitter' },
  { Icon: Linkedin, href: '#', label: 'LinkedIn' },
];

export function Footer() {
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const id = href.replace('#', '');
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <footer className="relative pt-16 pb-8 overflow-hidden border-t border-gray-200/40 dark:border-white/5">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[60%] rounded-full bg-[#08afd5]/[0.02] blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <img 
                src="/pics/infulogo.png" 
                alt="INFUHUB Logo" 
                className="h-8 w-auto"
              />
            </div>
            <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed max-w-xs mb-4">
              Markaları ve içerik üreticilerini bir araya getiren, influencer marketing süreçlerini tek merkezden yönetmeyi sağlayan platform.
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              {socialLinks.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-[#08afd5] hover:border-[#08afd5]/30 hover:bg-[#08afd5]/5 transition-all duration-200 leading-none"
                >
                  <Icon
                    className="size-3.5 shrink-0 block text-current"
                    strokeWidth={2}
                    aria-hidden
                  />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="text-[10px] font-semibold text-gray-900 dark:text-white mb-3">{group.title}</h4>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {'to' in link && link.to ? (
                      <Link
                        to={link.to}
                        className="text-[10px] text-gray-600 dark:text-gray-400 hover:text-[#08afd5] transition-colors duration-200"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={'href' in link ? link.href : '#'}
                        onClick={(e) => handleAnchorClick(e, 'href' in link ? link.href || '#' : '#')}
                        className="text-[10px] text-gray-600 dark:text-gray-400 hover:text-[#08afd5] transition-colors duration-200"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-gray-200/40 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-gray-500 dark:text-gray-500">
            © 2026 INFUHUB. Tüm hakları saklıdır.
          </p>
          <div className="flex items-center gap-4 text-[10px] text-gray-500 dark:text-gray-500">
            <span className="inline-flex items-center gap-1.5 leading-none">
              <Mail className="size-2.5 shrink-0" strokeWidth={2} aria-hidden />
              hi@infuhub.com
            </span>
            <span className="inline-flex items-center gap-1.5 leading-none">
              <MapPin className="size-2.5 shrink-0" strokeWidth={2} aria-hidden />
              İstanbul, Türkiye
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
