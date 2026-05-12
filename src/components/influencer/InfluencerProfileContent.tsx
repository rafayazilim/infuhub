import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, ListChecks, MessageCircle, Send, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { InfluencerProfile } from '@/services/firebaseInfluencerService';
import { isUserVerified } from '@/services/firebaseAuthService';
import { isAudienceMatchComplete } from '@/lib/influencerAudienceMatch';
import {
  submitSupportMessage,
  SUPPORT_MESSAGE_CATEGORIES,
  SUPPORT_CATEGORY_LABELS,
  type SupportMessageCategory,
} from '@/services/firebaseSupportMessageService';
import { InfluencerProfileEditForm } from './InfluencerProfileEditForm';

function splitName(fullName: string): { first: string; last: string } {
  const t = fullName.trim();
  if (!t) return { first: 'Kullanıcı', last: '—' };
  const p = t.split(/\s+/);
  if (p.length === 1) return { first: p[0], last: '—' };
  return { first: p[0], last: p.slice(1).join(' ') };
}

export interface InfluencerProfileContentProps {
  influencerId: string;
  profile: InfluencerProfile | null;
  onOpenAudienceMatch: () => void;
  onRefresh: () => void;
}

export function InfluencerProfileContent({
  influencerId,
  profile,
  onOpenAudienceMatch,
  onRefresh,
}: InfluencerProfileContentProps) {
  const { toast } = useToast();
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [contactCategory, setContactCategory] = useState<SupportMessageCategory>('platform');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  const verified = isUserVerified(profile?.status);
  const audienceDone = isAudienceMatchComplete(profile);

  const nameParts = useMemo(() => splitName(profile?.fullName || ''), [profile?.fullName]);
  const defaultPhone = (profile?.phone || '').trim();

  const handleSendSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSupportSubmitting(true);
    try {
      await submitSupportMessage({
        category: contactCategory,
        firstName: nameParts.first || 'Kullanıcı',
        lastName: nameParts.last || '—',
        subject: contactSubject.trim() || 'Influencer paneli — iletişim',
        email: (profile.email || '').trim(),
        phone: defaultPhone || '—',
        message: contactMessage.trim(),
      });
      toast({
        title: 'Mesajınız alındı',
        description: 'Ekibimiz en kısa sürede size dönüş yapacak.',
      });
      setContactSubject('');
      setContactMessage('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gönderilemedi.';
      toast({ title: 'Gönderilemedi', description: msg, variant: 'destructive' });
    } finally {
      setSupportSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl mx-auto space-y-6 pb-10"
    >
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-gradient-to-br from-white via-gray-50/80 to-[#08afd5]/5 dark:from-gray-900 dark:via-gray-900/90 dark:to-[#08afd5]/10 shadow-sm">
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full ring-2 ring-[#08afd5]/30 dark:ring-[#6edff3]/40 overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0 mx-auto sm:mx-0">
            {profile?.profilePhotoURL ? (
              <img src={profile.profilePhotoURL} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-400">
                <User className="h-8 w-8" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white truncate">
              {profile?.fullName || 'Profilim'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 break-all">{profile?.email || '—'}</p>
            <p className="text-[11px] font-mono text-gray-500 dark:text-gray-500 mt-1 truncate" title={influencerId}>
              ID: {influencerId}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {verified ? (
                <Badge className="rounded-lg bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30">
                  <BadgeCheck className="h-3.5 w-3.5 mr-1" />
                  Onaylı
                </Badge>
              ) : (
                <Badge variant="secondary" className="rounded-lg">
                  Doğrulama gerekli
                </Badge>
              )}
              {audienceDone ? (
                <Badge variant="outline" className="rounded-lg border-[#08afd5]/40 text-[#08afd5]">
                  <ListChecks className="h-3.5 w-3.5 mr-1" />
                  Anket tamam
                </Badge>
              ) : (
                <Badge variant="outline" className="rounded-lg border-amber-500/40 text-amber-800 dark:text-amber-200">
                  Anket eksik
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="w-full h-auto flex flex-wrap sm:flex-nowrap p-1 rounded-xl bg-gray-100/90 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60">
          <TabsTrigger
            value="info"
            className="flex-1 min-w-[120px] rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm"
          >
            <User className="h-4 w-4 mr-2 opacity-80" />
            Profilim
          </TabsTrigger>
          <TabsTrigger
            value="contact"
            className="flex-1 min-w-[120px] rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm"
          >
            <MessageCircle className="h-4 w-4 mr-2 opacity-80" />
            İletişim
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <div className="mac-surface rounded-2xl border border-gray-200/80 dark:border-gray-800/80 p-4 sm:p-6">
            <InfluencerProfileEditForm
              key={profile?.updatedAt || 'p'}
              profile={profile}
              onUpdate={onRefresh}
              onOpenAudienceMatch={onOpenAudienceMatch}
              layout="page"
            />
          </div>
        </TabsContent>

        <TabsContent value="contact" className="mt-6">
          <Card className="mac-surface p-5 sm:p-6 border border-gray-200/80 dark:border-gray-800/80 max-w-xl mx-auto">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Destek mesajı</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              Mesajınız yönetici panelinde <strong>İletişim / destek mesajları</strong> bölümüne düşer. Yanıt için
              kayıtlı e-posta adresinizi kullanırız.
            </p>
            <form onSubmit={handleSendSupport} className="space-y-4">
              <div>
                <Label className="text-xs text-gray-500">Kategori</Label>
                <Select
                  value={contactCategory}
                  onValueChange={(v) => setContactCategory(v as SupportMessageCategory)}
                >
                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORT_MESSAGE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {SUPPORT_CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Konu</Label>
                <Input
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  placeholder="Kısa başlık"
                  className="mt-1.5 rounded-xl"
                  maxLength={200}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Mesaj</Label>
                <Textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Nasıl yardımcı olabiliriz?"
                  className="mt-1.5 rounded-xl min-h-[140px] resize-y"
                  maxLength={5000}
                  required
                />
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/50 p-3 text-xs text-gray-600 dark:text-gray-400">
                <p>
                  <span className="font-medium text-gray-800 dark:text-gray-200">Gönderen:</span> {nameParts.first}{' '}
                  {nameParts.last}
                </p>
                <p className="mt-1 break-all">
                  <span className="font-medium">E-posta:</span> {profile?.email || '—'}
                </p>
                <p className="mt-1">
                  <span className="font-medium">Telefon:</span> {defaultPhone || '—'}
                </p>
              </div>
              <Button
                type="submit"
                disabled={supportSubmitting}
                className="w-full rounded-xl bg-[#08afd5] hover:bg-[#0799bc] text-white"
              >
                {supportSubmitting ? (
                  'Gönderiliyor…'
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Gönder
                  </>
                )}
              </Button>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
