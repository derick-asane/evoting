import type { SVGProps } from "react";

/**
 * Inline SVG so icons inherit `currentColor` and need no runtime or network.
 * All drawn on a 24-grid with a 1.6 stroke, so they sit together evenly.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** The product mark: a ballot slip dropping into a box, sealed by a link. */
export function BrandMark({ size = 32, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <rect
        x="3"
        y="13"
        width="26"
        height="16"
        rx="3.5"
        fill="var(--brand)"
        opacity="0.14"
      />
      <path
        d="M3 16.5C3 14.567 4.567 13 6.5 13h19c1.933 0 3.5 1.567 3.5 3.5v9c0 1.933-1.567 3.5-3.5 3.5h-19A3.5 3.5 0 0 1 3 25.5v-9Z"
        stroke="var(--brand)"
        strokeWidth="1.8"
      />
      <path
        d="M11 13V6.2A2.2 2.2 0 0 1 13.2 4h9.6A2.2 2.2 0 0 1 25 6.2V13"
        stroke="var(--brand)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="m14.8 8.6 2.1 2.1 4-4.2"
        stroke="var(--gold)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 19h8.2a1 1 0 0 1 .9.55l.55 1.1a1 1 0 0 0 .9.55h4.9a1 1 0 0 0 .9-.55l.55-1.1a1 1 0 0 1 .9-.55H29"
        stroke="var(--brand)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const ShieldIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3.2 5 6v6c0 4.4 2.9 7.6 7 8.8 4.1-1.2 7-4.4 7-8.8V6l-7-2.8Z" />
    <path d="m9.2 12.2 2 2 3.6-4" />
  </Icon>
);

export const LockIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.2" />
    <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    <circle cx="12" cy="15.2" r="1.1" fill="currentColor" stroke="none" />
  </Icon>
);

export const LedgerIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" />
    <path d="M8 4.5v15M11.5 9h6M11.5 12.5h6M11.5 16h3.5" />
  </Icon>
);

export const BallotIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3.5" y="9.5" width="17" height="11" rx="2.2" />
    <path d="M7.5 9.5v-5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v5" />
    <path d="m9.8 6.2 1.6 1.6 3-3.2" />
    <path d="M3.5 14h4l1 1.6h7l1-1.6h4" />
  </Icon>
);

export const UsersIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="9.5" cy="8.5" r="3.2" />
    <path d="M3.8 19.5a5.7 5.7 0 0 1 11.4 0" />
    <path d="M16.2 6.1a3.2 3.2 0 0 1 0 6.1M17.6 14.6a5.7 5.7 0 0 1 3.1 4.9" />
  </Icon>
);

export const ChartIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 20V4" />
    <path d="M4 20h16" />
    <rect x="7.5" y="12" width="3.2" height="5" rx="1" />
    <rect x="13.3" y="8" width="3.2" height="9" rx="1" />
  </Icon>
);

export const BellIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M18 9.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5Z" />
    <path d="M13.7 19.5a2 2 0 0 1-3.4 0" />
  </Icon>
);

export const CheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);

export const AlertIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 4.5 2.8 20h18.4L12 4.5Z" />
    <path d="M12 10.2v4M12 17.3h.01" />
  </Icon>
);

export const ArrowIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4.5 12h15M13.5 6l6 6-6 6" />
  </Icon>
);

export const GraduateIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m12 4 9 4.6-9 4.6-9-4.6L12 4Z" />
    <path d="M6.5 10.8v4.6c0 1.6 2.5 2.9 5.5 2.9s5.5-1.3 5.5-2.9v-4.6" />
    <path d="M21 8.6v5.2" />
  </Icon>
);

export const EyeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

export const EyeOffIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9.9 5.1A8.5 8.5 0 0 1 12 4.9c6 0 9.5 6.2 9.5 6.2a16 16 0 0 1-2.4 3.2M6.4 6.6A16 16 0 0 0 2.5 11.1S6 17.3 12 17.3a8.7 8.7 0 0 0 3.6-.8" />
    <path d="M10 10a2.8 2.8 0 0 0 4 4" />
    <path d="M3.5 3.5l17 17" />
  </Icon>
);

export const UserIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="8.2" r="3.7" />
    <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
  </Icon>
);

export const MailIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="m3.6 7 7.3 5.3a2 2 0 0 0 2.2 0L20.4 7" />
  </Icon>
);

export const KeyIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="8" cy="12" r="3.8" />
    <path d="M11.8 12H21M18 12v3.2M15 12v2.4" />
  </Icon>
);

export const IdIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="2.8" y="5" width="18.4" height="14" rx="2.5" />
    <circle cx="8.6" cy="11" r="2.1" />
    <path d="M5.3 16.2a3.6 3.6 0 0 1 6.6 0M14.4 10.2h4.1M14.4 13.6h2.8" />
  </Icon>
);

export const LogoutIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9.5 20H6.2A2.2 2.2 0 0 1 4 17.8V6.2A2.2 2.2 0 0 1 6.2 4h3.3" />
    <path d="M15.5 15.5 20 12l-4.5-3.5M20 12H9.5" />
  </Icon>
);

export const ChevronDownIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />
  </Icon>
);

export const LinkIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M10 13.8a3.6 3.6 0 0 0 5.4.4l2.4-2.4a3.6 3.6 0 0 0-5.1-5.1l-1.4 1.4" />
    <path d="M14 10.2a3.6 3.6 0 0 0-5.4-.4l-2.4 2.4a3.6 3.6 0 0 0 5.1 5.1l1.4-1.4" />
  </Icon>
);
