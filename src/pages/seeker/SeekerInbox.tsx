import { useState, useEffect } from "react";
import { Inbox, MessageSquare, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

interface SubmittedForm {
  id: string;
  facility_name: string;
  created_at: string;
  status: string;
}

export default function SeekerInbox() {
  const [submittedForms, setSubmittedForms] = useState<SubmittedForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubmittedForms = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch leads submitted by this user's email
      const { data } = await supabase
        .from('leads')
        .select(`
          id,
          created_at,
          status,
          facilities!inner(name)
        `)
        .eq('email', session.user.email)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setSubmittedForms(data.map(lead => ({
          id: lead.id,
          facility_name: (lead.facilities as any)?.name || 'Unknown Facility',
          created_at: lead.created_at,
          status: lead.status
        })));
      }
      
      setIsLoading(false);
    };

    fetchSubmittedForms();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-display font-bold mb-6">Inbox</h1>

      <Tabs defaultValue="forms" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="forms" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Submitted Forms
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages">
          <Card>
            <CardContent className="p-8 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">No Messages Yet</h3>
              <p className="text-sm text-muted-foreground">
                When you message facilities, your conversations will appear here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-5 bg-muted rounded w-2/3 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : submittedForms.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">No Submitted Forms</h3>
                <p className="text-sm text-muted-foreground">
                  Forms you submit to treatment centers will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {submittedForms.map((form) => (
                <Card key={form.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-foreground">
                          {form.facility_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Submitted {formatDate(form.created_at)}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        form.status === 'new' 
                          ? 'bg-blue-100 text-blue-700'
                          : form.status === 'contacted'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
