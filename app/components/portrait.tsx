import { CandidateAvatar, seriesColor } from "./ui";

/**
 * A person's face, falling back to their initials.
 *
 * Uses a plain <img>: these are user uploads served from our own route with a
 * verified content type, and routing them through next/image would only add an
 * optimisation step for pictures already capped at 4 MB.
 */
export function Portrait({
  photoId,
  name,
  index = 0,
  size = 56,
  alt,
}: {
  photoId: string | null;
  name: string;
  /** Ballot position, so the fallback keeps the candidate's own colour. */
  index?: number;
  size?: number;
  alt?: string;
}) {
  if (!photoId) {
    return <CandidateAvatar name={name} index={index} size={size} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/photo/${photoId}`}
      alt={alt ?? name}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="shrink-0 rounded-full object-cover"
      style={{
        width: size,
        height: size,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${seriesColor(index)} 30%, transparent)`,
        background: "var(--surface-sunken)",
      }}
    />
  );
}
