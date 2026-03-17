export interface LegUser {
  upa_id: string;
  name: string;
}

export interface LegDetail extends LegUser {
  joined_at: string;
  is_active: boolean;
}

export interface MyConnections {
  upa_id:      string | null;
  depth_level: number | null;
  parent:      LegUser | null;
  legs: {
    L: LegDetail | null;
    M: LegDetail | null;
    R: LegDetail | null;
  };
}

export interface TreeNode {
  id:           string;
  upa_id:       string;
  name:         string;
  mobile:       string | null;
  is_active:    boolean;
  leg:          'L' | 'M' | 'R' | null;
  depth_level:  number;
  joined_at:    string;
  photo_url:    string | null;
  parent_upa_id: string | null;
  children?: {
    L: TreeNode | null;
    M: TreeNode | null;
    R: TreeNode | null;
  };
}

export interface UPAProfile extends TreeNode {
  wallet_balance:   string;
  children_summary: {
    L: LegUser | null;
    M: LegUser | null;
    R: LegUser | null;
  };
}

export interface UPASearchResult {
  id:           string;
  upa_id:       string;
  name:         string;
  mobile:       string | null;
  is_active:    boolean;
  depth_level:  number;
  parent_upa_id: string | null;
  legs_filled:  number;
  joined_at:    string;
}

export interface TreeStats {
  total_upa_users: number;
  active:          number;
  inactive:        number;
  standalone:      number;
  placed_in_tree:  number;
}

export interface PaginatedResponse<T> {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  T[];
}
