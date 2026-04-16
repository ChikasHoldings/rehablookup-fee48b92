import { useEffect, useRef, useState, useCallback } from "react";
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
  Handshake,
  Star,
  Bell,
  Loader2,
  X,
  ArrowRight,
  Clock,
  Trash2,
  Sparkles,
  History,
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

const RECENT_SEARCHES_KEY = "provider-recent-searches";
const MAX_RECENT_SEARCHES = 5;

const pageIcons: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard className="h-4 w-4" />,
  listing: <Building2 className="h-4 w-4" />,
  inquiries: <Users className="h-4 w-4" />,
  credits: <CreditCard className="h-4 w-4" />,
  "unlock-history": <History className="h-4 w-4" />,
  "pro-upgrade": <Sparkles className="h-4 w-4" />,
  analytics: <BarChart3 className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
  notifications: <Bell className="h-4 w-4" />,
};

export function ProviderSearchCommand({ facilityId, onClose, variant = "header" }: ProviderSearchCommandProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { results, isLoading } = useProviderSearch(query, facilityId);
  const allResults = [...results.leads, ...results.pages];

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        setRecentSearches([]);
      }
    }
  }, []);

  // Save search to recent
  const saveRecentSearch = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return;
    
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== searchTerm.toLowerCase());
      const updated = [searchTerm, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Remove a recent search
  const removeRecentSearch = useCallback((searchTerm: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((s) => s !== searchTerm);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Clear all recent searches
  const clearAllRecentSearches = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  }, []);

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
  }, [results, query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const showingRecent = isOpen && !query && recentSearches.length > 0;
    const itemCount = showingRecent ? recentSearches.length : allResults.length;
    
    if (!isOpen || itemCount === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % itemCount);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + itemCount) % itemCount);
        break;
      case "Enter":
        e.preventDefault();
        if (showingRecent) {
          setQuery(recentSearches[selectedIndex]);
        } else if (allResults[selectedIndex]) {
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
    saveRecentSearch(query);
    navigate(result.url);
    setQuery("");
    setIsOpen(false);
    onClose?.();
  };

  const handleRecentClick = (searchTerm: string) => {
    setQuery(searchTerm);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const showDropdown = isOpen && (query.length > 0 || isLoading || recentSearches.length > 0);

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search leads, pages..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className="w-full h-10 pl-10 pr-8 bg-white/15 border-white/30 text-white text-sm placeholder:text-white/60 focus:bg-white/20 focus:border-white/50 focus:ring-white/20 rounded-lg"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-white/70 hover:text-white hover:bg-white/15"
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
          ) : !query && recentSearches.length > 0 ? (
            /* Recent Searches */
            <div>
              <div className="px-3 py-2 bg-muted/50 border-b flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Recent Searches
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={clearAllRecentSearches}
                >
                  Clear all
                </Button>
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={search}
                  onClick={() => handleRecentClick(search)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors group",
                    selectedIndex === index
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted shrink-0">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="flex-1 text-sm truncate">{search}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={(e) => removeRecentSearch(search, e)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </button>
              ))}
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
                          "text-xs shrink-0",
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">↑↓</kbd>
              <span>Navigate</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono ml-2">↵</kbd>
              <span>Select</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono ml-2">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
