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
