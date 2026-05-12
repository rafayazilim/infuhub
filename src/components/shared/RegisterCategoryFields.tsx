import { Button } from "@/components/ui/button";
import { CATEGORY_TREE, TOP_CATEGORY_KEYS } from "@/constants/sectorCategoryTree";
import { registerNestedPanel, registerSelectChip } from "@/lib/registerFormUi";
import { cn } from "@/lib/utils";

export type RegisterCategoryFieldsValue = {
  categories: string[];
  subCategories: Record<string, string[]>;
};

type Props = {
  value: RegisterCategoryFieldsValue;
  onChange: (next: RegisterCategoryFieldsValue) => void;
  /** Influencer ile aynı: varsayılan 3 */
  maxCategories?: number;
};

export function RegisterCategoryFields({ value, onChange, maxCategories = 3 }: Props) {
  const { categories, subCategories } = value;

  const toggleCategory = (category: string) => {
    const isSelected = categories.includes(category);
    const nextCats = isSelected
      ? categories.filter((c) => c !== category)
      : categories.length < maxCategories
        ? [...categories, category]
        : categories;
    const nextSubs = isSelected
      ? Object.fromEntries(Object.entries(subCategories).filter(([key]) => key !== category))
      : subCategories;
    onChange({ categories: nextCats, subCategories: nextSubs });
  };

  const toggleSubCategory = (category: string, subCategory: string) => {
    const selectedSubs = subCategories[category] || [];
    const exists = selectedSubs.includes(subCategory);
    const nextSubsList = exists
      ? selectedSubs.filter((item) => item !== subCategory)
      : [...selectedSubs, subCategory];
    onChange({
      categories,
      subCategories: { ...subCategories, [category]: nextSubsList },
    });
  };

  const selectAllSubCategories = (category: string) => {
    onChange({
      categories,
      subCategories: {
        ...subCategories,
        [category]: [...(CATEGORY_TREE[category] || [])],
      },
    });
  };

  const clearSubCategories = (category: string) => {
    onChange({
      categories,
      subCategories: { ...subCategories, [category]: [] },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-sm text-muted-foreground">Üst Kategoriler</label>
        <span className="text-xs text-muted-foreground">
          {categories.length}/{maxCategories} seçildi
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {TOP_CATEGORY_KEYS.map((category) => (
          <button
            key={category}
            type="button"
            className={cn(
              registerSelectChip(categories.includes(category), { rounded: "full" }),
              categories.length >= maxCategories && !categories.includes(category)
                ? "opacity-50 cursor-not-allowed"
                : ""
            )}
            onClick={() => toggleCategory(category)}
            disabled={categories.length >= maxCategories && !categories.includes(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {categories.length > 0 ? (
        <div className="space-y-4 pt-2">
          {categories.map((category) => {
            const selectedSubs = subCategories[category] || [];
            const allSubs = CATEGORY_TREE[category] || [];
            const isAllSelected = allSubs.length > 0 && selectedSubs.length === allSubs.length;

            return (
              <div key={category} className={registerNestedPanel}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{category} Alt Kategorileri</p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-2 border-border/90 dark:border-slate-500/65 dark:bg-slate-900/50 dark:hover:bg-slate-800/90"
                      onClick={() => selectAllSubCategories(category)}
                      disabled={isAllSelected}
                    >
                      Tümünü Seç
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-2 border-border/90 dark:border-slate-500/65 dark:bg-slate-900/50 dark:hover:bg-slate-800/90"
                      onClick={() => clearSubCategories(category)}
                      disabled={selectedSubs.length === 0}
                    >
                      Temizle
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allSubs.map((subCategory) => {
                    const selected = selectedSubs.includes(subCategory);
                    return (
                      <button
                        key={`${category}-${subCategory}`}
                        type="button"
                        className={registerSelectChip(selected, { rounded: "full" })}
                        onClick={() => toggleSubCategory(category, subCategory)}
                      >
                        {subCategory}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedSubs.length}/{allSubs.length} alt kategori seçildi
                </p>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
