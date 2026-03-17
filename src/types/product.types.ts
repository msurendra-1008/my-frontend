export interface Category {
  id:          string;
  name:        string;
  slug:        string;
  parent_id:   string | null;
  parent_name: string | null;
  is_active:   boolean;
}

export interface ProductImage {
  id:         string;
  image:      string | null;
  alt_text:   string;
  order:      number;
  is_primary: boolean;
}

export type StockLabel = 'In Stock' | 'Low Stock' | 'Out of Stock';

export interface UPAPrice {
  mrp:              string;
  upa_price:        string;
  discount_percent: string;
  saving:           string;
}

export interface ProductVariant {
  id:                  string;
  name:                string;
  variant_type:        'size' | 'colour' | 'weight' | 'other';
  sku:                 string;
  mrp:                 string;
  upa_price_override:  string | null;
  stock_quantity:      number;
  stock_label:         StockLabel;
  is_active:           boolean;
  upa_price:           UPAPrice;
}

export interface ProductListItem {
  id:            string;
  name:          string;
  slug:          string;
  mrp:           string;
  primary_image: string | null;
  category_name: string | null;
  is_published:  boolean;
  stock_label:   StockLabel;
  total_stock:   number;
  variant_count: number;
}

export interface Product {
  id:                    string;
  name:                  string;
  slug:                  string;
  description:           string;
  category:              Category | null;
  sku:                   string;
  barcode:               string;
  mrp:                   string;
  upa_discount_override: string | null;
  upa_price_override:    string | null;
  is_published:          boolean;
  created_at:            string;
  updated_at:            string;
  images:                ProductImage[];
  variants:              ProductVariant[];
  upa_price:             UPAPrice;
  stock_label:           StockLabel;
  total_stock:           number;
}

export interface UPAPriceResponse {
  product:  UPAPrice;
  variants: Array<{ id: string; name: string } & UPAPrice>;
}

export interface UPADiscountSettings {
  global_discount_percent: string;
  updated_at:              string;
}

export interface PaginatedProducts {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  ProductListItem[];
}

export interface ProductFilters {
  category?: string;
  search?:   string;
  in_stock?: boolean;
  page?:     number;
}
