import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSeekerAuth } from '@/hooks/useSeekerAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { SEO } from '@/components/SEO';
import { Layout } from '@/components/layout/Layout';
import { Heart, Settings, LogOut, MapPin, Phone, ExternalLink, Trash2, User } from 'lucide-react';

interface FavoriteFacility {
  id: string;
  name: string;
  city: string;
  state: string;
  phone: string;
  slug: string | null;
  facility_type: string;
}

export default function MyAccount() {
  const navigate = useNavigate();
  const { user, profile, isLoading, isAuthenticated, signOut, updateProfile } = useSeekerAuth();
  const { favorites, toggleFavorite } = useFavorites();
  
  const [favoriteFacilities, setFavoriteFacilities] = useState<FavoriteFacility[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [profile]);

  useEffect(() => {
    const fetchFavoriteFacilities = async () => {
      if (favorites.length === 0) {
        setFavoriteFacilities([]);
        setLoadingFavorites(false);
        return;
      }

      const { data, error } = await supabase
        .from('facilities')
        .select('id, name, city, state, phone, slug, facility_type')
        .in('id', favorites)
        .eq('status', 'approved');

      if (!error && data) {
        setFavoriteFacilities(data);
      }
      setLoadingFavorites(false);
    };

    fetchFavoriteFacilities();
  }, [favorites]);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const { error } = await updateProfile({ display_name: displayName });
    setIsSaving(false);
    
    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated');
    }
  };

  const handleRemoveFavorite = (facilityId: string, facilityName: string) => {
    toggleFavorite(facilityId);
    toast.success(`Removed ${facilityName} from favorites`);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const userInitial = profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <Layout>
      <SEO 
        title="My Account | Find Treatment Centers"
        description="Manage your account and saved treatment centers."
      />
      
      <div className="container max-w-4xl py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{profile?.display_name || 'My Account'}</h1>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <Tabs defaultValue="favorites" className="space-y-6">
          <TabsList>
            <TabsTrigger value="favorites" className="gap-2">
              <Heart className="h-4 w-4" />
              Saved Facilities ({favorites.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="favorites">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  Saved Facilities
                </CardTitle>
                <CardDescription>
                  Treatment centers you've saved for later review
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingFavorites ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : favoriteFacilities.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-medium text-lg mb-2">No saved facilities yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Browse treatment centers and click the heart icon to save them here
                    </p>
                    <Button asChild>
                      <Link to="/search">Find Treatment Centers</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {favoriteFacilities.map((facility) => (
                      <div 
                        key={facility.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <Link 
                            to={`/account/facility/${facility.slug || facility.id}`}
                            className="font-medium hover:text-primary transition-colors line-clamp-1"
                          >
                            {facility.name}
                          </Link>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {facility.city}, {facility.state}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {facility.phone}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            asChild
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Link to={`/account/facility/${facility.slug || facility.id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleRemoveFavorite(facility.id, facility.name)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Profile Settings
                </CardTitle>
                <CardDescription>
                  Update your account information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    value={user?.email || ''} 
                    disabled 
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input 
                    id="displayName" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
                
                <Button 
                  onClick={handleSaveProfile} 
                  disabled={isSaving || displayName === profile?.display_name}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
