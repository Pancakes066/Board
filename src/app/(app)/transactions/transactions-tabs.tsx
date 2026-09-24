"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

const TABS = [
  { href: "/transactions", label: "Transactions" },
  { href: "/transactions/recurring", label: "Récurrences" },
];

export function TransactionsTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-6 inline-flex rounded-lg bg-muted p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            pathname === tab.href
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
