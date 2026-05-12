import React, { useEffect, useMemo, useState } from "react";
import { push, ref, update } from "firebase/database";
import { database } from "@/config/firebase";
import { useToast } from "@/hooks/use-toast";
import type { BrandSorumlu } from "@/services/firebaseAuthService";
import { getFirebaseErrorMessage } from "@/lib/firebaseErrorMessages";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BRAND_UNVAN_OPTIONS } from "@/constants/brandFormOptions";

function optionsWithLegacy(base: readonly string[], current: string): string[] {
  const out = [...base];
  if (current && !out.includes(current)) out.push(current);
  return out;
}

function listSorumluEntries(sorumlular: unknown): Array<{ key: string; data: BrandSorumlu }> {
  if (!sorumlular || typeof sorumlular !== "object") return [];
  const o = sorumlular as Record<string, BrandSorumlu>;
  return Object.entries(o)
    .filter(([, v]) => v && typeof v === "object" && "firstName" in (v as object))
    .map(([key, data]) => ({ key, data: data as BrandSorumlu }))
    .sort((a, b) => {
      if (a.key === "birincil") return -1;
      if (b.key === "birincil") return 1;
      return a.key.localeCompare(b.key);
    });
}

export interface BrandSorumluEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  brandProfile: Record<string, unknown> | null;
  onSaved: () => void | Promise<void>;
}

export function BrandSorumluEditDialog({
  open,
  onOpenChange,
  brandId,
  brandProfile,
  onSaved,
}: BrandSorumluEditDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");

  /** Yeni kayıt eklendiği için form her açılışta boş; mevcut kayıtlar aşağıda listelenir. */
  useEffect(() => {
    if (!open) return;
    setFirstName("");
    setLastName("");
    setTitle("");
    setPhone("");
  }, [open]);

  const unvanItems = useMemo(() => optionsWithLegacy(BRAND_UNVAN_OPTIONS, title), [title]);

  const mevcutListe = useMemo(
    () => listSorumluEntries(brandProfile?.sorumlular),
    [brandProfile?.sorumlular]
  );

  const handleSave = async () => {
    if (!brandId) return;
    const fn = firstName.trim();
    const ln = lastName.trim();
    const tl = title.trim();
    const ph = phone.trim();
    const digits = ph.replace(/\D/g, "");

    if (!fn || !ln || !tl) {
      toast({
        title: "Eksik bilgi",
        description: "Ad, soyad ve ünvan zorunludur.",
        variant: "destructive",
      });
      return;
    }
    if (digits.length < 10) {
      toast({
        title: "Geçersiz telefon",
        description: "Lütfen geçerli bir telefon numarası girin (en az 10 rakam).",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const sorumlularRef = ref(database, `brands/${brandId}/sorumlular`);
      const newChildRef = push(sorumlularRef);
      const newKey = newChildRef.key;
      if (!newKey) {
        throw new Error("Yeni kayıt anahtarı oluşturulamadı.");
      }

      const createdAt = new Date().toISOString();
      await update(ref(database, `brands/${brandId}`), {
        [`sorumlular/${newKey}`]: {
          firstName: fn,
          lastName: ln,
          title: tl,
          phone: ph,
          createdAt,
        },
        updatedAt: createdAt,
      });

      toast({
        title: "Eklendi",
        description: "Yeni sorumlu kaydedildi. Mevcut kayıtlar korundu.",
      });
      onOpenChange(false);
      await onSaved();
    } catch (e: unknown) {
      toast({
        title: "Hata",
        description: getFirebaseErrorMessage(e, "Kaydedilemedi."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-24px)] max-w-lg overflow-hidden border border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 md:w-full">
        <DialogHeader>
          <DialogTitle>Sorumlu ekle</DialogTitle>
          <DialogDescription>
            Her kayıtta yeni bir yetkili eklenir; önceki sorumlular (ör. <span className="font-mono text-[11px]">birincil</span>)
            silinmez veya üzerine yazılmaz. Firebase altında otomatik bir anahtar ile saklanır.
          </DialogDescription>
        </DialogHeader>

        {mevcutListe.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 text-sm dark:border-gray-700 dark:bg-gray-900/50">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Kayıtlı sorumlular ({mevcutListe.length})
            </p>
            <ul className="max-h-32 space-y-2 overflow-y-auto pr-1 text-xs mac-scrollbar">
              {mevcutListe.map(({ key, data }) => (
                <li key={key} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-gray-100 pb-2 last:border-0 last:pb-0 dark:border-gray-800">
                  <span className="font-mono text-[10px] text-gray-400">{key}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {data.firstName} {data.lastName}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">{data.title}</span>
                  <span className="text-gray-500">{data.phone}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-4 py-1">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Yeni sorumlu</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sorumlu-dialog-first">Ad</Label>
              <Input
                id="sorumlu-dialog-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sorumlu-dialog-last">Soyad</Label>
              <Input
                id="sorumlu-dialog-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sorumlu-dialog-title">Ünvan</Label>
              <Select value={title || undefined} onValueChange={setTitle}>
                <SelectTrigger id="sorumlu-dialog-title">
                  <SelectValue placeholder="Ünvan seçin" />
                </SelectTrigger>
                <SelectContent>
                  {unvanItems.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sorumlu-dialog-phone">Telefon</Label>
              <Input
                id="sorumlu-dialog-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                placeholder="+90 ..."
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            İptal
          </Button>
          <Button type="button" className="brand-btn-primary text-white" onClick={handleSave} disabled={saving}>
            {saving ? "Ekleniyor..." : "Sorumlu ekle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
