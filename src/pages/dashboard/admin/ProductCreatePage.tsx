import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, Minus, Package, CheckCircle2, ArrowLeft, Trash2 } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { productService } from '@/services/productService';
import type {
  Category, Brand, FieldDefinition, VariantCombination,
} from '@/types/product.types';

// ── Breadcrumb ────────────────────────────────────────────────────────────────

interface BreadcrumbProps {
  items: Array<{ label: string; depth: number } | null>;
}
function Breadcrumb({ items }: BreadcrumbProps) {
  const filled = items.filter(Boolean) as Array<{ label: string; depth: number }>;
  if (!filled.length) return null;
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      {filled.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3" />}
          <span className={i === filled.length - 1 ? 'text-foreground font-medium' : ''}>{item.label}</span>
        </span>
      ))}
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = ['Category', 'Details', 'Variants', 'Review'];

interface StepBarProps { current: number }
function StepBar({ current }: StepBarProps) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
              i < current
                ? 'bg-primary border-primary text-primary-foreground'
                : i === current
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-muted border-border text-muted-foreground'
            }`}>
              {i < current ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-xs mt-1 ${i === current ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 flex-1 mx-1 mb-4 ${i < current ? 'bg-primary' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Variant builder ───────────────────────────────────────────────────────────

function cartesian(lists: string[][]): string[][] {
  if (!lists.length) return [[]];
  const [first, ...rest] = lists;
  const restProduct = cartesian(rest);
  return first.flatMap(v => restProduct.map(combo => [v, ...combo]));
}

interface AutoVariantBuilderProps {
  attributes:   FieldDefinition[];
  combinations: VariantCombination[];
  onChange:     (c: VariantCombination[]) => void;
}

function AutoVariantBuilder({ attributes, combinations, onChange }: AutoVariantBuilderProps) {
  const [selectedValues, setSelectedValues] = useState<Record<string, Set<string>>>({});

  const withOptions = attributes.filter(a => (a.options ?? []).length > 0);
  const withoutOptions = attributes.filter(a => (a.options ?? []).length === 0);

  const toggleValue = (key: string, val: string) => {
    setSelectedValues(prev => {
      const next = { ...prev, [key]: new Set(prev[key] || []) };
      if (next[key].has(val)) next[key].delete(val);
      else next[key].add(val);

      const keys = withOptions.map(a => a.key);
      const valueLists = keys.map(k => Array.from(next[k] || []));

      if (valueLists.every(l => l.length === 0)) {
        onChange([]);
        return next;
      }

      const combos = cartesian(valueLists.map(l => l.length ? l : ['']))
        .filter(combo => combo.some(v => v !== ''))
        .map(combo => {
          const attrs: Record<string, string> = {};
          combo.forEach((v, i) => { if (v) attrs[keys[i]] = v; });
          return attrs;
        })
        .filter(attrs => Object.keys(attrs).length > 0);

      const existing = new Map(combinations.map(c => [JSON.stringify(c.attributes), c.stock_quantity]));
      const primaryType = withOptions[0]?.variant_type ?? 'other';
      onChange(combos.map(attrs => ({
        variant_type:   primaryType,
        attributes:     attrs,
        stock_quantity: existing.get(JSON.stringify(attrs)) ?? 0,
      })));
      return next;
    });
  };

  const updateStock = (idx: number, qty: number) => {
    onChange(combinations.map((c, i) => i === idx ? { ...c, stock_quantity: Math.max(0, qty) } : c));
  };

  if (!attributes.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold text-foreground">Auto-generate from Category Schema</h4>
        <span className="text-xs text-muted-foreground">(select values → variants generated automatically)</span>
      </div>

      {withoutOptions.length > 0 && (
        <div className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          Attribute{withoutOptions.length > 1 ? 's' : ''} <strong>{withoutOptions.map(a => a.label).join(', ')}</strong> {withoutOptions.length > 1 ? 'have' : 'has'} no options configured.
          Edit the category to add options, or add variants manually below.
        </div>
      )}

      {withOptions.map(attr => (
        <div key={attr.key}>
          <label className="text-sm font-medium text-foreground">{attr.label}</label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {attr.options!.map(opt => {
              const selected = selectedValues[attr.key]?.has(opt);
              return (
                <button
                  key={opt}
                  onClick={() => toggleValue(attr.key, opt)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                    selected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/30 text-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {combinations.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Variant</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground w-40">Stock Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {combinations.map((c, i) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="px-4 py-2">
                    {Object.entries(c.attributes).map(([k, v]) => (
                      <Badge key={k} variant="secondary" className="mr-1 text-xs">{k}: {v}</Badge>
                    ))}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateStock(i, c.stock_quantity - 1)}
                        className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted">
                        <Minus className="h-3 w-3" />
                      </button>
                      <Input type="number" min={0} value={c.stock_quantity}
                        onChange={e => updateStock(i, parseInt(e.target.value) || 0)}
                        className="h-7 w-20 text-center text-sm" />
                      <button onClick={() => updateStock(i, c.stock_quantity + 1)}
                        className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted">
                        <Plus className="h-3 w-3" />
                      </button>
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

// ── Manual variant rows ───────────────────────────────────────────────────────

interface ManualVariant { id: string; name: string; stock_quantity: number; variant_type: 'size' | 'colour' | 'weight' | 'other' }

interface ManualVariantEditorProps {
  variants: ManualVariant[];
  onChange: (v: ManualVariant[]) => void;
}

function ManualVariantEditor({ variants, onChange }: ManualVariantEditorProps) {
  const add = () =>
    onChange([...variants, { id: crypto.randomUUID(), name: '', stock_quantity: 0, variant_type: 'other' as const }]);

  const update = (id: string, patch: Partial<ManualVariant>) =>
    onChange(variants.map(v => v.id === id ? { ...v, ...patch } : v));

  const remove = (id: string) =>
    onChange(variants.filter(v => v.id !== id));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold text-foreground">Manual Variants</h4>
        <span className="text-xs text-muted-foreground">(add custom variants directly)</span>
      </div>

      {variants.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Variant Name</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-36">Stock Qty</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {variants.map(v => (
                <tr key={v.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. 1 kg Pack, 500g, Large"
                        value={v.name}
                        onChange={e => update(v.id, { name: e.target.value })}
                        className="h-8 text-sm flex-1"
                      />
                      <select
                        value={v.variant_type}
                        onChange={e => update(v.id, { variant_type: e.target.value as ManualVariant['variant_type'] })}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="size">Size</option>
                        <option value="colour">Colour</option>
                        <option value="weight">Weight</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => update(v.id, { stock_quantity: Math.max(0, v.stock_quantity - 1) })}
                        className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted">
                        <Minus className="h-3 w-3" />
                      </button>
                      <Input type="number" min={0} value={v.stock_quantity}
                        onChange={e => update(v.id, { stock_quantity: parseInt(e.target.value) || 0 })}
                        className="h-7 w-16 text-center text-sm" />
                      <button onClick={() => update(v.id, { stock_quantity: v.stock_quantity + 1 })}
                        className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => remove(v.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded p-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={add}>
        <Plus className="h-3.5 w-3.5" />
        Add Variant
      </Button>
    </div>
  );
}

// ── Dynamic field renderer ────────────────────────────────────────────────────

interface DynamicFieldProps {
  field:     FieldDefinition;
  value:     unknown;
  onChange:  (key: string, val: unknown) => void;
}
function DynamicField({ field, value, onChange }: DynamicFieldProps) {
  const base = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary';
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">
        {field.label} {field.required && <span className="text-red-500">*</span>}
      </label>
      {field.type === 'select' ? (
        <select
          value={String(value ?? '')}
          onChange={e => onChange(field.key, e.target.value)}
          className={`mt-1 ${base}`}
        >
          <option value="">Select…</option>
          {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : field.type === 'boolean' ? (
        <label className="flex items-center gap-2 mt-1 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={e => onChange(field.key, e.target.checked)}
            className="w-4 h-4"
          />
          Yes
        </label>
      ) : (
        <Input
          type={field.type === 'number' ? 'number' : 'text'}
          value={String(value ?? '')}
          onChange={e => onChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
          placeholder={field.label}
          className="mt-1"
        />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function ProductCreatePage() {
  const navigate = useNavigate();
  const [step,        setStep]        = useState(0);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Step 1: category cascade
  const [groups,  setGroups]  = useState<Category[]>([]);
  const [parents, setParents] = useState<Category[]>([]);
  const [subs,    setSubs]    = useState<Category[]>([]);
  const [types,   setTypes]   = useState<Category[]>([]);
  const [brands,  setBrands]  = useState<Brand[]>([]);

  const [selGroup,  setSelGroup]  = useState<Category | null>(null);
  const [selParent, setSelParent] = useState<Category | null>(null);
  const [selSub,    setSelSub]    = useState<Category | null>(null);
  const [selType,   setSelType]   = useState<Category | null>(null);
  const [selBrand,  setSelBrand]  = useState<Brand | null>(null);

  // Step 2: details
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [extraFields, setExtraFields] = useState<Record<string, unknown>>({});

  // Step 3: variants
  const [combinations,   setCombinations]   = useState<VariantCombination[]>([]);
  const [manualVariants, setManualVariants] = useState<ManualVariant[]>([]);

  // Load root groups on mount
  useEffect(() => {
    productService.listCategories({ depth: 0, is_active: true })
      .then(r => setGroups(r.data.results ?? []));
    productService.listBrands({ is_active: true })
      .then(r => setBrands(r.data.results ?? []));
  }, []);

  // Cascade loaders
  const onSelectGroup = useCallback(async (g: Category | null) => {
    setSelGroup(g); setSelParent(null); setSelSub(null); setSelType(null);
    setParents([]); setSubs([]); setTypes([]);
    if (!g) return;
    const r = await productService.getCategoryChildren(g.slug, true);
    setParents(r.data);
  }, []);

  const onSelectParent = useCallback(async (p: Category | null) => {
    setSelParent(p); setSelSub(null); setSelType(null);
    setSubs([]); setTypes([]);
    if (!p) return;
    const r = await productService.getCategoryChildren(p.slug, true);
    setSubs(r.data);
  }, []);

  const onSelectSub = useCallback(async (s: Category | null) => {
    setSelSub(s); setSelType(null); setTypes([]);
    if (!s) return;
    const r = await productService.getCategoryChildren(s.slug, true);
    setTypes(r.data);
  }, []);

  const onSelectType = (t: Category | null) => {
    setSelType(t);
    setExtraFields({});
    setCombinations([]);
    setManualVariants([]);
  };

  const updateExtraField = (key: string, val: unknown) => {
    setExtraFields(prev => ({ ...prev, [key]: val }));
  };

  // Validation per step
  const canProceedStep0 = !!selType;
  const canProceedStep1 = !!name.trim() && (() => {
    if (!selType?.field_schema) return true;
    const required = selType.field_schema.product_fields.filter(f => f.required);
    return required.every(f => extraFields[f.key] !== undefined && extraFields[f.key] !== '');
  })();

  const allCombinations: VariantCombination[] = [
    ...combinations,
    ...manualVariants
      .filter(m => m.name.trim())
      .map(m => ({ name: m.name.trim(), variant_type: m.variant_type, attributes: {}, stock_quantity: m.stock_quantity })),
  ];

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const product = await productService.createProduct({
        name:                 name.trim(),
        description:          description.trim(),
        category:             selType?.id,
        brand:                selBrand?.id ?? null,
        extra_fields:         extraFields,
        is_published:         false,
        variant_combinations: allCombinations,
      });
      navigate(`/admin/products/${product.data.slug}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, string[]> } };
      const msgs = err?.response?.data;
      setError(msgs ? Object.values(msgs).flat().join(' ') : 'Failed to create product');
      setSaving(false);
    }
  };

  const variantAttributes  = selType?.field_schema?.variant_attributes ?? [];
  const hasAutoAttributes  = variantAttributes.length > 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen(v => !v)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b border-border bg-card px-6 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/admin/products')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">New Product</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Create a product step by step</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            <StepBar current={step} />

            {error && (
              <div className="mb-4 rounded-md border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* ── Step 0: Category ── */}
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Select Product Category</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Choose the 4-level category path for this product.
                  </p>
                </div>

                <Breadcrumb items={[
                  selGroup  ? { label: selGroup.name,  depth: 0 } : null,
                  selParent ? { label: selParent.name, depth: 1 } : null,
                  selSub    ? { label: selSub.name,    depth: 2 } : null,
                  selType   ? { label: selType.name,   depth: 3 } : null,
                ]} />

                {/* Group */}
                <SelectGrid
                  label="1. Category Group"
                  items={groups}
                  selected={selGroup}
                  onSelect={g => onSelectGroup(g)}
                  color="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-400/40"
                />

                {/* Parent */}
                {selGroup && (
                  <SelectGrid
                    label="2. Parent Category"
                    items={parents}
                    selected={selParent}
                    onSelect={p => onSelectParent(p)}
                    color="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-400/40"
                  />
                )}

                {/* Sub */}
                {selParent && (
                  <SelectGrid
                    label="3. Sub Category"
                    items={subs}
                    selected={selSub}
                    onSelect={s => onSelectSub(s)}
                    color="bg-green-500/10 text-green-600 dark:text-green-400 border-green-400/40"
                  />
                )}

                {/* Type */}
                {selSub && (
                  <SelectGrid
                    label="4. Product Category (Type)"
                    items={types}
                    selected={selType}
                    onSelect={t => onSelectType(t)}
                    color="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-400/40"
                  />
                )}

                {/* Brand */}
                {selType && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Brand (optional)</label>
                    <select
                      value={selBrand?.id ?? ''}
                      onChange={e => setBrands(prev => {
                        const b = prev.find(b => b.id === e.target.value) ?? null;
                        setSelBrand(b);
                        return prev;
                      })}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">No brand</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button disabled={!canProceedStep0} onClick={() => setStep(1)}>
                    Next: Details
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 1: Details ── */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Product Details</h2>
                  <Breadcrumb items={[
                    selGroup  ? { label: selGroup.name,  depth: 0 } : null,
                    selParent ? { label: selParent.name, depth: 1 } : null,
                    selSub    ? { label: selSub.name,    depth: 2 } : null,
                    selType   ? { label: selType.name,   depth: 3 } : null,
                  ]} />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. India Gate Basmati Rice"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Optional product description"
                    rows={3}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  />
                </div>

                {/* Dynamic product fields */}
                {(selType?.field_schema?.product_fields ?? []).length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">
                      {selType!.name} Fields
                    </h3>
                    {selType!.field_schema.product_fields.map(field => (
                      <DynamicField
                        key={field.key}
                        field={field}
                        value={extraFields[field.key]}
                        onChange={updateExtraField}
                      />
                    ))}
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
                  <Button disabled={!canProceedStep1} onClick={() => setStep(2)}>
                    Next: Variants
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 2: Variants ── */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Variant Options</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Add variants automatically from the category schema or manually.
                  </p>
                </div>

                {hasAutoAttributes && (
                  <>
                    <AutoVariantBuilder
                      attributes={variantAttributes}
                      combinations={combinations}
                      onChange={setCombinations}
                    />
                    <div className="border-t border-border" />
                  </>
                )}

                <ManualVariantEditor
                  variants={manualVariants}
                  onChange={setManualVariants}
                />

                {allCombinations.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No variants added yet — product will be created as a single unit.
                  </p>
                )}

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={() => setStep(3)}>
                    Review
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 3: Review ── */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Review &amp; Save</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Product will be saved as unpublished. Set pricing before publishing.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-card divide-y divide-border">
                  <ReviewRow label="Category">
                    <Breadcrumb items={[
                      selGroup  ? { label: selGroup.name,  depth: 0 } : null,
                      selParent ? { label: selParent.name, depth: 1 } : null,
                      selSub    ? { label: selSub.name,    depth: 2 } : null,
                      selType   ? { label: selType.name,   depth: 3 } : null,
                    ]} />
                  </ReviewRow>
                  {selBrand && <ReviewRow label="Brand"><span className="text-sm">{selBrand.name}</span></ReviewRow>}
                  <ReviewRow label="Name"><span className="text-sm font-medium">{name}</span></ReviewRow>
                  {description && <ReviewRow label="Description"><span className="text-sm text-muted-foreground">{description}</span></ReviewRow>}
                  {Object.keys(extraFields).length > 0 && (
                    <ReviewRow label="Fields">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(extraFields).map(([k, v]) => (
                          <span key={k} className="text-xs bg-muted px-2 py-1 rounded">
                            {k}: <strong>{String(v)}</strong>
                          </span>
                        ))}
                      </div>
                    </ReviewRow>
                  )}
                  <ReviewRow label="Variants">
                    {allCombinations.length === 0 ? (
                      <span className="text-sm text-muted-foreground">No variants (single product)</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {allCombinations.map((c, i) => (
                          <span key={i} className="text-xs bg-muted px-2 py-1 rounded">
                            {c.name ?? Object.values(c.attributes).join(' / ')} — {c.stock_quantity} units
                          </span>
                        ))}
                      </div>
                    )}
                  </ReviewRow>
                </div>

                <div className="rounded-md border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                  After saving, go to <strong>Product Pricing</strong> to set purchase price, selling price, and UPA discount. Then publish the product.
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                  <Button onClick={handleSubmit} disabled={saving} className="gap-2">
                    <Package className="h-4 w-4" />
                    {saving ? 'Creating…' : 'Create Product'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ── SelectGrid ────────────────────────────────────────────────────────────────

interface SelectGridProps {
  label:    string;
  items:    Category[];
  selected: Category | null;
  onSelect: (c: Category) => void;
  color:    string;
}
function SelectGrid({ label, items, selected, onSelect, color }: SelectGridProps) {
  if (!items.length) return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
      <p className="text-xs text-muted-foreground italic">No items available</p>
    </div>
  );

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
              selected?.id === item.id
                ? `${color} shadow-sm`
                : 'bg-muted/30 text-foreground border-border hover:border-primary/40'
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── ReviewRow ─────────────────────────────────────────────────────────────────

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 px-4 py-3">
      <span className="text-xs font-medium text-muted-foreground w-24 shrink-0 pt-0.5">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
