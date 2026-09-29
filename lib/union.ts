import "server-only";

import { prisma } from "./db";
import { deletePhotoIfOrphaned } from "./photos";

export type UnionNode = {
  id: string;
  fullName: string;
  role: string;
  bio: string | null;
  photoId: string | null;
  position: number;
  children: UnionNode[];
};

/** Flat row, for the admin list and the parent picker. */
export type UnionRow = {
  id: string;
  fullName: string;
  role: string;
  parentId: string | null;
  /** Depth from the root, used to indent the picker. */
  depth: number;
};

/**
 * The whole union as a tree.
 *
 * Read flat in one query and assembled in memory: these are tens of rows, and
 * a recursive CTE would cost more to maintain than it saves.
 */
export async function getUnionTree(universityId: string): Promise<UnionNode[]> {
  const members = await prisma.unionMember.findMany({
    where: { universityId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      fullName: true,
      role: true,
      bio: true,
      photoId: true,
      position: true,
      parentId: true,
    },
  });

  const nodes = new Map<string, UnionNode>();
  for (const member of members) {
    nodes.set(member.id, { ...member, children: [] });
  }

  const roots: UnionNode[] = [];
  for (const member of members) {
    const node = nodes.get(member.id)!;
    const parent = member.parentId ? nodes.get(member.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return roots;
}

/** Flattened depth-first, so the admin picker reads in tree order. */
export async function listUnionRows(universityId: string): Promise<UnionRow[]> {
  const tree = await getUnionTree(universityId);
  const rows: UnionRow[] = [];

  const walk = (nodes: UnionNode[], depth: number, parentId: string | null) => {
    for (const node of nodes) {
      rows.push({
        id: node.id,
        fullName: node.fullName,
        role: node.role,
        parentId,
        depth,
      });
      walk(node.children, depth + 1, node.id);
    }
  };

  walk(tree, 0, null);
  return rows;
}

export async function countUnionMembers(universityId: string): Promise<number> {
  return prisma.unionMember.count({ where: { universityId } });
}

export type AddMemberFailure = "nameRequired" | "roleRequired" | "badParent";

export async function addUnionMember(
  universityId: string,
  input: {
    fullName: string;
    role: string;
    bio?: string;
    photoId?: string;
    parentId?: string | null;
  },
): Promise<{ ok: true; id: string } | { ok: false; code: AddMemberFailure }> {
  const fullName = input.fullName.trim();
  const role = input.role.trim();

  if (!fullName) return { ok: false, code: "nameRequired" };
  if (!role) return { ok: false, code: "roleRequired" };

  // A parent from another institution would graft one union onto another.
  if (input.parentId) {
    const parent = await prisma.unionMember.findFirst({
      where: { id: input.parentId, universityId },
      select: { id: true },
    });
    if (!parent) return { ok: false, code: "badParent" };
  }

  const siblings = await prisma.unionMember.count({
    where: { universityId, parentId: input.parentId ?? null },
  });

  const member = await prisma.unionMember.create({
    data: {
      universityId,
      fullName,
      role,
      bio: input.bio?.trim() || null,
      photoId: input.photoId ?? null,
      parentId: input.parentId ?? null,
      position: siblings,
    },
    select: { id: true },
  });

  return { ok: true, id: member.id };
}

/**
 * Removes a member. Their subtree goes with them, since `onDelete: Cascade` on
 * the self-relation means a deleted officer takes their reports rather than
 * leaving orphans pointing at nothing.
 */
export async function removeUnionMember(
  universityId: string,
  memberId: string,
): Promise<boolean> {
  const member = await prisma.unionMember.findFirst({
    where: { id: memberId, universityId },
    select: { id: true, photoId: true },
  });
  if (!member) return false;

  await prisma.unionMember.delete({ where: { id: member.id } });
  if (member.photoId) await deletePhotoIfOrphaned(member.photoId);
  return true;
}
