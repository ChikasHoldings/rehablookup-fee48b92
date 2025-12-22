import { Card, CardContent } from '@/components/ui/card';
import { Star, MessageSquare, Clock, Flag } from 'lucide-react';
import { ReviewStats } from '@/hooks/useProviderReviews';

interface ReviewStatsCardsProps {
  stats: ReviewStats;
}

export function ReviewStatsCards({ stats }: ReviewStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Card className="border-amber-200/50 dark:border-amber-800/30 bg-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-foreground truncate">
                {stats.averageRating ?? '—'}
              </p>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200/50 dark:border-blue-800/30 bg-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-foreground truncate">
                {stats.totalReviews}
              </p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-orange-200/50 dark:border-orange-800/30 bg-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-foreground truncate">
                {stats.needsResponse}
              </p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200/50 dark:border-red-800/30 bg-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <Flag className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-foreground truncate">
                {stats.disputed}
              </p>
              <p className="text-xs text-muted-foreground">Disputed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
