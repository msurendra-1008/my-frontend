import { useState } from 'react';
import { cn } from '@utils/cn';
import { treeService } from '@/services/treeService';
import type { TreeNode } from '@/types/tree.types';

const LEG_LABELS: Record<string, string> = { L: 'Left', M: 'Middle', R: 'Right' };

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ');
  const text  = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold uppercase text-primary-foreground">
      {text || '?'}
    </div>
  );
}

function LegPill({ filled }: { filled: boolean }) {
  return (
    <span className={cn(
      'h-2.5 w-2.5 rounded-full border',
      filled ? 'bg-emerald-500 border-emerald-500' : 'border-border',
    )} />
  );
}

interface Props {
  node:         TreeNode;
  depth?:       number;
  onViewProfile: (upaId: string) => void;
}

export function TreeNodeCard({ node, depth = 0, onViewProfile }: Props) {
  const [expanded,  setExpanded]  = useState(depth < 2);
  const [children,  setChildren]  = useState<TreeNode['children']>(node.children);
  const [loading,   setLoading]   = useState(false);

  const hasChildren = children
    ? Object.values(children).some(Boolean)
    : false;

  const handleExpand = async () => {
    if (expanded) { setExpanded(false); return; }
    if (!children) {
      setLoading(true);
      try {
        const r = await treeService.getSubtree(node.upa_id);
        setChildren(r.data.children);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }
    setExpanded(true);
  };

  const joinDate = node.joined_at
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(node.joined_at))
    : '—';

  const childrenMap = children ?? { L: null, M: null, R: null };

  return (
    <div>
      {/* Node card */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <Initials name={node.name} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-foreground truncate">{node.name}</p>
              <span className={cn(
                'h-1.5 w-1.5 shrink-0 rounded-full',
                node.is_active ? 'bg-emerald-500' : 'bg-red-400',
              )} />
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                L{node.depth_level}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-xs text-purple-700 dark:text-purple-400">{node.upa_id}</p>
            <p className="text-[11px] text-muted-foreground">{joinDate}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          {/* 3 leg pills */}
          <div className="flex items-center gap-1.5">
            {(['L', 'M', 'R'] as const).map((leg) => (
              <div key={leg} className="flex items-center gap-1">
                <LegPill filled={!!childrenMap[leg]} />
                <span className="text-[10px] text-muted-foreground">{LEG_LABELS[leg]}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onViewProfile(node.upa_id)}
              className="text-xs text-primary hover:underline"
            >
              View profile →
            </button>
            {(hasChildren || !children) && depth < 5 && (
              <button
                onClick={handleExpand}
                disabled={loading}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {loading ? '…' : expanded ? 'Collapse' : 'Expand'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Children grid — auto-expand first 2 levels */}
      {expanded && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 pl-4 border-l-2 border-dashed border-border">
          {(['L', 'M', 'R'] as const).map((leg) => {
            const child = childrenMap[leg];
            return child ? (
              <TreeNodeCard
                key={leg}
                node={child}
                depth={depth + 1}
                onViewProfile={onViewProfile}
              />
            ) : (
              <div
                key={leg}
                className="flex items-center justify-center rounded-xl border border-dashed p-4 text-xs text-muted-foreground"
              >
                {LEG_LABELS[leg]} — Vacant
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
