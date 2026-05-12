import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { registerNestedPanel } from "@/lib/registerFormUi";
import { cn } from "@/lib/utils";
import {
  REGISTER_LEGAL_DOCUMENTS,
  type RegisterLegalConsentState,
} from "@/constants/registerLegalContent";

const consentLabels: Record<keyof RegisterLegalConsentState, string> = {
  privacyKvkk: "Gizlilik Koşulları ve KVKK metnini okudum, kabul ediyorum.",
  refundPolicy: "Kullanım Koşulları ve İptal Şartlarını okudum, kabul ediyorum.",
  serviceDefinition: "Hizmet Tanımı metnini okudum, kabul ediyorum.",
};

const consentIds: Record<keyof RegisterLegalConsentState, string> = {
  privacyKvkk: "consent-privacy-kvkk",
  refundPolicy: "consent-refund",
  serviceDefinition: "consent-service",
};

type Props = {
  value: RegisterLegalConsentState;
  onChange: (next: RegisterLegalConsentState) => void;
};

export function RegisterLegalConsents({ value, onChange }: Props) {
  const setKey = (key: keyof RegisterLegalConsentState, checked: boolean) => {
    onChange({ ...value, [key]: checked });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">Yasal metinler ve onay</p>
        <p className="text-xs text-muted-foreground mt-1">
          Kayıt olabilmek için aşağıdaki metinleri inceleyip her biri için onay kutusunu işaretlemeniz gerekir.
        </p>
      </div>

      <ScrollArea className="h-[min(45vh,320px)] sm:h-[min(40vh,380px)] rounded-xl border-2 border-border/90 dark:border-slate-500/60 bg-muted/20 dark:bg-slate-950/40">
        <div className="p-4 pr-5 space-y-8 text-sm text-foreground/90">
          {REGISTER_LEGAL_DOCUMENTS.map((doc) => (
            <section key={doc.id} className="space-y-4" aria-labelledby={`legal-doc-${doc.id}`}>
              <h2 id={`legal-doc-${doc.id}`} className="text-base font-semibold text-foreground border-b border-border/60 pb-2">
                {doc.title}
              </h2>
              {doc.subsections.map((sub) => (
                <div key={sub.title} className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground/95">{sub.title}</h3>
                  {sub.intro?.map((p, i) => (
                    <p key={`${sub.title}-intro-${i}`} className="text-xs leading-relaxed text-muted-foreground">
                      {p}
                    </p>
                  ))}
                  {sub.bullets.length > 0 ? (
                    <ul className="list-disc pl-4 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                      {sub.bullets.map((b, i) => (
                        <li key={`${sub.title}-b-${i}`}>{b}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </section>
          ))}
        </div>
      </ScrollArea>

      <div className={cn(registerNestedPanel, "space-y-4")}>
        {(Object.keys(consentLabels) as (keyof RegisterLegalConsentState)[]).map((key) => (
          <div key={key} className="flex items-start gap-3">
            <Checkbox
              id={consentIds[key]}
              checked={value[key]}
              onCheckedChange={(c) => setKey(key, c === true)}
              className="mt-0.5"
            />
            <Label
              htmlFor={consentIds[key]}
              className="text-sm font-normal leading-snug cursor-pointer text-foreground peer-disabled:cursor-not-allowed"
            >
              {consentLabels[key]}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
