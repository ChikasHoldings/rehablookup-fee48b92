import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Static sample of the Featured management panel — what a Pro provider
 * with an active Featured subscription sees. Rendered inside
 * `LockedFeaturePreview` on /provider/marketing/featured for Free
 * providers so they can preview the workflow before upgrading.
 *
 * Every value here is fabricated for illustration. The wrapping
 * `LockedFeaturePreview` makes the whole subtree inert (no click
 * targets resolve) and overlays a "Preview" badge, so a provider can
 * never mistake this for their real data.
 */
export function FeaturedManagementSample() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sponsored tagline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-600 mb-2">
            Shown on your Featured Strip cards. 120 character max.
          </p>
          <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
            24-hour admissions. Detox + IOP. Insurance verified in 30 minutes.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Active placements</CardTitle>
          <Badge variant="outline" className="text-xs">+ Add a placement</Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200">
                  <th className="px-4 py-2 font-medium text-slate-700">Type</th>
                  <th className="px-4 py-2 font-medium text-slate-700">Value</th>
                  <th className="px-4 py-2 font-medium text-slate-700">Activated</th>
                  <th className="px-4 py-2 font-medium text-slate-700 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="font-normal">City page</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">Los Angeles, CA</td>
                  <td className="px-4 py-3 text-slate-600">2 weeks ago</td>
                  <td className="px-4 py-3 text-right text-slate-400">Remove</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="font-normal">Treatment-type page</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">Inpatient detox</td>
                  <td className="px-4 py-3 text-slate-600">2 weeks ago</td>
                  <td className="px-4 py-3 text-right text-slate-400">Remove</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="font-normal">Insurance page</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">Blue Cross Blue Shield</td>
                  <td className="px-4 py-3 text-slate-600">5 days ago</td>
                  <td className="px-4 py-3 text-right text-slate-400">Remove</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="font-normal">State page</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">California</td>
                  <td className="px-4 py-3 text-slate-600">5 days ago</td>
                  <td className="px-4 py-3 text-right text-slate-400">Remove</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Waitlist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded border border-slate-200 p-3 text-sm">
            <div>
              <p className="font-medium text-slate-900">San Francisco, CA — city page</p>
              <p className="text-xs text-slate-500 mt-0.5">Position 3 — typical wait ~3 weeks</p>
            </div>
            <Badge variant="outline" className="text-xs">Waitlisted</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
