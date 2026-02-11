import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  linkTo?: string;
  showIcon?: boolean;
}

const sizeMap = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-4xl",
} as const;

const iconSizeMap = {
  sm: "h-5 w-5",
  md: "h-7 w-7",
  lg: "h-10 w-10",
} as const;

function ClawIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Three claw marks forming a stylized "C" shape */}
      <path
        d="M8 6C8 6 14 4 18 8C22 12 20 18 16 20"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="text-navy"
      />
      <path
        d="M6 12C6 12 12 10 16 14C20 18 18 24 14 26"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="text-light-blue"
      />
      <path
        d="M10 18C10 18 14 17 17 20C20 23 19 27 16 28"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="text-navy/60"
      />
      {/* Stacking dots — representing data layers */}
      <circle cx="24" cy="10" r="2" className="fill-light-blue" />
      <circle cx="26" cy="16" r="1.5" className="fill-navy/40" />
      <circle cx="24" cy="22" r="1.5" className="fill-light-blue/60" />
    </svg>
  );
}

export function Logo({
  className,
  size = "md",
  linkTo = "/",
  showIcon = true,
}: LogoProps) {
  const content = (
    <span
      className={cn(
        "font-serif tracking-tight select-none inline-flex items-center gap-1.5",
        sizeMap[size],
        className
      )}
    >
      {showIcon && <ClawIcon className={iconSizeMap[size]} />}
      <span className="inline-flex items-baseline">
        <span className="text-navy">Claw</span>
        <span className="text-light-blue">Stak</span>
        <span className="text-navy/60">.ai</span>
      </span>
    </span>
  );

  if (linkTo) {
    return (
      <Link
        href={linkTo}
        className="inline-flex items-center no-underline"
      >
        {content}
      </Link>
    );
  }

  return content;
}
