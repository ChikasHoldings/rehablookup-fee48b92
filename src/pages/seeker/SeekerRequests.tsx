import { useState, useEffect } from "react";
import facilityPlaceholder from "@/assets/facility-placeholder.jpg";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { 
  Send, 
  Clock, 
  Building2, 
  MapPin, 
  Plus,
  FileText,
  ExternalLink
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AuthPrompt } from "@/components/seeker/AuthPrompt";
import { SeekerRequestForm } from "@/components/seeker/SeekerRequestForm";

interface SeekerOutletContext {
  isAuthenticated: boolean;
  userName?: string;
}

interface SubmittedRequest {
  id: string;
  facility_id: string;
  facility_name: string;
  facility_slug: string | null;
  facility_city: string;
  facility_state: string;
  facility_logo_url: string | null;
  created_at: string;
  status: string;
  urgency: string | null;
  preferred_contact: string;
}

interface SavedRequestData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  locationZip: string;
  locationCityState: string;
  whoSeekingHelp: "self" | "loved-one";
  urgency: "immediate" | "within-week" | "flexible";
  preferredContact: "call" | "text" | "email";
  levelOfCare?: string;
  insuranceType?: string;
  primarySubstance?: string[];
}

function RequestCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
      <div className="p-4 flex gap-4">
        <div className="h-12 w-12 rounded-lg bg-muted shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-3/4 bg-muted rounded" />
          <div className="h-4 w-1/2 bg-muted rounded" />
          <div className="h-4 w-1/3 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function RequestCard({ 
  request, 
  getStatusBadge, 
  formatDate, 
  getUrgencyLabel 
}: { 
  request: SubmittedRequest;
  getStatusBadge: (status: string) => React.ReactNode;
  formatDate: (date: string) => string;
  getUrgencyLabel: (urgency: string | null) => string | null;
}) {
  const [logoError, setLogoError] = useState(false);
  const initials = getInitials(request.facility_name);
  const hasLogo = request.facility_logo_url && !logoError;

  return (
    <article className="group rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-all">
      <div className="p-4 flex gap-4">
        <div className="h-14 w-14 rounded-lg overflow-hidden bg-muted shrink-0">
          {hasLogo ? (
            <img 
              src={request.facility_logo_url!}
              alt={request.facility_name}
              className="h-full w-full object-contain p-1 bg-white"
              onError={() => setLogoError(true)}
            />
          ) : (
            <img 
              src={facilityPlaceholder}
              alt={request.facility_name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              {request.facility_slug ? (
                <Link to={`/center/${request.facility_slug}`} className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1">
                  {request.facility_name}
                </Link>
              ) : (
                <span className="font-semibold text-foreground line-clamp-1">{request.facility_name}</span>
              )}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>{request.facility_city}, {request.facility_state}</span>
              </div>
            </div>
            {getStatusBadge(request.status)}
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(request.created_at)}
            </span>
            {request.urgency && (
              <Badge variant="outline" className="text-[10px] py-0">{getUrgencyLabel(request.urgency)}</Badge>
            )}
            <span className="capitalize">{request.preferred_contact}</span>
          </div>
        </div>
        {request.facility_slug && (
          <Button variant="ghost" size="icon" asChild className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Link to={`/center/${request.facility_slug}`}><ExternalLink className="h-4 w-4" /></Link>
          </Button>
        )}
      </div>
    </article>
  );
}

export default function SeekerRequests() {
  const context = useOutletContext<SeekerOutletContext>();
  const isAuthenticated = context?.isAuthenticated ?? false;
  const [searchParams] = useSearchParams();
  
  const [requests, setRequests] = useState<SubmittedRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<{
    id: string;
    name: string;
    city?: string;
    state?: string;
  } | null>(null);
  const [savedData, setSavedData] = useState<SavedRequestData | null>(null);
  const { toast } = useToast();

  // Check if coming from a facility page with prefill
  useEffect(() => {
    const facilityId = searchParams.get('facilityId');
    const facilityName = searchParams.get('facilityName');
    
    if (facilityId && facilityName) {
      setSelectedFacility({
        id: facilityId,
        name: decodeURIComponent(facilityName),
        city: searchParams.get('facilityCity') || undefined,
        state: searchParams.get('facilityState') || undefined,
      });
      setShowNewRequest(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRequests();
      loadSavedData();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const fetchRequests = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      setIsLoading(false);
      return;
    }

    try {
      // First get leads for this user's email
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('id, facility_id, created_at, status, urgency, preferred_contact')
        .eq('email', session.user.email)
        .order('created_at', { ascending: false })
        .limit(200);

      if (leadsError) {
        throw leadsError;
      }

      if (!leadsData || leadsData.length === 0) {
        setRequests([]);
        setIsLoading(false);
        return;
      }

      // Get facility details for leads that have facility_id
      const facilityIds = leadsData
        .filter(l => l.facility_id)
        .map(l => l.facility_id as string);
      
      let facilitiesMap: Record<string, any> = {};
      
      if (facilityIds.length > 0) {
        const { data: facilitiesData } = await supabase
          .from('facilities')
          .select('id, name, slug, city, state, logo_url')
          .in('id', facilityIds);
        
        if (facilitiesData) {
          facilitiesMap = facilitiesData.reduce((acc, f) => {
            acc[f.id] = f;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Map leads with facility data
      const mappedRequests: SubmittedRequest[] = leadsData.map(req => {
        const facility = req.facility_id ? facilitiesMap[req.facility_id] : null;
        return {
          id: req.id,
          facility_id: req.facility_id || '',
          facility_name: facility?.name || 'General Inquiry',
          facility_slug: facility?.slug || null,
          facility_city: facility?.city || '',
          facility_state: facility?.state || '',
          facility_logo_url: facility?.logo_url || null,
          created_at: req.created_at,
          status: req.status,
          urgency: req.urgency,
          preferred_contact: req.preferred_contact
        };
      });

      setRequests(mappedRequests);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error loading requests",
        description: "Could not load your requests. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Check localStorage for saved form data
    const saved = localStorage.getItem(`seeker_request_data_${session.user.id}`);
    if (saved) {
      try {
        setSavedData(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved data', e);
      }
    }
  };

  const handleNewRequest = (facility?: { id: string; name: string; city?: string; state?: string }) => {
    setSelectedFacility(facility || null);
    setShowNewRequest(true);
  };

  const handleRequestSuccess = async () => {
    // Save the form data for future prefill
    const { data: { session } } = await supabase.auth.getSession();
    if (session && savedData) {
      localStorage.setItem(`seeker_request_data_${session.user.id}`, JSON.stringify(savedData));
    }
    
    setShowNewRequest(false);
    setSelectedFacility(null);
    fetchRequests();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]">Pending Review</Badge>;
      case 'contacted':
        return <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">Facility Responded</Badge>;
      case 'in_progress':
        return <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">In Progress</Badge>;
      case 'scheduled':
        return <Badge className="bg-purple-100 text-purple-700 border-0 text-[10px]">Scheduled</Badge>;
      case 'admitted':
        return <Badge className="bg-green-100 text-green-700 border-0 text-[10px]">Admitted</Badge>;
      case 'closed':
        return <Badge className="bg-gray-100 text-gray-700 border-0 text-[10px]">Closed</Badge>;
      case 'expired':
        return <Badge className="bg-gray-100 text-gray-500 border-0 text-[10px]">Expired</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">Submitted</Badge>;
    }
  };

  const getUrgencyLabel = (urgency: string | null) => {
    switch (urgency) {
      case 'immediate': return 'Urgent';
      case 'within-week': return 'Within a week';
      case 'flexible': return 'Flexible';
      default: return null;
    }
  };

  // Show auth prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <AuthPrompt 
        title="Sign in to manage your requests"
        description="Create a free account to send and track requests to treatment centers."
        icon="send"
        returnTo="/account/requests"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100">
            <Send className="h-5 w-5 text-blue-600" />
          </div>
          <h1 className="text-2xl font-display font-bold">My Requests</h1>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <RequestCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
    <Helmet>
      <title>My Requests | RehabLookup</title>
      <meta name="description" content="Track and manage your treatment center inquiries. View request status, facility responses, and send new requests." />
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100">
            <Send className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-display font-bold">My Requests</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Track inquiries</p>
          </div>
        </div>
        {requests.length > 0 && (
          <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0">
            {requests.length}
          </Badge>
        )}
      </div>

      {requests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="p-3 rounded-full bg-muted w-fit mx-auto mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No Requests Yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              Browse treatment centers and send a request to get started. Your form information will be saved for quick submissions to other facilities.
            </p>
            <Button asChild>
              <Link to="/account" className="gap-2">
                <Building2 className="h-4 w-4" />
                Browse Treatment Centers
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Quick action to send to another facility */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">Need to contact another facility?</p>
                <p className="text-sm text-muted-foreground">Your information will be prefilled from your last request.</p>
              </div>
              <Button asChild size="sm" className="shrink-0">
                <Link to="/account/search" className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Request
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Request list */}
          {requests.map((request) => (
            <RequestCard key={request.id} request={request} getStatusBadge={getStatusBadge} formatDate={formatDate} getUrgencyLabel={getUrgencyLabel} />
          ))}
        </div>
      )}

      {/* New Request Dialog */}
      <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="sr-only">Send Request</DialogTitle>
          </DialogHeader>
          {selectedFacility ? (
            <SeekerRequestForm
              facilityId={selectedFacility.id}
              facilityName={selectedFacility.name}
              facilityCity={selectedFacility.city}
              facilityState={selectedFacility.state}
              prefillData={savedData || undefined}
              onSuccess={handleRequestSuccess}
              onCancel={() => {
                setShowNewRequest(false);
                setSelectedFacility(null);
              }}
            />
          ) : (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Select a facility to send a request</p>
              <Button asChild>
                <Link to="/account/search">Browse Facilities</Link>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}