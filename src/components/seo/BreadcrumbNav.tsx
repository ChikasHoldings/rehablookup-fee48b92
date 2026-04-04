import { Link } from "react-router-dom";
import { Home, ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function BreadcrumbNav({ items, className = "" }: BreadcrumbNavProps) {
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <nav
        aria-label="Breadcrumb"
        className={`text-sm ${className}`}
      >
        <ol
          className="flex flex-row items-center gap-1.5 flex-nowrap"
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
              className="inline-flex items-center gap-1 text-white/60 hover:text-white transition-colors"
              itemProp="item"
            >
              <Home className="h-3.5 w-3.5" />
              <span itemProp="name" className="sr-only sm:not-sr-only">Home</span>
            </Link>
            <meta itemProp="position" content="1" />
          </li>

          {items.map((item, index) => (
            <li
              key={index}
              className="inline-flex items-center shrink-0"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              <ChevronRight className="h-3 w-3 text-white/30 mx-0.5" />
              {item.href ? (
                <Link
                  to={item.href}
                  className="text-white/60 hover:text-white transition-colors"
                  itemProp="item"
                >
                  <span itemProp="name">{item.label}</span>
                </Link>
              ) : (
                <span
                  className="text-white/90 font-medium"
                  itemProp="name"
                  aria-current="page"
                >
                  {item.label}
                </span>
              )}
              <meta itemProp="position" content={String(index + 2)} />
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
