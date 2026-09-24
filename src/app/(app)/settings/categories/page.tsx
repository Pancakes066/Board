import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/server/auth/session";
import { listCategoriesForUser } from "@/server/services/categories/categories";
import { CategoryManager } from "./category-manager";

export default async function CategoriesSettingsPage() {
  const user = await requireUser();
  const categories = await listCategoriesForUser(user.id);

  const defaultCategories = categories.filter((c) => c.isDefault);
  const customCategories = categories.filter((c) => !c.isDefault);

  return (
    <div>
      <PageHeader
        title="Catégories"
        description="Catégories par défaut et catégories personnalisées."
      />
      <CategoryManager defaultCategories={defaultCategories} customCategories={customCategories} />
    </div>
  );
}
