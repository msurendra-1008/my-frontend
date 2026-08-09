import { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronRight, ChevronDown, Edit2, Trash2, Save, X, Tag, Layers } from 'lucide-react';
import { cn } from '@utils/cn';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { productService } from '@/services/productService';
import type { Category, CategoryTreeNode, Brand, FieldDefinition } from '@/types/product.types';

// ── Depth Metadata ─────────────────────────────────────────────────────────────

const DEPTH_META = [
  {
    depth: 0 as const,
    label: 'Category Group',
    level: 'Level 0',
    pip: '#7C5CF6',
    badgeCls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-400/40',
  },
  {
    depth: 1 as const,
    label: 'Parent Category',
    level: 'Level 1',
    pip: '#3D68F5',
    badgeCls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-400/40',
  },
  {
    depth: 2 as const,
    label: 'Sub Category',
    level: 'Level 2',
    pip: '#0AA08A',
    badgeCls: 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-400/40',
  },
  {
    depth: 3 as const,
    label: 'Product Category',
    level: 'Level 3',
    pip: '#D97706',
    badgeCls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-400/40',
  },
] as const;

type Tab = 'categories' | 'brands';

// ── FieldBuilderSection ────────────────────────────────────────────────────────

interface FieldBuilderSectionProps {
  section: 'product_fields' | 'variant_attributes';
  fields: FieldDefinition[];
  onChange: (updated: FieldDefinition[]) => void;
}

