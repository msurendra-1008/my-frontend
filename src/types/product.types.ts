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
  upa_price_computed:  UPAPrice;
  upa_price:           string | null;
  purchase_price:      string | null;
  variant_profit:      number | null;
}

export interface ProductListItem {
  id:                 string;
  name:               string;
  slug:               string;
  sku:                string;
  mrp:                string;
  primary_image:      string | null;
  category_name:      string | null;
  is_published:       boolean;
  stock_label:        StockLabel;
  total_stock:        number;
  variant_count:      number;
  first_variant_id:   string | null;
  pricing_configured:    boolean;
  purchase_price:        string | null;
  profit_amount:         number | null;
  upa_profit_amount:     number | null;
  upa_discount_override: string | null;
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
  upa_discount_override: string | null;  // existing nullable field
  upa_price_override:    string | null;
  is_published:          boolean;
  created_at:            string;
  updated_at:            string;
  images:                ProductImage[];
  variants:              ProductVariant[];
  upa_price:             UPAPrice;
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
  search?:   string;
  in_stock?: boolean;
  status?:   'published' | 'unpublished';
  stock?:    'in_stock' | 'low_stock' | 'out_of_stock';
  page?:     number;
}
