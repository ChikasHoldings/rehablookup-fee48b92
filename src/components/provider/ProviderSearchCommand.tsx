import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  User,
  FileText,
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  CreditCard,
  Settings,
  Bell,
  Loader2,
  X,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useProviderSearch, SearchResult } from "@/hooks/useProviderSearch";

interface ProviderSearchCommandProps {
  facilityId?: string;
  onClose?: () => void;
  variant?: "header" | "modal";
}

const pageIcons: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard className="h-4 w-4" />,
  listing: <Building2 className="h-4 w-4" />,
  leads: <Users className="h-4 w-4" />,
  analytics: <BarChart3 className="h-4 w-4" />,
  billing: <CreditCard className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
  notifications: <Bell className="h-4 w-4" />,
};

export function ProviderSearchCommand({ facilityId, onClose, variant = "header" }: ProviderSearchCommandProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { results, isLoading } = useProviderSearch(query, facilityId);
  const allResults = [...results.leads, ...results.pages];

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || allResults.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % allResults.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allResults.length) % allResults.length);
        break;
      case "Enter":
        e.preventDefault();
        if (allResults[selectedIndex]) {
          handleSelect(allResults[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setQuery("");
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.url);
    setQuery("");
    setIsOpen(false);
    onClose?.();
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const showDropdown = isOpen && (query.length > 0 || isLoading);

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search leads, pages..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className="w-full h-9 pl-9 pr-8 bg-white/10 border-white/20 text-white text-sm placeholder:text-white/50 focus:bg-white/15 focus:border-white/30 rounded-lg"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-white/50 hover:text-white hover:bg-white/10"
            onClick={handleClear}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Dropdown Results */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-card border rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : allResults.length === 0 && query.length > 0 ? (
            <div className="py-8 text-center">
              <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No results for "{query}"</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              {/* Leads Results */}
              {results.leads.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-muted/50 border-b">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Leads ({results.leads.length})
                    </span>
                  </div>
                  {results.leads.map((result, index) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                        selectedIndex === index
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] shrink-0",
                          result.metadata?.status === "new" && "bg-green-500/10 text-green-600 border-green-200",
                          result.metadata?.status === "contacted" && "bg-blue-500/10 text-blue-600 border-blue-200",
                          result.metadata?.status === "converted" && "bg-purple-500/10 text-purple-600 border-purple-200"
                        )}
                      >
                        {String(result.metadata?.status || "new")}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Pages Results */}
              {results.pages.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-muted/50 border-b border-t">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Pages ({results.pages.length})
                    </span>
                  </div>
                  {results.pages.map((result, index) => {
                    const actualIndex = results.leads.length + index;
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleSelect(result)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                          selectedIndex === actualIndex
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted shrink-0">
                          {pageIcons[result.id] || <FileText className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{result.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="px-3 py-2 bg-muted/30 border-t flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↑↓</kbd>
              <span>Navigate</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono ml-2">↵</kbd>
              <span>Select</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono ml-2">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
