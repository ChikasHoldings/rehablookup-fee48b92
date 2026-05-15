/**
 * CenterSidebar
 * ─────────────
 * Sticky right column with stacked conversion CTAs. Renders 3 cards by
 * default; if the facility is unclaimed, adds a 4th "Claim this profile"
 * card so providers can convert directly from a landing page.
 */
import { Link } from "react-router-dom";
import { Phone, ShieldCheck, HeartHandshake, Building2 } from "lucide-react";

interface CenterSidebarProps {
  facility: {
    name: string;
    slug: string | null;
    is_claimed?: boolean;
  };
  advisorPhone?: string;
}

export function CenterSidebar({
  facility,
  advisorPhone = "(214) 639-6420",
}: CenterSidebarProps) {
  const isUnclaimed = facility.is_claimed === false;

  return (
    <aside className="space-y-4 lg:sticky lg:top-24">
      {/* Verify Insurance */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-900">Verify Insurance</h3>
        </div>
        <p className="text-xs text-slate-600 mb-3">
          Free, confidential check — see what's covered before you call.
        </p>
        <Link
          to="/insurance-verification"
          className="block w-full rounded-md bg-[#1B365D] px-4 py-2 text-center text-sm font-medium text-white hover:bg-[#142a4a]"
        >
          Get Started
        </Link>
      </div>

      {/* Talk to a Recovery Advisor */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-2">
          <HeartHandshake className="h-5 w-5 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-900">Talk to a Free Recovery Advisor</h3>
        </div>
        <p className="text-xs text-slate-600 mb-3">
          24/7 placement support — no obligation.
        </p>
        <a
          href={`tel:${advisorPhone.replace(/\D/g, "")}`}
          className="flex items-center justify-center gap-2 w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:border-emerald-300 hover:text-emerald-700"
        >
          <Phone className="h-4 w-4" />
          {advisorPhone}
        </a>
      </div>

      {/* Get Matched */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">
          Get Matched with a Center
        </h3>
        <p className="text-xs text-slate-600 mb-3">
          Tell us about your situation — we'll match you with verified centers in your area.
        </p>
        <Link
          to="/concierge"
          className="block w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-900 hover:border-emerald-300 hover:text-emerald-700"
        >
          Free Concierge Match
        </Link>
      </div>

      {/* Claim — only when listing is unclaimed */}
      {isUnclaimed && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-5 w-5 text-amber-700" />
            <h3 className="text-sm font-semibold text-amber-900">Are you the owner?</h3>
          </div>
          <p className="text-xs text-amber-800 mb-3">
            Claim this profile to update details, photos, and respond to inquiries.
          </p>
          <Link
            to={facility.slug ? `/provider/claim/${facility.slug}` : "/provider-signup"}
            className="block w-full rounded-md bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-amber-700"
          >
            Claim This Profile
          </Link>
        </div>
      )}
    </aside>
  );
}
