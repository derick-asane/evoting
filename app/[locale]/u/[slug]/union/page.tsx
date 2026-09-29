import { notFound } from "next/navigation";

import { UsersIcon } from "@/app/components/icons";
import { Portrait } from "@/app/components/portrait";
import { Card, Notice } from "@/app/components/ui";
import { getDictionary } from "@/lib/i18n/server";
import { t } from "@/lib/i18n";
import { getUnionTree, type UnionNode } from "@/lib/union";
import { findUniversityBySlug } from "@/lib/universities";

export const dynamic = "force-dynamic";
export const metadata = { title: "Union team" };

export default async function UnionPage({
  params,
}: PageProps<"/[locale]/u/[slug]/union">) {
  const { slug } = await params;
  const [dict, university] = await Promise.all([
    getDictionary(),
    findUniversityBySlug(slug),
  ]);
  if (!university) notFound();

  const tree = await getUnionTree(university.id);
  const total = countNodes(tree);

  return (
    <div className="space-y-6">
      <div>
        <span className="mb-3 inline-flex size-11 items-center justify-center rounded-2xl bg-brand-wash text-brand">
          <UsersIcon size={21} />
        </span>
        <h1 className="font-display text-3xl tracking-tight">
          {dict.union.title}
        </h1>
        <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
          {dict.union.lead}
        </p>
        {total > 0 ? (
          <p className="mt-1 text-sm text-ink-faint">
            {t(dict.union.membersCount, { count: total })}
          </p>
        ) : null}
      </div>

      {tree.length === 0 ? (
        <Notice tone="warning">{dict.union.empty}</Notice>
      ) : (
        <Card>
          <Branch nodes={tree} depth={0} />
        </Card>
      )}
    </div>
  );
}

function countNodes(nodes: UnionNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countNodes(node.children), 0);
}

/**
 * One level of the hierarchy.
 *
 * Nesting is drawn with a left rule and an elbow into each card, so the shape
 * of the tree is readable without colour and survives at phone width.
 */
function Branch({ nodes, depth }: { nodes: UnionNode[]; depth: number }) {
  return (
    <ul className={depth === 0 ? "space-y-4" : "mt-3 space-y-3"}>
      {nodes.map((node) => (
        <li key={node.id} className="relative">
          <div
            className={`flex items-start gap-4 rounded-2xl border p-4 ${
              depth === 0
                ? "border-brand/25 bg-brand-wash"
                : "border-line bg-surface-muted"
            }`}
          >
            <Portrait
              photoId={node.photoId}
              name={node.fullName}
              index={depth}
              size={depth === 0 ? 60 : 48}
            />
            <div className="min-w-0 flex-1">
              <p
                className={`font-semibold ${depth === 0 ? "text-brand" : ""}`}
              >
                {node.role}
              </p>
              <p className="truncate">{node.fullName}</p>
              {node.bio ? (
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  {node.bio}
                </p>
              ) : null}
            </div>
          </div>

          {node.children.length > 0 ? (
            <div className="ml-5 border-l-2 border-line pl-5 sm:ml-7 sm:pl-7">
              <Branch nodes={node.children} depth={depth + 1} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
