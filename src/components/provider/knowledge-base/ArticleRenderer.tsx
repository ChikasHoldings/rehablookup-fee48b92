import React from "react";

interface InlineTextProps {
  text: string;
}

/** Renders inline bold (**text**) within a string */
function InlineText({ text }: InlineTextProps) {
  const parts = text.split(/\*\*(.*?)\*\*/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-foreground">
            {part}
          </strong>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

interface ArticleRendererProps {
  content: string;
}

/**
 * Parses simple markdown content into structured React elements.
 * Supports: h1-h3, ordered/unordered lists (grouped), tables, paragraphs, bold.
 */
export function ArticleRenderer({ content }: ArticleRendererProps) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trimEnd();

    // Skip empty lines
    if (trimmed === "") {
      i++;
      continue;
    }

    // H1
    if (trimmed.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-xl font-bold text-foreground mt-6 mb-3 first:mt-0">
          {trimmed.slice(2)}
        </h1>
      );
      i++;
      continue;
    }

    // H2
    if (trimmed.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-base font-semibold text-foreground mt-6 mb-2 border-b border-border/40 pb-1.5">
          {trimmed.slice(3)}
        </h2>
      );
      i++;
      continue;
    }

    // H3
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-sm font-semibold text-foreground mt-4 mb-1.5">
          {trimmed.slice(4)}
        </h3>
      );
      i++;
      continue;
    }

    // Unordered list: collect consecutive `- ` lines
    if (trimmed.startsWith("- ")) {
      const listItems: { text: string; startIndex: number }[] = [];
      while (i < lines.length && lines[i].trimEnd().startsWith("- ")) {
        listItems.push({ text: lines[i].trimEnd().slice(2), startIndex: i });
        i++;
      }
      elements.push(
        <ul key={`ul-${listItems[0].startIndex}`} className="my-2 space-y-1.5 ml-1">
          {listItems.map((item) => (
            <li
              key={item.startIndex}
              className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed"
            >
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0" />
              <span className="flex-1">
                <InlineText text={item.text} />
              </span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list: collect consecutive `1. `, `2. `, etc.
    if (/^\d+\.\s/.test(trimmed)) {
      const listItems: { text: string; startIndex: number }[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trimEnd())) {
        const raw = lines[i].trimEnd();
        listItems.push({
          text: raw.slice(raw.indexOf(" ") + 1),
          startIndex: i,
        });
        i++;
      }
      elements.push(
        <ol key={`ol-${listItems[0].startIndex}`} className="my-2 space-y-1.5 ml-1 counter-reset-list">
          {listItems.map((item, idx) => (
            <li
              key={item.startIndex}
              className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed"
            >
              <span className="mt-0.5 h-5 w-5 rounded-md bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <span className="flex-1">
                <InlineText text={item.text} />
              </span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Table: collect consecutive `| ` lines
    if (trimmed.startsWith("| ")) {
      const tableRows: { cells: string[]; startIndex: number }[] = [];
      while (i < lines.length && lines[i].trimEnd().startsWith("| ")) {
        const raw = lines[i].trimEnd();
        // Skip separator rows like |------|------|
        if (/^\|[\s\-|]+\|$/.test(raw)) {
          i++;
          continue;
        }
        const cells = raw
          .split("|")
          .filter((_, ci) => ci > 0 && ci < raw.split("|").length - 1)
          .map((c) => c.trim());
        tableRows.push({ cells, startIndex: i });
        i++;
      }
      if (tableRows.length > 0) {
        const headerRow = tableRows[0];
        const bodyRows = tableRows.slice(1);
        elements.push(
          <div key={`table-${headerRow.startIndex}`} className="my-3 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  {headerRow.cells.map((cell, ci) => (
                    <th
                      key={ci}
                      className="px-3 py-2 text-left font-semibold text-foreground text-xs"
                    >
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row) => (
                  <tr key={row.startIndex} className="border-t border-border/50">
                    {row.cells.map((cell, ci) => (
                      <td
                        key={ci}
                        className="px-3 py-2 text-muted-foreground text-xs"
                      >
                        <InlineText text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-2">
        <InlineText text={trimmed} />
      </p>
    );
    i++;
  }

  return <div className="space-y-0">{elements}</div>;
}
