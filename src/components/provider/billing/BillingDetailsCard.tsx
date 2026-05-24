import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, FileText, AlertCircle, ExternalLink, Download } from "lucide-react";
import { useBillingSummary, type BillingInvoice } from "@/hooks/useBillingSummary";

interface BillingDetailsCardProps {
  facilityId: string;
  /** Opens the Stripe customer portal (full management). */
  onManage: () => void;
  managing?: boolean;
}

function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency || "usd").toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800",
  open: "bg-amber-100 text-amber-800",
  uncollectible: "bg-rose-100 text-rose-800",
  void: "bg-slate-100 text-slate-600",
  draft: "bg-slate-100 text-slate-600",
};

function InvoiceRow({ invoice }: { invoice: BillingInvoice }) {
  const amount = invoice.amountPaid > 0 ? invoice.amountPaid : invoice.amountDue;
  const statusLabel = invoice.status ?? "—";
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">
          {invoice.number || formatDate(invoice.created)}
        </p>
        <p className="text-xs text-slate-500">{formatDate(invoice.created)}</p>
      </div>
      <span className="text-sm tabular-nums text-slate-700">
        {formatMoney(amount, invoice.currency)}
      </span>
      <span
        className={`hidden sm:inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
          STATUS_STYLES[statusLabel] ?? "bg-slate-100 text-slate-600"
        }`}
      >
        {statusLabel}
      </span>
      {invoice.invoicePdf || invoice.hostedInvoiceUrl ? (
        <Button asChild variant="ghost" size="sm" className="h-8 shrink-0 gap-1 px-2 text-xs">
          <a
            href={invoice.invoicePdf || invoice.hostedInvoiceUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">{invoice.invoicePdf ? "PDF" : "View"}</span>
          </a>
        </Button>
      ) : null}
    </li>
  );
}

/**
 * Real Stripe-backed payment method + recent invoices, shown in-app.
 * Full management (update card, all invoices) still routes to the Stripe
 * customer portal via `onManage`.
 */
export function BillingDetailsCard({ facilityId, onManage, managing }: BillingDetailsCardProps) {
  const { data, isLoading, isError, refetch } = useBillingSummary(facilityId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b py-3.5">
        <CardTitle className="text-base">Payment &amp; invoices</CardTitle>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onManage} disabled={managing}>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Manage in Stripe
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <AlertCircle className="h-6 w-6 text-destructive" aria-hidden />
            <p className="text-sm text-slate-600">Couldn't load your payment details.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            {/* Payment method */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <CreditCard className="h-4 w-4 text-slate-600" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wide text-slate-500">Payment method</p>
                {data?.paymentMethod ? (
                  <p className="text-sm font-medium capitalize text-slate-900">
                    {data.paymentMethod.brand} •••• {data.paymentMethod.last4}
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      exp {String(data.paymentMethod.expMonth).padStart(2, "0")}/
                      {String(data.paymentMethod.expYear).slice(-2)}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">No card on file</p>
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-8 shrink-0 px-2 text-xs" onClick={onManage} disabled={managing}>
                Update
              </Button>
            </div>

            {/* Invoices */}
            {data && data.invoices.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {data.invoices.map((inv) => (
                  <InvoiceRow key={inv.id} invoice={inv} />
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                No invoices yet. Your first invoice appears here after your initial payment.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
