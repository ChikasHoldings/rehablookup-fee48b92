import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle } from "lucide-react";

export function PlacementSupportCard() {
  return (
    <Card className="bg-muted/30 border-dashed">
      <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Need Help?</p>
            <p className="text-xs text-muted-foreground">Our specialists are here to assist you.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <a href="mailto:placement@rehablookup.com">
            <Mail className="h-4 w-4" />
            Email Support
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
