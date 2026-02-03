export type ProductCategory =
  | 'cleanser'
  | 'toner'
  | 'serum'
  | 'moisturizer'
  | 'sunscreen'
  | 'mask'
  | 'treatment'
  | 'eye_cream'
  | 'other';

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: ProductCategory | null;
  category_id: string | null;
  company_id: string | null;
  /** Join ile gelen marka adı (companies tablosundan) */
  companies?: { name: string } | null;
  ingredients_text: string | null;
  barcode: string | null;
  image_url: string | null;
  is_private?: boolean;
  rating?: number | null;
  created_at: string;
  updated_at: string;
}

/** Kartlarda gösterilecek marka: company varsa companies.name, yoksa brand */
export function getProductBrandDisplay(product: Product): string | null {
  return product.companies?.name ?? product.brand ?? null;
}

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  cleanser: 'Temizleyici',
  toner: 'Tonik',
  serum: 'Serum',
  moisturizer: 'Nemlendirici',
  sunscreen: 'Güneş Kremi',
  mask: 'Maske',
  treatment: 'Tedavi',
  eye_cream: 'Göz Kremi',
  other: 'Diğer',
};
