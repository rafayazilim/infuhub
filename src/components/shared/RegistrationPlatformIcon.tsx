import React from 'react';
import { Share2 } from 'lucide-react';
import { FaInstagram, FaTiktok, FaYoutube } from 'react-icons/fa';
import { SiPinterest, SiSnapchat, SiTwitch, SiKick, SiLinkedin } from 'react-icons/si';
import {
  REGISTRATION_PLATFORM_DEFS,
  type RegistrationPlatformId,
} from '@/constants/registrationPlatforms';

type Props = {
  platformId: string;
  size?: number;
  className?: string;
};

function isRegistrationPlatformId(id: string): id is RegistrationPlatformId {
  return REGISTRATION_PLATFORM_DEFS.some((d) => d.id === id);
}

export function RegistrationPlatformIcon({ platformId, size = 14, className }: Props) {
  if (!isRegistrationPlatformId(platformId)) {
    return <Share2 size={size} className={className} aria-hidden />;
  }
  switch (platformId) {
    case 'instagram':
      return <FaInstagram size={size} className={className} aria-hidden />;
    case 'tiktok':
      return <FaTiktok size={size} className={className} aria-hidden />;
    case 'youtube':
      return <FaYoutube size={size} className={className} aria-hidden />;
    case 'twitter':
      return (
        <svg
          className={className}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'pinterest':
      return <SiPinterest size={size} className={className} aria-hidden />;
    case 'snapchat':
      return <SiSnapchat size={size} className={className} aria-hidden />;
    case 'twitch':
      return <SiTwitch size={size} className={className} aria-hidden />;
    case 'kick':
      return <SiKick size={size} className={className} aria-hidden />;
    case 'linkedin':
      return <SiLinkedin size={size} className={className} aria-hidden />;
    default:
      return <Share2 size={size} className={className} aria-hidden />;
  }
}