function FieldBuilderSection({ section, fields, onChange }: FieldBuilderSectionProps) {
  const isVariant = section === 'variant_attributes';
  const accentBorder = isVariant ? 'border-l-amber-400/60' : 'border-l-blue-400/60';

  const updateField = (idx: number, patch: Partial<FieldDefinition>) => {
    onChange(fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };

  const removeField = (idx: number) => {
    onChange(fields.filter((_, i) => i !== idx));
  };

  const addField = () => {
    const newField: FieldDefinition = isVariant
      ? { key: '', label: '', type: 'select', required: false, variant_type: 'other' }
      : { key: '', label: '', type: 'text', required: false };
    onChange([...fields, newField]);
  };

  const showOptions = (field: FieldDefinition) => isVariant || field.type === 'select';

  return (
    <div className="space-y-2.5">
      {fields.map((field, idx) => (
        <div
          key={idx}
          className={cn('rounded-lg border bg-card p-3 space-y-2 border-l-2', accentBorder)}
        >
          <div className="flex gap-2 flex-wrap items-center">
            <Input
              placeholder="key"
              value={field.key}
              onChange={e =>
                updateField(idx, { key: e.target.value.replace(/\s/g, '_').toLowerCase() })
              }
              className="h-7 font-mono text-xs flex-1 min-w-[80px]"
            />
            <Input
              placeholder="Label"
              value={field.label}
              onChange={e => updateField(idx, { label: e.target.value })}
              className="h-7 text-xs flex-1 min-w-[100px]"
            />
            {isVariant && (
              <select
                value={field.variant_type ?? 'other'}
                onChange={e =>
                  updateField(idx, {
                    variant_type: e.target.value as FieldDefinition['variant_type'],
                  })
                }
                className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                title="Variant Type"
              >
                <option value="weight">Weight</option>
                <option value="size">Size</option>
                <option value="colour">Colour</option>
                <option value="other">Other</option>
              </select>
            )}
            {!isVariant && (
              <>
                <select
                  value={field.type}
                  onChange={e =>
                    updateField(idx, { type: e.target.value as FieldDefinition['type'] })
                  }
                  className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="select">Select</option>
                  <option value="boolean">Yes-No</option>
                </select>
                <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={e => updateField(idx, { required: e.target.checked })}
                    className="w-3.5 h-3.5 accent-primary"
                  />
                  Required
                </label>
              </>
            )}
            <button
              type="button"
              onClick={() => removeField(idx)}
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {showOptions(field) && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-1">
                Options (one per line)
              </p>
              <textarea
                rows={2}
                placeholder={'500g\n1kg\n2kg'}
                value={(field.options ?? []).join('\n')}
                onChange={e =>
                  updateField(idx, {
                    options: e.target.value.split('\n').filter(Boolean),
                  })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs resize-none"
              />
              {(field.options ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(field.options ?? []).map((opt, oi) => (
                    <span
                      key={oi}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 border border-border"
                    >
                      {opt}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addField}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-dashed rounded-md hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
      >
        <Plus className="h-3 w-3" />
        Add {isVariant ? 'Variant Attribute' : 'Product Field'}
      </button>
    </div>
  );
}

// ── TreeNode ───────────────────────────────────────────────────────────────────

interface TreeNodeProps {
  node: CategoryTreeNode;
  selectedId: string | null;
  onSelect: (node: CategoryTreeNode, path: CategoryTreeNode[]) => void;
  onAdd: (parent: CategoryTreeNode) => void;
  onDelete: (node: CategoryTreeNode) => void;
  ancestors?: CategoryTreeNode[];
}

function TreeNode({
  node,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
  ancestors = [],
}: TreeNodeProps) {
  const [open, setOpen] = useState(true);
  const meta = DEPTH_META[node.depth as 0 | 1 | 2 | 3] ?? DEPTH_META[0];
  const path = [...ancestors, node];
  const isSelected = selectedId === node.id;
  const hasChildren = node.children.length > 0;
  const nextMeta = node.depth < 3 ? DEPTH_META[(node.depth + 1) as 1 | 2 | 3] : null;

  return (
    <div>
      {/* Node row */}
      <div
        className={cn(
          'flex items-center h-[30px] mx-1.5 rounded-[4px] cursor-pointer select-none group',
          isSelected ? 'bg-primary/10' : 'hover:bg-muted/50',
        )}
        onClick={() => onSelect(node, path)}
      >
        {/* Depth indent */}
        <div style={{ width: node.depth * 16 + 'px' }} className="shrink-0" />

        {/* Chevron */}
        <button
          className={cn(
            'w-3.5 h-3.5 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0',
            !hasChildren && 'invisible',
          )}
          onClick={e => {
            e.stopPropagation();
            setOpen(o => !o);
          }}
          tabIndex={-1}
        >
          {open ? (
            <ChevronDown className="h-2.5 w-2.5" />
          ) : (
            <ChevronRight className="h-2.5 w-2.5" />
          )}
        </button>

        {/* Depth pip */}
        <div
          className="w-[6px] h-[6px] rounded-[2px] shrink-0 mr-1.5"
          style={{ background: meta.pip }}
        />

        {/* Name */}
        <span
          className={cn(
            'flex-1 text-[12.5px] truncate leading-none',
            isSelected ? 'text-primary font-semibold' : 'text-foreground',
          )}
        >
          {node.name}
        </span>

        {/* Short code badge */}
        {node.short_code && (
          <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 border border-border px-[5px] py-[1px] rounded-[3px] shrink-0 mx-1">
            {node.short_code}
          </span>
        )}

        {/* "off" badge */}
        {!node.is_active && (
          <span className="text-[9px] font-semibold uppercase px-[5px] py-[1px] rounded-[3px] bg-muted/60 border border-border text-muted-foreground shrink-0 mx-0.5">
            off
          </span>
        )}

        {/* Hover actions */}
        <div className="hidden group-hover:flex items-center gap-[2px] shrink-0 mr-1">
          {node.depth < 3 && nextMeta && (
            <button
              className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              title={`Add ${nextMeta.label}`}
              onClick={e => {
                e.stopPropagation();
                onAdd(node);
              }}
              tabIndex={-1}
            >
              <Plus className="h-2.5 w-2.5" />
            </button>
          )}
          <button
            className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
            onClick={e => {
              e.stopPropagation();
              onSelect(node, path);
            }}
            tabIndex={-1}
          >
            <Edit2 className="h-2.5 w-2.5" />
          </button>
          <button
            className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
            onClick={e => {
              e.stopPropagation();
              onDelete(node);
            }}
            tabIndex={-1}
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      {/* Children */}
      {open && hasChildren && (
        <div className="ml-4 border-l border-border/40">
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              onAdd={onAdd}
              onDelete={onDelete}
              ancestors={path}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Brand Panel ───────────────────────────────────────────────────────────────

function BrandPanel() {
  const [brands,       setBrands]       = useState<Brand[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [addingBrand,  setAddingBrand]  = useState(false);
  const [brandName,    setBrandName]    = useState('');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await productService.listBrands({ search: search || undefined });
      setBrands(r.data.results ?? []);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setBrandName(''); setEditingBrand(null); setAddingBrand(true); setError(''); };
  const openEdit = (b: Brand) => { setBrandName(b.name); setEditingBrand(b); setAddingBrand(true); setError(''); };

  const saveBrand = async () => {
    if (!brandName.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      if (editingBrand) {
        await productService.updateBrand(editingBrand.slug, { name: brandName.trim() });
      } else {
        await productService.createBrand({ name: brandName.trim() });
      }
      setAddingBrand(false);
      load();
    } catch {
      setError('Failed to save brand');
    } finally {
      setSaving(false);
    }
  };

  const deleteBrand = async (b: Brand) => {
    if (!confirm(`Delete brand "${b.name}"?`)) return;
    await productService.deleteBrand(b.slug);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search brands…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={openAdd} className="gap-2 ml-auto">
          <Plus className="h-4 w-4" />
          Add Brand
        </Button>
      </div>

      {addingBrand && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <h3 className="text-sm font-semibold">{editingBrand ? 'Edit Brand' : 'New Brand'}</h3>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Brand name"
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveBrand()}
              className="flex-1"
            />
            <Button onClick={saveBrand} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            <Button variant="outline" onClick={() => setAddingBrand(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : brands.length === 0 ? (
        <p className="text-sm text-muted-foreground">No brands found.</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Slug</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {brands.map(b => (
                <tr key={b.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium text-foreground">{b.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{b.slug}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={b.is_active ? 'default' : 'secondary'} className="text-xs">
                      {b.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => deleteBrand(b)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function CategoryManagementPage() {
  const [tab,         setTab]         = useState<Tab>('categories');
  const [tree,        setTree]        = useState<CategoryTreeNode[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Selection / form state
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [nodePath,      setNodePath]      = useState<CategoryTreeNode[]>([]);
  const [fullCat,       setFullCat]       = useState<Category | null>(null);
  const [formMode,      setFormMode]      = useState<'edit' | 'create' | null>(null);
  const [parentForNew,  setParentForNew]  = useState<CategoryTreeNode | null>(null);
  const [loadingCat,    setLoadingCat]    = useState(false);

  // Form fields
  const [formName,   setFormName]   = useState('');
  const [formCode,   setFormCode]   = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formSchema, setFormSchema] = useState<{
    product_fields: FieldDefinition[];
    variant_attributes: FieldDefinition[];
  }>({ product_fields: [], variant_attributes: [] });
  const [schemaTab, setSchemaTab] = useState<'pf' | 'va'>('pf');
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  // Derived
  const rawDepth = formMode === 'create'
    ? Math.min((parentForNew?.depth ?? -1) + 1, 3)
    : (fullCat?.depth ?? 0);
  const formDepth = Math.min(Math.max(rawDepth, 0), 3) as 0 | 1 | 2 | 3;
  const isLeaf    = formDepth === 3;
  const formMeta  = DEPTH_META[formDepth];

  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      const r = await productService.getCategoryTree();
      setTree(r.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTree(); }, [loadTree]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const selectNode = async (node: CategoryTreeNode, path: CategoryTreeNode[]) => {
    setSelectedId(node.id);
    setNodePath(path);
    setFormMode('edit');
    setParentForNew(null);
    setError('');
    setLoadingCat(true);
    try {
      const r = await productService.getCategory(node.slug);
      setFullCat(r.data);
      setFormName(r.data.name);
      setFormCode(r.data.short_code ?? '');
      setFormActive(r.data.is_active);
      setFormSchema(r.data.field_schema ?? { product_fields: [], variant_attributes: [] });
    } finally {
      setLoadingCat(false);
    }
  };

  const startCreate = (parent: CategoryTreeNode | null) => {
    setParentForNew(parent);
    setSelectedId(null);
    setNodePath([]);
    setFullCat(null);
    setFormMode('create');
    setFormName('');
    setFormCode('');
    setFormActive(true);
    setFormSchema({ product_fields: [], variant_attributes: [] });
    setError('');
  };

  const handleSave = async () => {
    if (!formName.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      if (formMode === 'edit' && fullCat) {
        await productService.updateCategory(fullCat.slug, {
          name: formName.trim(), short_code: formCode.trim(), is_active: formActive,
        });
        if (isLeaf) await productService.updateCategorySchema(fullCat.slug, formSchema);
        const r = await productService.getCategory(fullCat.slug);
        setFullCat(r.data);
      } else if (formMode === 'create') {
        const r = await productService.createCategory({
          name: formName.trim(), depth: formDepth, short_code: formCode.trim(),
          parent: parentForNew?.id ?? null, is_active: formActive,
        });
        if (isLeaf && r.data?.slug) {
          await productService.updateCategorySchema(r.data.slug, formSchema);
        }
        setFormMode(null);
        setSelectedId(null);
      }
      loadTree();
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, string[]> } };
      const msgs = err?.response?.data;
      setError(msgs ? Object.values(msgs).flat().join(' ') : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (formMode === 'create') {
      setFormMode(null);
      setSelectedId(null);
    } else if (fullCat) {
      setFormName(fullCat.name);
      setFormCode(fullCat.short_code ?? '');
      setFormActive(fullCat.is_active);
      setFormSchema(fullCat.field_schema ?? { product_fields: [], variant_attributes: [] });
      setError('');
    }
  };

  const handleDelete = async (node: CategoryTreeNode) => {
    if (!confirm(`Delete "${node.name}"? This will also delete all subcategories.`)) return;
    await productService.deleteCategory(node.slug);
    if (selectedId === node.id) { setFormMode(null); setSelectedId(null); }
    loadTree();
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen(v => !v)} />

      <div className="flex flex-1 flex-col overflow-hidden">

        {/* ── Header (48px) ─────────────────────────────────────────────────── */}
        <header className="h-12 flex items-center gap-1 px-4 border-b border-border bg-card shrink-0">
          <span className="text-sm font-semibold text-foreground mr-3">
            Category &amp; Brand Management
          </span>
          {([
            { key: 'categories', label: 'Categories', icon: Layers },
            { key: 'brands',     label: 'Brands',     icon: Tag },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors',
                tab === key
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </header>

        {/* ── Brands tab ────────────────────────────────────────────────────── */}
        {tab === 'brands' && (
          <main className="flex-1 overflow-y-auto p-6">
            <BrandPanel />
          </main>
        )}

        {/* ── Categories tab — split workspace ──────────────────────────────── */}
        {tab === 'categories' && (
          <div className="flex flex-1 overflow-hidden">

            {/* Tree panel */}
            <div className="w-[280px] shrink-0 flex flex-col border-r border-border bg-card">

              {/* Tree header */}
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border shrink-0">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  HIERARCHY
                </span>
                <button
                  onClick={() => startCreate(null)}
                  className="text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary hover:text-white px-2.5 py-1 rounded-[5px] flex items-center gap-1 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add Group
                </button>
              </div>

              {/* Depth key */}
              <div className="flex items-center gap-3 px-3.5 py-2 border-b border-border shrink-0 flex-wrap">
                {DEPTH_META.map(m => (
                  <div key={m.depth} className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-[2px] shrink-0"
                      style={{ background: m.pip }}
                    />
                    <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  </div>
                ))}
              </div>

              {/* Tree scroll */}
              <div className="flex-1 overflow-y-auto py-1.5">
                {loading ? (
                  <p className="text-xs text-muted-foreground px-4 py-3">Loading…</p>
                ) : tree.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 px-4 text-center">
                    <Layers className="h-8 w-8 text-muted-foreground/20" />
                    <p className="text-xs text-muted-foreground">
                      No categories yet. Start by adding a group.
                    </p>
                  </div>
                ) : (
                  tree.map(node => (
                    <TreeNode
                      key={node.id}
                      node={node}
                      selectedId={selectedId}
                      onSelect={selectNode}
                      onAdd={startCreate}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex flex-col bg-muted/20">

              {formMode === null ? (
                /* Empty state */
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
                  <Layers className="h-12 w-12 text-muted-foreground/20" />
                  <p className="text-sm font-medium text-muted-foreground/60">Select a category</p>
                  <p className="text-xs text-muted-foreground text-center max-w-[260px]">
                    Click any node in the tree to edit it, or use the buttons to add new items.
                  </p>
                </div>
              ) : (
                /* Form */
                <div className="flex flex-col h-full overflow-hidden">

                  {/* Form header */}
                  <div className="px-5 py-3.5 border-b border-border bg-card shrink-0 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {/* Breadcrumb */}
                      {nodePath.length > 0 && (
                        <p className="text-[10.5px] text-muted-foreground mb-0.5 truncate">
                          {nodePath.map((n, i) => (
                            <span key={n.id}>
                              {i > 0 && (
                                <span className="mx-1 text-muted-foreground/50">›</span>
                              )}
                              {i === nodePath.length - 1 ? (
                                <span className="font-bold text-foreground">{n.name}</span>
                              ) : (
                                n.name
                              )}
                            </span>
                          ))}
                        </p>
                      )}
                      {/* Title */}
                      <p className="text-sm font-bold text-foreground leading-tight">
                        {formMode === 'edit' ? 'Edit' : 'Add'} {formMeta.label}
                      </p>
                      {/* Subtitle */}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formMode === 'create'
                          ? parentForNew
                            ? `Under: ${parentForNew.name}`
                            : 'New root category group'
                          : formMeta.level}
                      </p>
                    </div>

                    {/* Depth badge */}
                    <span
                      className={cn(
                        'text-[11px] font-semibold px-2.5 py-1 rounded-md shrink-0',
                        formMeta.badgeCls,
                      )}
                    >
                      ● {formMeta.level}
                    </span>
                  </div>

                  {/* Form body */}
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                    {loadingCat ? (
                      <div className="flex items-center justify-center py-12">
                        <p className="text-sm text-muted-foreground">Loading…</p>
                      </div>
                    ) : (
                      <>
                        {/* Error banner */}
                        {error && (
                          <div className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-600 dark:text-red-400">
                            {error}
                          </div>
                        )}

                        {/* Basic Info card */}
                        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border">
                            BASIC INFO
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground block mb-1">
                                Name *
                              </label>
                              <Input
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                placeholder={`${formMeta.label} name`}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground block mb-1">
                                Short Code{' '}
                                <span className="text-muted-foreground/60">(for SKU)</span>
                              </label>
                              <Input
                                value={formCode}
                                onChange={e =>
                                  setFormCode(
                                    e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                                  )
                                }
                                placeholder="e.g. GR"
                                maxLength={10}
                                className="h-8 text-sm font-mono"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formActive}
                                onChange={e => setFormActive(e.target.checked)}
                                className="w-4 h-4 accent-primary"
                              />
                              Active
                            </label>
                            {formMode === 'edit' && fullCat?.parent_name && (
                              <span className="text-xs text-muted-foreground">
                                Parent:{' '}
                                <span className="font-medium text-foreground">
                                  {fullCat.parent_name}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Field Schema card — leaf nodes only */}
                        {isLeaf && (
                          <div className="rounded-lg border border-border bg-card overflow-hidden">
                            {/* Card header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                FIELD SCHEMA
                              </p>
                              {/* Sub-tab switcher */}
                              <div className="bg-muted/50 border border-border p-0.5 rounded-md flex items-center gap-0.5">
                                <button
                                  onClick={() => setSchemaTab('pf')}
                                  className={cn(
                                    'text-[11px] font-medium px-2.5 py-1 rounded transition-colors',
                                    schemaTab === 'pf'
                                      ? 'bg-card text-foreground shadow-sm'
                                      : 'text-muted-foreground hover:text-foreground',
                                  )}
                                >
                                  Product Fields
                                </button>
                                <button
                                  onClick={() => setSchemaTab('va')}
                                  className={cn(
                                    'text-[11px] font-medium px-2.5 py-1 rounded transition-colors',
                                    schemaTab === 'va'
                                      ? 'bg-card text-foreground shadow-sm'
                                      : 'text-muted-foreground hover:text-foreground',
                                  )}
                                >
                                  Variant Attrs
                                </button>
                              </div>
                            </div>
                            {/* Card body */}
                            <div className="p-4">
                              {schemaTab === 'pf' ? (
                                <FieldBuilderSection
                                  section="product_fields"
                                  fields={formSchema.product_fields}
                                  onChange={updated =>
                                    setFormSchema(s => ({ ...s, product_fields: updated }))
                                  }
                                />
                              ) : (
                                <FieldBuilderSection
                                  section="variant_attributes"
                                  fields={formSchema.variant_attributes}
                                  onChange={updated =>
                                    setFormSchema(s => ({ ...s, variant_attributes: updated }))
                                  }
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Form footer */}
                  <div className="px-5 py-3 border-t border-border bg-card shrink-0 flex items-center justify-between">
                    <span className="text-[10.5px] text-muted-foreground">
                      {saving ? 'Saving changes…' : 'Changes are not auto-saved'}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleDiscard} disabled={saving}>
                        Discard
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saving}
                        className="gap-1.5"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
