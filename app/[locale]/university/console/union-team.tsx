"use client";

import { useActionState } from "react";

import {
  addUnionMemberAction,
  removeUnionMemberAction,
  type AdminState,
} from "@/app/actions/admin";
import { PhotoField } from "@/app/components/photo-field";
import { UsersIcon } from "@/app/components/icons";
import { Card, CardTitle, Field, Notice, buttonStyles } from "@/app/components/ui";
import type { Dictionary } from "@/lib/i18n";
import type { UnionRow } from "@/lib/union";

const EMPTY: AdminState = {};

export function UnionTeam({
  locale,
  rows,
  labels,
  photo,
}: {
  locale: string;
  rows: UnionRow[];
  labels: Dictionary["union"];
  photo: Dictionary["photo"];
}) {
  const [addState, addAction, adding] = useActionState(addUnionMemberAction, EMPTY);
  const [removeState, removeAction, removing] = useActionState(
    removeUnionMemberAction,
    EMPTY,
  );

  return (
    <Card>
      <CardTitle icon={<UsersIcon size={19} />} hint={labels.manageHint}>
        {labels.manageTitle}
      </CardTitle>

      {addState.error ? <Notice tone="error">{addState.error}</Notice> : null}
      {addState.notice ? <Notice tone="success">{addState.notice}</Notice> : null}

      <form action={addAction} className="mt-4 space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={labels.memberName} name="fullName" />
          <Field label={labels.memberRole} name="role" />
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">
            {labels.memberParent}
          </span>
          <select
            name="parentId"
            defaultValue=""
            className="w-full rounded-xl border border-line-control bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-brand"
          >
            <option value="">{labels.memberParentNone}</option>
            {rows.map((row) => (
              <option key={row.id} value={row.id}>
                {`${"— ".repeat(row.depth)}${row.role} · ${row.fullName}`}
              </option>
            ))}
          </select>
        </label>

        <PhotoField
          label={labels.memberPhoto}
          hint={photo.hint}
          name="photo"
          nameHint={photo.none}
        />

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">
            {labels.memberBio}
          </span>
          <textarea
            name="bio"
            rows={2}
            className="w-full rounded-xl border border-line-control bg-surface px-3.5 py-2.5 text-sm outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-4 focus:ring-brand/12"
          />
        </label>

        <button type="submit" disabled={adding} className={buttonStyles.primary}>
          {adding ? labels.addingMember : labels.addMember}
        </button>
      </form>

      <div className="mt-6 border-t border-line pt-5">
        {removeState.error ? (
          <Notice tone="error">{removeState.error}</Notice>
        ) : null}
        {removeState.notice ? (
          <Notice tone="success">{removeState.notice}</Notice>
        ) : null}

        {rows.length === 0 ? (
          <p className="text-sm text-ink-soft">{labels.noMembers}</p>
        ) : (
          <>
            <p className="mb-3 text-xs text-ink-faint">{labels.removeWarning}</p>
            <ul className="divide-y divide-line text-sm">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center gap-3 py-2.5"
                  style={{ paddingLeft: row.depth * 20 }}
                >
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{row.role}</span>
                    <span className="ml-2 text-ink-soft">{row.fullName}</span>
                  </span>
                  <form action={removeAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="memberId" value={row.id} />
                    <button
                      type="submit"
                      disabled={removing}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-danger-wash hover:text-danger disabled:opacity-60"
                    >
                      {labels.removeMember}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}
