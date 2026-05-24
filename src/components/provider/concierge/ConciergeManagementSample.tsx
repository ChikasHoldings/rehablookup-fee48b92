import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, History } from "lucide-react";

/**
 * Static sample of the Concierge management panel — what a Pro provider
 * with an active Concierge Partner subscription sees. Rendered inside
 * `LockedFeaturePreview` on /provider/marketing/concierge for Free
 * providers so they can preview the workflow before upgrading.
 *
 * Fabricated illustration only. The wrapping `LockedFeaturePreview`
 * makes the whole subtree inert and overlays a "Preview" badge so the
 * provider can never mistake this for their real data.
 */
export function ConciergeManagementSample() {
  return (
    <div className="space-y-6">
      <Card className="border-violet-200 bg-violet-50/40">
        <CardContent className="p-5 flex gap-3">
          <ShieldCheck className="h-5 w-5 mt-0.5 shrink-0 text-violet-700" aria-hidden />
          <div className="text-sm leading-relaxed text-slate-800">
            <p className="font-semibold text-slate-900 mb-1">EKRA-compliant by design</p>
            <p>
              Concierge Partner is a flat subscription fee for prominent surfacing
              by our human advisors — never per-call, per-lead, or per-admission.
              Our advisors always present at least two non-partner alternatives
              alongside any partner facilities.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Active geographies</CardTitle>
          <Badge variant="outline" className="text-xs">+ Add a geography</Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200">
                  <th className="px-4 py-2 font-medium text-slate-700">Geography</th>
                  <th className="px-4 py-2 font-medium text-slate-700">Levels of care</th>
                  <th className="px-4 py-2 font-medium text-slate-700">Activated</th>
                  <th className="px-4 py-2 font-medium text-slate-700 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-900">Phoenix, AZ</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">Detox</Badge>
                      <Badge variant="outline" className="text-xs">Inpatient</Badge>
                      <Badge variant="outline" className="text-xs">PHP</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">3 weeks ago</td>
                  <td className="px-4 py-3 text-right text-slate-400">Remove</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-900">Tucson, AZ</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">Inpatient</Badge>
                      <Badge variant="outline" className="text-xs">IOP</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">3 weeks ago</td>
                  <td className="px-4 py-3 text-right text-slate-400">Remove</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Placement history
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200">
                  <th className="px-4 py-2 font-medium text-slate-700">Name</th>
                  <th className="px-4 py-2 font-medium text-slate-700">Level of care</th>
                  <th className="px-4 py-2 font-medium text-slate-700">Status</th>
                  <th className="px-4 py-2 font-medium text-slate-700">Confirmed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-900">Maria S.</td>
                  <td className="px-4 py-3 text-slate-700">Detox</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-800 border-emerald-300">
                      Admitted
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">2 weeks ago</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-900">James K.</td>
                  <td className="px-4 py-3 text-slate-700">Inpatient</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs bg-sky-100 text-sky-800 border-sky-300">
                      Billed
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">3 weeks ago</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-900">Robert P.</td>
                  <td className="px-4 py-3 text-slate-700">PHP</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700 border-slate-300">
                      Completed
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">1 month ago</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
