"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Início" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/simulacoes", label: "Simulações" },
  { href: "/bi", label: "BI" }
];

export function TopNavigation() {
  const pathname = usePathname();

  return (
    <nav className="topbar-nav" aria-label="Navegação principal">
      {NAV_ITEMS.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-chip${isActive ? " is-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
