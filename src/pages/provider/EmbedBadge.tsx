import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { EmbedBadgeWidget } from "@/components/provider/EmbedBadgeWidget";
import { AlertCircle, Award, Trophy, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function EmbedBadgePage() {
  const { selectedFacility } = useSelectedFacility();

  if (!selectedFacility) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4 lg:p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No Facility Selected</h2>
          <p className="text-muted-foreground">
            Please select a facility to view and manage your badge collection.
          </p>
        </motion.div>
      </div>
    );
  }

  if (selectedFacility.status !== "approved") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4 lg:p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Facility Pending Approval</h2>
          <p className="text-muted-foreground">
            Embed badges become available once your facility listing is approved. We'll notify you when it's ready.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Hero Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 lg:p-8"
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Trophy className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Badge Collection</h1>
              <p className="text-muted-foreground mt-1 max-w-lg">
                Earn achievement badges by improving your facility performance. Embed them on your website to build trust and boost SEO.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 lg:gap-8">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Backlink Included</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">SEO Boost</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Badge Widget */}
      <EmbedBadgeWidget
        facilityId={selectedFacility.id}
        facilitySlug={selectedFacility.slug || selectedFacility.id}
        facilityName={selectedFacility.name}
      />
    </div>
  );
}
