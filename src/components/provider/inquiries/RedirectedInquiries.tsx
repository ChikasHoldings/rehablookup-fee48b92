import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HeartHandshake, Mail, Phone, MapPin, Clock, ArrowRight } from "lucide-react";
import { useRedirectedInquiries } from "@/hooks/useRedirectedInquiries";

interface RedirectedInquiriesProps {
  facilityIds: string[];
}

/**
 * Inquiries that arrived on a free / unclaimed listing and were routed to
 * the concierge placement team on submission. The originating provider
 * still sees them here (full contact) — they're shared with the placement
 * team, NOT exclusive. Pro is the upsell to exclusive, direct-to-inbox
 * leads. Self-hides when there are none (e.g. Pro facilities).
 */
export function RedirectedInquiries({ facilityIds }: RedirectedInquiriesProps) {
  const { data: inquiries = [], isLoading } = useRedirectedInquiries(facilityIds);

  if (isLoading || inquiries.length === 0) return null;

  return (
    <section className="border-b border-amber-200/70 bg-amber-50/40 p-3 sm:p-4">
      <div className="flex items-start gap-2.5 mb-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
          <HeartHandshake className="h-4 w-4 text-amber-600" aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">
            Inquiries sent to our placement team
            <Badge variant="outline" className="ml-2 border-amber-300 bg-white text-amber-700 align-middle">
              {inquiries.length}
            </Badge>
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            These families reached out through your free listing. Our placement team is
            helping them — you can follow up too. Upgrade to Pro to receive new inquiries
            exclusively, direct to your inbox.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {inquiries.map((inq) => (
          <li
            key={inq.id}
            className="rounded-lg border border-amber-200/80 bg-white p-3 text-left"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-slate-900">
                {inq.name || "New inquiry"}
              </p>
              <span className="shrink-0 text-[11px] text-slate-400">
                {formatDistanceToNow(new Date(inq.created_at), { addSuffix: true })}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
              {inq.level_of_care && <span>{inq.level_of_care.replace(/_/g, " ")}</span>}
              {inq.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {inq.location}
                </span>
              )}
              {inq.urgency && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden />
                  {inq.urgency.replace(/_/g, " ")}
                </span>
              )}
              {inq.insurance && <span className="truncate">{inq.insurance}</span>}
            </div>

            {(inq.email || inq.phone) && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {inq.phone && (
                  <a
                    href={`tel:${inq.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Phone className="h-3 w-3" aria-hidden />
                    {inq.phone}
                  </a>
                )}
                {inq.email && (
                  <a
                    href={`mailto:${inq.email}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 max-w-full"
                  >
                    <Mail className="h-3 w-3 shrink-0" aria-hidden />
                    <span className="truncate">{inq.email}</span>
                  </a>
                )}
              </div>
            )}

            {inq.message && (
              <p className="mt-2 line-clamp-2 text-xs text-slate-500">"{inq.message}"</p>
            )}
          </li>
        ))}
      </ul>

      <Button
        asChild
        size="sm"
        variant="outline"
        className="mt-3 w-full gap-1.5 border-amber-300 bg-white text-amber-800 hover:bg-amber-50"
      >
        <Link to="/provider/billing?upgrade=pro">
          Get these exclusively with Pro <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </section>
  );
}
