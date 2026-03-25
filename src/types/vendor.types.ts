export type VendorStatus = 'pending' | 'approved' | 'rejected' | 'docs_requested';

export interface VendorDocument {
  id: string;
  label: string;
  file_url: string;
  uploaded_at: string;
}

export interface VendorCategory {
  id: string;
  name: string;
}

export interface VendorProfile {
  id: string;
  company_name: string;
  gst_number: string;
  contact_name: string;
  mobile: string | null;
  email: string | null;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  categories: VendorCategory[];
  status: VendorStatus;
  rejection_reason: string;
  admin_notes: string;
  documents: VendorDocument[];
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorListItem {
  id: string;
  company_name: string;
  gst_number: string;
  contact_name: string;
  mobile: string | null;
  email: string | null;
  status: VendorStatus;
  category_names: string[];
  created_at: string;
}

export interface VendorAdminDetail extends VendorProfile {
  approved_by_name: string | null;
}

export interface VendorStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  docs_requested: number;
}

export interface PaginatedVendors {
  count: number;
  next: string | null;
  previous: string | null;
  results: VendorListItem[];
  stats: VendorStats;
}

export interface VendorRegisterData {
  company_name: string;
  gst_number: string;
  contact_name: string;
  mobile?: string;
  email?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  category_ids: string[];
  password: string;
}

export interface VendorLoginResponse {
  access: string;
  refresh: string;
  profile: VendorProfile;
}

// ── Vendor Products ───────────────────────────────────────────────────────────

export type VendorProductStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'not_continued';

export type VariantType = 'size' | 'colour' | 'weight' | 'other';

export interface VendorProductVariant {
  id: string;
  name: string;
  variant_type: VariantType;
  sku: string;
  mrp: string;
  is_active: boolean;
}

export interface VendorProductImage {
  id: string;
  image_url: string | null;
  alt_text: string;
  order: number;
  is_primary: boolean;
  uploaded_at: string;
}

export interface VendorProduct {
  id: string;
  name: string;
  description: string;
  category: VendorCategory | null;
  sku: string;
  barcode: string;
  monthly_capacity: number | null;
  yearly_capacity: number | null;
  status: VendorProductStatus;
  rejection_reason: string;
  admin_notes: string;
  variants: VendorProductVariant[];
  images: VendorProductImage[];
  submitted_at: string;
  reviewed_at: string | null;
}

export interface VendorProductListItem {
  id: string;
  name: string;
  category_name: string | null;
  sku: string;
  status: VendorProductStatus;
  primary_image: string | null;
  variant_count: number;
  mrp_range: { min: string; max: string } | null;
  submitted_at: string;
}

export interface VendorProductAdmin {
  id: string;
  vendor_name: string;
  name: string;
  description: string;
  category: VendorCategory | null;
  sku: string;
  barcode: string;
  monthly_capacity: number | null;
  yearly_capacity: number | null;
  status: VendorProductStatus;
  rejection_reason: string;
  admin_notes: string;
  variants: VendorProductVariant[];
  images: VendorProductImage[];
  catalog_product_id: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  submitted_at: string;
}

export interface VendorProductAdminListItem {
  id: string;
  vendor_name: string;
  name: string;
  category_name: string | null;
  sku: string;
  status: VendorProductStatus;
  primary_image: string | null;
  variant_count: number;
  mrp_range: { min: string; max: string } | null;
  submitted_at: string;
}

export interface VendorProductStats {
  total: number;
  pending_approval: number;
  approved: number;
  rejected: number;
  not_continued: number;
}

export interface PaginatedVendorProducts {
  count: number;
  next: string | null;
  previous: string | null;
  results: VendorProductListItem[];
}

export interface PaginatedVendorProductsAdmin {
  count: number;
  next: string | null;
  previous: string | null;
  results: VendorProductAdminListItem[];
  stats: VendorProductStats;
}

export interface VendorProductWriteData {
  name: string;
  description?: string;
  category_id?: string | null;
  category_name?: string;
  sku: string;
  barcode?: string;
  monthly_capacity?: number | null;
  yearly_capacity?: number | null;
  variants: Omit<VendorProductVariant, 'id'>[];
}
