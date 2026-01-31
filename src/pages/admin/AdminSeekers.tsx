import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import {
  Search,
  Users as UsersIcon,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface SeekerProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  phone_verified: boolean | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  created_at: string;
  updated_at: string;
  email?: string;
}

export default function AdminSeekers() {
  const { logError } = useAdminErrorHandler("AdminSeekers");
  const [searchQuery, setSearchQuery] = useState("");
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "unverified">("all");
  const [selectedSeeker, setSelectedSeeker] = useState<SeekerProfile | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Fetch seekers with their email from auth
  const { data: seekers, isLoading } = useQuery({
    queryKey: ["admin-seekers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seeker_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        logError(error.message, "Failed to fetch seekers");
        throw error;
      }

      return data as SeekerProfile[];
    },
  });

  // Fetch seeker activity counts
  const { data: activityStats } = useQuery({
    queryKey: ["admin-seeker-activity-stats"],
    queryFn: async () => {
      const [favorites, inquiries, reviews] = await Promise.all([
        supabase.from("user_favorites").select("user_id", { count: "exact", head: true }),
        supabase.from("concierge_inquiries").select("user_id", { count: "exact", head: true }).not("user_id", "is", null),
        supabase.from("facility_reviews").select("user_id", { count: "exact", head: true }),
      ]);

      return {
        favorites: favorites.count || 0,
        inquiries: inquiries.count || 0,
        reviews: reviews.count || 0,
      };
    },
  });

  // Fetch selected seeker's activity
  const { data: seekerActivity } = useQuery({
    queryKey: ["admin-seeker-activity", selectedSeeker?.user_id],
    queryFn: async () => {
      if (!selectedSeeker?.user_id) return null;

      const [favorites, inquiries, reviews] = await Promise.all([
        supabase
          .from("user_favorites")
          .select("id, facility_id, created_at, facilities(name, city, state)")
          .eq("user_id", selectedSeeker.user_id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("concierge_inquiries")
          .select("id, status, created_at, primary_concern, level_of_care")
          .eq("user_id", selectedSeeker.user_id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("facility_reviews")
          .select("id, rating, review_text, status, created_at, facilities(name)")
          .eq("user_id", selectedSeeker.user_id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      return {
        favorites: favorites.data || [],
        inquiries: inquiries.data || [],
        reviews: reviews.data || [],
      };
    },
    enabled: !!selectedSeeker?.user_id,
  });

  const safeSeekers = seekers || [];

  // Stats
  const totalCount = safeSeekers.length;
  const verifiedCount = safeSeekers.filter(s => s.phone_verified).length;
  const thisMonthCount = safeSeekers.filter(s => {
    const created = new Date(s.created_at);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  // Filtered seekers
  const filteredSeekers = safeSeekers.filter(seeker => {
    const matchesSearch = !searchQuery ||
      seeker.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seeker.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seeker.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seeker.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seeker.state?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesVerification = verificationFilter === "all" ||
      (verificationFilter === "verified" && seeker.phone_verified) ||
      (verificationFilter === "unverified" && !seeker.phone_verified);

    return matchesSearch && matchesVerification;
  });

  const getDisplayName = (seeker: SeekerProfile) => {
    if (seeker.display_name) return seeker.display_name;
    if (seeker.first_name && seeker.last_name) return `${seeker.first_name} ${seeker.last_name}`;
    if (seeker.first_name) return seeker.first_name;
    return "Anonymous User";
  };

  const getInitials = (seeker: SeekerProfile) => {
    if (seeker.first_name && seeker.last_name) {
      return `${seeker.first_name[0]}${seeker.last_name[0]}`.toUpperCase();
    }
    if (seeker.first_name) return seeker.first_name.slice(0, 2).toUpperCase();
    return "U";
  };

  const getLocation = (seeker: SeekerProfile) => {
    if (seeker.city && seeker.state) return `${seeker.city}, ${seeker.state}`;
    if (seeker.state) return seeker.state;
    if (seeker.zipcode) return seeker.zipcode;
    return null;
  };

  const openDetail = (seeker: SeekerProfile) => {
    setSelectedSeeker(seeker);
    setDetailDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="text-muted-foreground">View and manage end-user accounts</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="relative overflow-hidden border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Seekers</p>
                <p className="text-3xl font-bold">{isLoading ? <Skeleton className="h-9 w-12" /> : totalCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <UsersIcon className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone Verified</p>
                <p className="text-3xl font-bold">{isLoading ? <Skeleton className="h-9 w-12" /> : verifiedCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">New This Month</p>
                <p className="text-3xl font-bold">{isLoading ? <Skeleton className="h-9 w-12" /> : thisMonthCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Inquiries</p>
                <p className="text-3xl font-bold">{activityStats ? activityStats.inquiries : <Skeleton className="h-9 w-12" />}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, city, or state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={verificationFilter} onValueChange={(v) => setVerificationFilter(v as typeof verificationFilter)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="verified">Phone Verified</SelectItem>
                <SelectItem value="unverified">Not Verified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Seekers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredSeekers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No seekers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSeekers.map((seeker) => (
                  <TableRow key={seeker.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={seeker.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getInitials(seeker)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{getDisplayName(seeker)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getLocation(seeker) ? (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {getLocation(seeker)}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {seeker.phone ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          {seeker.phone}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        seeker.phone_verified 
                          ? "bg-green-50 text-green-700 border-green-200" 
                          : "bg-slate-50 text-slate-500 border-slate-200"
                      )}>
                        {seeker.phone_verified ? (
                          <><CheckCircle className="h-3 w-3 mr-1" /> Verified</>
                        ) : (
                          <><XCircle className="h-3 w-3 mr-1" /> No</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(seeker.created_at), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDetail(seeker)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Seeker Details</DialogTitle>
          </DialogHeader>
          
          {selectedSeeker && (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedSeeker.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {getInitials(selectedSeeker)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{getDisplayName(selectedSeeker)}</h3>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                    {getLocation(selectedSeeker) && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {getLocation(selectedSeeker)}
                      </div>
                    )}
                    {selectedSeeker.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {selectedSeeker.phone}
                        {selectedSeeker.phone_verified && (
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 ml-1" />
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Joined {format(new Date(selectedSeeker.created_at), "MMMM d, yyyy")}
                  </p>
                </div>
              </div>

              {/* Activity Tabs */}
              <Tabs defaultValue="saved" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="saved" className="gap-1.5">
                    <Heart className="h-4 w-4" />
                    Saved ({seekerActivity?.favorites.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="inquiries" className="gap-1.5">
                    <MessageSquare className="h-4 w-4" />
                    Inquiries ({seekerActivity?.inquiries.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="reviews" className="gap-1.5">
                    <MessageSquare className="h-4 w-4" />
                    Reviews ({seekerActivity?.reviews.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="saved" className="mt-4">
                  {seekerActivity?.favorites.length === 0 ? (
                    <p className="text-center py-6 text-muted-foreground">No saved facilities</p>
                  ) : (
                    <div className="space-y-2">
                      {seekerActivity?.favorites.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div>
                            <p className="font-medium">{item.facilities?.name || "Unknown Facility"}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.facilities?.city}, {item.facilities?.state}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="inquiries" className="mt-4">
                  {seekerActivity?.inquiries.length === 0 ? (
                    <p className="text-center py-6 text-muted-foreground">No inquiries</p>
                  ) : (
                    <div className="space-y-2">
                      {seekerActivity?.inquiries.map((inquiry: any) => (
                        <div key={inquiry.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{inquiry.status}</Badge>
                              {inquiry.level_of_care && (
                                <span className="text-sm text-muted-foreground">{inquiry.level_of_care}</span>
                              )}
                            </div>
                            {inquiry.primary_concern && (
                              <p className="text-sm text-muted-foreground mt-1">{inquiry.primary_concern}</p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(inquiry.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="reviews" className="mt-4">
                  {seekerActivity?.reviews.length === 0 ? (
                    <p className="text-center py-6 text-muted-foreground">No reviews</p>
                  ) : (
                    <div className="space-y-2">
                      {seekerActivity?.reviews.map((review: any) => (
                        <div key={review.id} className="p-3 rounded-lg border">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{review.facilities?.name || "Unknown Facility"}</p>
                            <Badge variant="outline">{review.status}</Badge>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} className={cn(
                                "text-sm",
                                i < review.rating ? "text-amber-400" : "text-slate-200"
                              )}>★</span>
                            ))}
                          </div>
                          {review.review_text && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{review.review_text}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
