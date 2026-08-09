// ── Field Schema Types ────────────────────────────────────────────────────────

export interface FieldDefinition {
  key:           string;
  label:         string;
  type:          'text' | 'number' | 'select' | 'boolean';
  required:      boolean;
  options?:      string[];
  variant_type?: 'size' | 'colour' | 'weight' | 'other';
}

export interface FieldSchema {
  product_fields:     FieldDefinition[];
  variant_attributes: FieldDefinition[];
}

// ── Category ──────────────────────────────────────────────────────────────────

export interface Category {
  id:             string;
  name:           string;
  slug:           string;
  short_code:     string;
  depth:          0 | 1 | 2 | 3;
  level_name:     string;
  parent_id:      string | null;
  parent_name:    string | null;
  field_schema:   FieldSchema;
  is_active:      boolean;
  children_count: number;
}

export interface CategoryTreeNode {
  id:         string;
  name:       string;
  slug:       string;
  short_code: string;
  depth:      number;
  level_name: string;
  is_active:  boolean;
  children:   CategoryTreeNode[];
}

export type PaginatedCategories = {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  Category[];
};

// ── Brand ─────────────────────────────────────────────────────────────────────

export interface Brand {
  id:       string;
  name:     string;
  slug:     string;
  logo_url: string | null;
  is_active: boolean;
}

export type PaginatedBrands = {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  Brand[];
};

// ── Product ───────────────────────────────────────────────────────────────────

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
  attributes:          Record<string, string>;
  sku:                 string;
  mrp:                 string | null;
  upa_price_override:  string | null;
  stock_quantity:      number;
  stock_label:         StockLabel;
  is_active:           boolean;
  order:               number;
  upa_price_computed:  UPAPrice | null;
  upa_price:           string | null;
  purchase_price:      string | null;
  variant_profit:      number | null;
}

export interface ProductListItem {
  id:                    string;
  name:                  string;
  slug:                  string;
  sku:                   string | null;
  mrp:                   string | null;
  min_variant_mrp:       string | null;
  primary_image:         string | null;
  category_name:         string | null;
  brand_name:            string | null;
  is_published:          boolean;
  stock_label:           StockLabel;
  total_stock:           number;
  variant_count:         number;
  first_variant_id:      string | null;
  pricing_configured:    boolean;
  configured_variant_count: number;
  mrp_min:               string | null;
  mrp_max:               string | null;
  profit_min:            number | null;
  profit_max:            number | null;
  upa_profit_min:        number | null;
  upa_profit_max:        number | null;
  purchase_price:        string | null;
  profit_amount:         number | null;
  upa_profit_amount:     number | null;
  upa_discount_override: string | null;
  has_commission_rule:   boolean;
}

export interface Product {
  id:                    string;
  name:                  string;
  slug:                  string;
  description:           string;
  category:              Category | null;
  brand:                 Brand | null;
  extra_fields:          Record<string, unknown>;
  sku:                   string | null;
  barcode:               string;
  mrp:                   string | null;
  upa_discount_override: string | null;
  upa_price_override:    string | null;
  is_published:          boolean;
  created_at:            string;
  updated_at:            string;
  images:                ProductImage[];
  variants:              ProductVariant[];
  upa_price:             UPAPrice | null;
  stock_label:           StockLabel;
  total_stock:           number;
  purchase_price:        string | null;
  gst_percentage:        string;
  other_charges:         string;
  other_charges_type:    'flat' | 'percent';
  pricing_configured:    boolean;
  profit_amount:         number | null;
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
  brand?:    string;
  search?:   string;
  in_stock?: boolean;
  status?:   'published' | 'unpublished';
  stock?:    'in_stock' | 'low_stock' | 'out_of_stock';
  page?:     number;
}

// ── Product create payload ────────────────────────────────────────────────────

export interface VariantCombination {
  name?:          string;
  variant_type?:  'size' | 'colour' | 'weight' | 'other';
  attributes:     Record<string, string>;
  stock_quantity: number;
}

export interface ProductCreatePayload {
  name:                string;
  description?:        string;
  category?:           string;
  brand?:              string | null;
  extra_fields?:       Record<string, unknown>;
  barcode?:            string;
  is_published?:       boolean;
  variant_combinations?: VariantCombination[];
}
