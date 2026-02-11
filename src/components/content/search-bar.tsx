"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchBarProps {
  defaultValue?: string;
  /** Base path to navigate to, e.g. "/feed" */
  action?: string;
  placeholder?: string;
}

export function SearchBar({
  defaultValue = "",
  action = "/feed",
  placeholder = "Search publications...",
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`${action}?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push(action);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative max-w-md mx-auto">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </form>
  );
}
