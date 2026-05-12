import React from 'react';
import { Card } from '@/components/ui/card';
import { User } from 'lucide-react';

interface ProfileSettingsProps {
  influencerId: string;
  onProfileUpdate?: () => void;
}

export function ProfileSettings({ influencerId, onProfileUpdate }: ProfileSettingsProps) {
  return (
    <Card className="mac-surface p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#08afd5] to-[#e3447c] flex items-center justify-center text-white">
          <User size={32} />
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white">Profil Ayarları</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Profilini buradan düzenleyebilirsin
          </p>
        </div>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Profil düzenleme özelliği yakında aktif olacak.
      </p>
    </Card>
  );
}


