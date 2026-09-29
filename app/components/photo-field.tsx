"use client";

import { useId, useRef, useState } from "react";

/**
 * File picker with a local preview.
 *
 * The preview is an object URL built in the browser — nothing is uploaded until
 * the form is submitted, so choosing the wrong face costs nothing.
 */
export function PhotoField({
  label,
  hint,
  name,
  nameHint,
}: {
  label: string;
  hint: string;
  name: string;
  /** Shown when no file is chosen. */
  nameHint: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (preview) URL.revokeObjectURL(preview);

    if (!file) {
      setPreview(null);
      setFileName(null);
      return;
    }
    setPreview(URL.createObjectURL(file));
    setFileName(file.name);
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface-sunken">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="size-7 text-ink-faint"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              aria-hidden="true"
            >
              <circle cx="12" cy="9" r="3.4" />
              <path d="M5 19.5a7 7 0 0 1 14 0" strokeLinecap="round" />
            </svg>
          )}
        </span>

        <div className="min-w-0">
          <input
            ref={input}
            id={id}
            name={name}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onChange}
            className="block w-full text-sm text-ink-soft file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-surface-muted"
          />
          <p className="mt-1.5 truncate text-xs text-ink-faint">
            {fileName ?? nameHint} · {hint}
          </p>
        </div>
      </div>
    </div>
  );
}
