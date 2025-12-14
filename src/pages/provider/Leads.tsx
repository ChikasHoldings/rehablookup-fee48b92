import { ProviderLayout } from "@/components/provider/ProviderLayout";
import { Users, Mail, Phone, Calendar, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Placeholder data - will be replaced with actual leads table
const mockLeads: any[] = [];

export default function ProviderLeadsPage() {
  return (
    <ProviderLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground mt-1">
            Contact requests from families seeking treatment
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{mockLeads.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">0</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                New Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">0</p>
            </CardContent>
          </Card>
        </div>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {mockLeads.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                <h3 className="mt-4 text-lg font-medium text-foreground">No leads yet</h3>
                <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
                  When families submit contact requests for your facility, they'll appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact Method</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Message Preview</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {lead.contact_method === "email" ? (
                              <Mail className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Phone className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-sm">{lead.contact}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {lead.date}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 max-w-[300px]">
                            <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm text-muted-foreground truncate">
                              {lead.message}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProviderLayout>
  );
}
