import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  Search,
  Users,
  MessageSquare,
  FileText,
  Phone,
  Mail,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  new: { label: "Submitted", color: "bg-blue-100 text-blue-700", icon: Clock },
  reviewing: { label: "Reviewing", color: "bg-yellow-100 text-yellow-700", icon: Search },
  matching: { label: "Finding Matches", color: "bg-purple-100 text-purple-700", icon: Users },
  introductions_sent: { label: "Introductions Sent", color: "bg-indigo-100 text-indigo-700", icon: MessageSquare },
  in_contact: { label: "In Contact", color: "bg-teal-100 text-teal-700", icon: Phone },
  admitted: { label: "Admitted", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-700", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: Clock },
};

const TIMELINE_STEPS = ["new", "reviewing", "matching", "introductions_sent", "in_contact", "admitted"];

export default function SeekerPlacement() {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const { data: cases, isLoading: casesLoading, refetch } = useQuery({
    queryKey: ["seeker-placement-cases"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return [];

      const email = session.session.user.email;
      const userId = session.session.user.id;

      const { data, error } = await supabase
        .from("placement_cases")
        .select("*")
        .or(`seeker_user_id.eq.${userId},seeker_email.eq.${email}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const selectedCase = cases?.find((c) => c.id === selectedCaseId) || cases?.[0];

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["placement-case-messages", selectedCase?.id],
    queryFn: async () => {
      if (!selectedCase?.id) return [];
      const { data, error } = await supabase
        .from("placement_case_messages")
        .select("*")
        .eq("case_id", selectedCase.id)
        .eq("is_internal", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCase?.id,
  });

  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ["placement-case-documents", selectedCase?.id],
    queryFn: async () => {
      if (!selectedCase?.id) return [];
      const { data, error } = await supabase
        .from("placement_case_documents")
        .select("*")
        .eq("case_id", selectedCase.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCase?.id,
  });

  if (casesLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!cases || cases.length === 0) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto text-center py-12">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No Placement Cases</h2>
          <p className="text-muted-foreground mb-6">
            You haven't submitted a placement request yet. Our specialists can help you find the right treatment center.
          </p>
          <Button asChild>
            <Link to="/placement-help">
              Get Placement Help
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const currentStatusIndex = TIMELINE_STEPS.indexOf(selectedCase?.status || "new");
  const statusConfig = STATUS_CONFIG[selectedCase?.status || "new"];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Placement Help</h1>
          <p className="text-muted-foreground">Track your placement case status</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Case Selector (if multiple) */}
      {cases.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {cases.map((c) => (
            <Button
              key={c.id}
              variant={c.id === selectedCase?.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCaseId(c.id)}
            >
              Case #{c.id.slice(0, 8).toUpperCase()}
            </Button>
          ))}
        </div>
      )}

      {/* Case Overview Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                Case #{selectedCase?.id.slice(0, 8).toUpperCase()}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Submitted {selectedCase?.created_at && format(new Date(selectedCase.created_at), "MMM d, yyyy")}
              </p>
            </div>
            <Badge className={statusConfig.color}>
              <statusConfig.icon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Visual Timeline */}
          <div className="relative mb-6">
            <div className="flex justify-between items-center">
              {TIMELINE_STEPS.slice(0, -1).map((step, index) => {
                const isCompleted = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                const stepConfig = STATUS_CONFIG[step];

                return (
                  <div key={step} className="flex flex-col items-center flex-1">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium z-10 ${
                        isCompleted
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      } ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}
                    >
                      {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </div>
                    <span
                      className={`text-xs mt-2 text-center ${
                        isCompleted ? "text-foreground font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {stepConfig.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Connecting Line */}
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted -z-0">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${(currentStatusIndex / (TIMELINE_STEPS.length - 2)) * 100}%` }}
              />
            </div>
          </div>

          {/* Case Summary */}
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground">Care Type:</span>
              <p className="font-medium capitalize">{selectedCase?.level_of_care?.replace(/_/g, " ") || "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Payment:</span>
              <p className="font-medium capitalize">{selectedCase?.payment_type?.replace(/_/g, " ") || "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Urgency:</span>
              <p className="font-medium capitalize">{selectedCase?.urgency?.replace(/_/g, " ") || "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Location Preference:</span>
              <p className="font-medium">
                {selectedCase?.preferred_states?.join(", ") || "Flexible"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Updates & Documents */}
      <Tabs defaultValue="updates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="updates" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Updates
            {messages && messages.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {messages.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents
            {documents && documents.filter((d) => d.status === "requested").length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {documents.filter((d) => d.status === "requested").length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="updates" className="space-y-4">
          {messagesLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : messages && messages.length > 0 ? (
            <div className="space-y-3">
              {messages.map((msg) => (
                <Card key={msg.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{msg.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(msg.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No updates yet. We'll notify you when there's progress.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          {documentsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : documents && documents.length > 0 ? (
            <div className="space-y-3">
              {documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm capitalize">
                          {doc.document_type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {doc.status === "uploaded"
                            ? `Uploaded ${format(new Date(doc.uploaded_at!), "MMM d")}`
                            : doc.status === "verified"
                            ? "Verified"
                            : "Requested"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        doc.status === "verified"
                          ? "default"
                          : doc.status === "uploaded"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {doc.status === "verified" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {doc.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No documents requested yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Contact Card */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground mb-3">Need to reach your specialist?</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" asChild>
              <a href="tel:1-800-XXX-XXXX">
                <Phone className="h-4 w-4 mr-2" />
                Call Us
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="mailto:placement@rehablookup.com">
                <Mail className="h-4 w-4 mr-2" />
                Email Us
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
