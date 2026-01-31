import { forwardRef } from "react";
import { MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface CityData {
  city: string;
  count: number;
  percentage: number;
}

interface TopCitiesCardProps {
  topCities?: CityData[];
}

const TopCitiesCard = forwardRef<HTMLDivElement, TopCitiesCardProps>(
  function TopCitiesCard({ topCities }, ref) {
    return (
      <Card ref={ref} className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Top Cities by Leads</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {topCities && topCities.length > 0 ? (
            <div className="space-y-3">
              {topCities.map((item, index) => (
                <div key={item.city} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground w-4">{index + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium truncate">{item.city}</span>
                      <span className="text-xs text-muted-foreground">{item.count}</span>
                    </div>
                    <Progress value={item.percentage} className="h-1.5" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No location data available</p>
          )}
        </CardContent>
      </Card>
    );
  }
);

TopCitiesCard.displayName = "TopCitiesCard";

export { TopCitiesCard };
