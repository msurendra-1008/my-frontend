import { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronRight, ChevronDown, Edit2, Trash2, Save, X, Tag, Layers } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { productService } from '@/services/productService';
import type { Category, CategoryTreeNode, Brand, FieldDefinition } from '@/types/product.types';

// ── Types ─────────────────────────────────────────────────────────────────────

type DepthLabel = { depth: 0 | 1 | 2 | 3; label: string; color: string };

const DEPTH_META: DepthLabel[] = [
  { depth: 0, label: 'Category Group',    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-400/40' },
  { depth: 1, label: 'Parent Category',   color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-400/40'   },
  { depth: 2, label: 'Sub Category',      color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-400/40' },
  { depth: 3, label: 'Product Category',  color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-400/40' },
];

type Tab = 'categories' | 'brands';

// ── Field Schema Builder ──────────────────────────────────────────────────────

interface FieldBuilderProps {
  schema: { product_fields: FieldDefinition[]; variant_attributes: FieldDefinition[] };
  onChange: (schema: { product_fields: FieldDefinition[]; variant_attributes: FieldDefinition[] }) => void;
}

function FieldBuilder({ schema, onChange }: FieldBuilderProps) {
  const updateField = (section: 'product_fields' | 'variant_attributes', idx: number, field: Partial<FieldDefinition>) => {
    const updated = schema[section].map((f, i) => i === idx ? { ...f, ...field } : f);
    onChange({ ...schema, [section]: updated });
  };

  const addField = (section: 'product_fields' | 'variant_attributes') => {
    const newField: FieldDefinition = section === 'variant_attributes'
      ? { key: '', label: '', type: 'select', required: false, variant_type: 'other' }
      : { key: '', label: '', type: 'text', required: false };
    onChange({ ...schema, [section]: [...schema[section], newField] });
  };

  const removeField = (section: 'product_fields' | 'variant_attributes', idx: number) => {
    onChange({ ...schema, [section]: schema[section].filter((_, i) => i !== idx) });
  };

  const renderSection = (
    section: 'product_fields' | 'variant_attributes',
    title: string,
    hint: string,
  ) => (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
      </div>

      {schema[section].map((field, idx) => (
        <div key={idx} className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="key (e.g. weight)"
              value={field.key}
              onChange={e => updateField(section, idx, { key: e.target.value.replace(/\s/g, '_').toLowerCase() })}
              className="flex-1 min-w-[100px] h-8 text-xs"
            />
            <Input
              placeholder="Label (e.g. Weight)"
              value={field.label}
              onChange={e => updateField(section, idx, { label: e.target.value })}
              className="flex-1 min-w-[100px] h-8 text-xs"
            />
            {section === 'variant_attributes' && (
              <select
                value={field.variant_type ?? 'other'}
                onChange={e => updateField(section, idx, { variant_type: e.target.value as FieldDefinition['variant_type'] })}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                title="Variant Type"
              >
                <option value="size">Size</option>
                <option value="colour">Colour</option>
                <option value="weight">Weight</option>
                <option value="other">Other</option>
              </select>
            )}
            {section === 'product_fields' && (
              <select
                value={field.type}
                onChange={e => updateField(section, idx, { type: e.target.value as FieldDefinition['type'] })}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="select">Select</option>
                <option value="boolean">Yes/No</option>
              </select>
            )}
            {section === 'product_fields' && (
              <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={e => updateField(section, idx, { required: e.target.checked })}
                  className="w-3 h-3"
                />
                Required
              </label>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10 shrink-0"
              onClick={() => removeField(section, idx)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {section === 'variant_attributes' && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Options (one per line) — these become the selectable values</p>
              <textarea
                rows={2}
                placeholder="500g&#10;1kg&#10;2kg&#10;5kg"
                value={(field.options || []).join('\n')}
                onChange={e => updateField(section, idx, {
                  options: e.target.value.split('\n').filter(Boolean),
                })}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs resize-none"
              />
            </div>
          )}

          {section === 'product_fields' && field.type === 'select' && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Options (one per line)</p>
              <textarea
                rows={2}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                value={(field.options || []).join('\n')}
                onChange={e => updateField(section, idx, {
                  options: e.target.value.split('\n').filter(Boolean),
                })}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs resize-none"
              />
            </div>
          )}
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1.5"
        onClick={() => addField(section)}
      >
        <Plus className="h-3 w-3" />
        Add field
      </Button>
    </div>
  );

  return (
    <div className="space-y-5 pt-2">
      {renderSection(
        'product_fields',
        'Product Fields',
        'Dynamic fields that appear when creating a product of this type (e.g. Origin, Grade)',
      )}
      <div className="border-t border-border" />
      {renderSection(
        'variant_attributes',
        'Variant Attributes',
        'Attributes used to generate variant options (e.g. Weight → 500g, 1kg, 5kg)',
      )}
    </div>
  );
}

// ── Category Node ─────────────────────────────────────────────────────────────

interface CategoryNodeProps {
  node:      CategoryTreeNode;
  onEdit:    (node: CategoryTreeNode) => void;
  onDelete:  (node: CategoryTreeNode) => void;
  onAdd:     (parent: CategoryTreeNode) => void;
}

function CategoryNode({ node, onEdit, onDelete, onAdd }: CategoryNodeProps) {
  const [open, setOpen] = useState(true);
  const meta = DEPTH_META[node.depth] || DEPTH_META[0];

  return (
    <div className="pl-4">
      <div className="flex items-center gap-2 py-1.5 group">
        {node.children.length > 0 ? (
          <button onClick={() => setOpen(o => !o)} className="text-muted-foreground hover:text-foreground">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-3.5" />
        )}

        <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.color}`}>
          {node.depth === 0 ? 'Group' : node.depth === 1 ? 'Parent' : node.depth === 2 ? 'Sub' : 'Type'}
        </span>

        <span className="text-sm text-foreground font-medium">{node.name}</span>
        {node.short_code && (
          <span className="text-xs text-muted-foreground font-mono">({node.short_code})</span>
        )}

        <div className="hidden group-hover:flex items-center gap-0.5">
          {node.depth < 3 && (
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => onAdd(node)}
              title={`Add ${DEPTH_META[node.depth + 1]?.label}`}
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost" size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(node)}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-500/10"
            onClick={() => onDelete(node)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {!node.is_active && (
          <Badge variant="secondary" className="text-xs h-4">Inactive</Badge>
        )}
      </div>

      {open && node.children.length > 0 && (
        <div className="border-l border-border ml-1.5">
          {node.children.map(child => (
            <CategoryNode
              key={child.id}
              node={child}
              onEdit={onEdit}
              onDelete={onDelete}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Category Form Modal ───────────────────────────────────────────────────────

interface CategoryFormProps {
  editing?:  Category | null;
  parentNode?: CategoryTreeNode | null;
  onSave:    () => void;
  onClose:   () => void;
}

function CategoryForm({ editing, parentNode, onSave, onClose }: CategoryFormProps) {
  const defaultDepth = editing?.depth ?? (parentNode ? Math.min(parentNode.depth + 1, 3) as 0|1|2|3 : 0);
  const [name,       setName]       = useState(editing?.name ?? '');
  const [shortCode,  setShortCode]  = useState(editing?.short_code ?? '');
  const [isActive,   setIsActive]   = useState(editing?.is_active ?? true);
  const [schema,     setSchema]     = useState(
    editing?.field_schema ?? { product_fields: [], variant_attributes: [] }
  );
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  const depth = defaultDepth;
  const meta  = DEPTH_META[depth];
  const isLeaf = depth === 3;

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await productService.updateCategory(editing.slug, { name: name.trim(), short_code: shortCode.trim(), is_active: isActive });
        if (isLeaf) await productService.updateCategorySchema(editing.slug, schema);
      } else {
        const created = await productService.createCategory({
          name:       name.trim(),
          depth,
          short_code: shortCode.trim(),
          parent:     parentNode?.id ?? null,
          is_active:  isActive,
        });
        if (isLeaf && created.data) {
          await productService.updateCategorySchema(created.data.slug, schema);
        }
      }
      onSave();
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, string[]> } };
      const msgs = err?.response?.data;
      setError(msgs ? Object.values(msgs).flat().join(' ') : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {editing ? 'Edit' : 'Add'} {meta.label}
            </h2>
            {parentNode && !editing && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Under: <span className="font-medium">{parentNode.name}</span>
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <div className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Name *</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={`${meta.label} name`}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Short Code <span className="text-muted-foreground/60">(for SKU)</span>
              </label>
              <Input
                value={shortCode}
                onChange={e => setShortCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="e.g. GR, RC, BAS"
                maxLength={10}
                className="mt-1 font-mono"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4"
            />
            Active
          </label>

          {isLeaf && (
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <h3 className="text-sm font-semibold text-foreground mb-1">Field Schema</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Define dynamic fields and variant attributes for products of this type.
              </p>
              <FieldBuilder schema={schema} onChange={setSchema} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
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
  const [addParent,   setAddParent]   = useState<CategoryTreeNode | null>(null);
  const [editCat,     setEditCat]     = useState<Category | null>(null);
  const [showForm,    setShowForm]    = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const handleAdd = (parent: CategoryTreeNode) => {
    setAddParent(parent);
    setEditCat(null);
    setShowForm(true);
  };

  const handleAddRoot = () => {
    setAddParent(null);
    setEditCat(null);
    setShowForm(true);
  };

  const handleEdit = async (node: CategoryTreeNode) => {
    const r = await productService.getCategory(node.slug);
    setEditCat(r.data);
    setAddParent(null);
    setShowForm(true);
  };

  const handleDelete = async (node: CategoryTreeNode) => {
    if (!confirm(`Delete "${node.name}"? This will also delete all subcategories.`)) return;
    await productService.deleteCategory(node.slug);
    loadTree();
  };

  const handleSaved = () => {
    setShowForm(false);
    loadTree();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen(v => !v)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b border-border bg-card px-6 py-4">
          <h1 className="text-xl font-bold text-foreground">Category &amp; Brand Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define your 4-level category hierarchy and manage brands
          </p>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-border mb-6">
            {([
              { key: 'categories', label: 'Categories', icon: Layers },
              { key: 'brands',     label: 'Brands',     icon: Tag   },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === key
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {tab === 'categories' && (
            <div className="space-y-4">
              {/* Depth legend */}
              <div className="flex flex-wrap gap-2">
                {DEPTH_META.map(m => (
                  <span key={m.depth} className={`text-xs px-2.5 py-1 rounded-full border ${m.color}`}>
                    {m.depth}. {m.label}
                  </span>
                ))}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleAddRoot} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Category Group
                </Button>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                {loading ? (
                  <p className="text-sm text-muted-foreground p-4">Loading categories…</p>
                ) : tree.length === 0 ? (
                  <div className="py-12 text-center">
                    <Layers className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No categories yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Start by adding a Category Group (Level 1).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {tree.map(node => (
                      <CategoryNode
                        key={node.id}
                        node={node}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onAdd={handleAdd}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'brands' && <BrandPanel />}
        </main>
      </div>

      {showForm && (
        <CategoryForm
          editing={editCat}
          parentNode={addParent}
          onSave={handleSaved}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
