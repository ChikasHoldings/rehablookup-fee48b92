import { Link } from "react-router-dom";
import { Home, ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  className?: string;
  variant?: "dark" | "light";
  /**
   * Whether this component should emit BreadcrumbList JSON-LD. Defaults to
   * `true` for legacy callers, but pages whose `<SEO>` component already emits
   * a BreadcrumbList (e.g. CenterProfile) must pass `false` to avoid Google
   * flagging duplicate structured-data sets on the page.
   */
  emitJsonLd?: boolean;
}

export function BreadcrumbNav({
  items,
  className = "",
  variant = "dark",
  emitJsonLd = true,
}: BreadcrumbNavProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://rehablookup.com",
      },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: item.label,
        ...(item.href && { item: `https://rehablookup.com${item.href}` }),
      })),
    ],
  };

  const colors = variant === "dark"
    ? { link: "text-white/60 hover:text-white", current: "text-white/90", sep: "text-white/30", home: "text-white/60 hover:text-white" }
    : { link: "text-muted-foreground hover:text-foreground", current: "text-foreground", sep: "text-muted-foreground/40", home: "text-muted-foreground hover:text-foreground" };

  return (
    <>
      {emitJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <nav
        aria-label="Breadcrumb"
        className={`text-sm min-w-0 max-w-full overflow-x-auto scrollbar-hide ${className}`}
      >
        <ol
          className="flex flex-row items-center gap-1.5 flex-nowrap min-w-0"
          itemScope
          itemType="https://schema.org/BreadcrumbList"
        >
          <li
            className="inline-flex items-center shrink-0"
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
          >
            <Link
              to="/"
              className={`inline-flex items-center gap-1 transition-colors ${colors.home}`}
              itemProp="item"
            >
              <Home className="h-3.5 w-3.5" />
              <span itemProp="name" className="sr-only sm:not-sr-only">Home</span>
            </Link>
            <meta itemProp="position" content="1" />
          </li>

          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li
                key={index}
                className={`inline-flex items-center ${isLast ? "min-w-0" : "shrink-0"}`}
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
              >
                <ChevronRight className={`h-3 w-3 mx-0.5 shrink-0 ${colors.sep}`} />
                {item.href ? (
                  <Link
                    to={item.href}
                    className={`transition-colors ${colors.link}`}
                    itemProp="item"
                  >
                    <span itemProp="name">{item.label}</span>
                  </Link>
                ) : (
                  <span
                    className={`font-medium truncate ${colors.current}`}
                    itemProp="name"
                    aria-current="page"
                    title={item.label}
                  >
                    {item.label}
                  </span>
                )}
                <meta itemProp="position" content={String(index + 2)} />
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
