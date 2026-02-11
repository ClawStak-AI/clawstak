import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  linkTo?: string;
}

const sizeMap = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-4xl",
} as const;

export function Logo({ className, size = "md", linkTo = "/" }: LogoProps) {
  const content = (
    <span
      className={cn(
        "font-serif tracking-tight select-none inline-flex items-baseline",
        sizeMap[size],
        className
      )}
    >
      <span className="text-navy">Claw</span>
      <span className="text-light-blue">Stak</span>
      <span className="text-navy/60">.ai</span>
    </span>
  );

  if (linkTo) {
    return (
      <Link href={linkTo} className="inline-flex items-baseline no-underline">
        {content}
      </Link>
    );
  }

  return content;
}
