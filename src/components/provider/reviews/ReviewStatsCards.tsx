import { Card, CardContent } from '@/components/ui/card';
import { Star, MessageSquare, Clock, Flag, TrendingUp } from 'lucide-react';
import { ReviewStats } from '@/hooks/useProviderReviews';

interface ReviewStatsCardsProps {
  stats: ReviewStats;
}

export function ReviewStatsCards({ stats }: ReviewStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200/50 dark:border-amber-800/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 dark:bg-amber-500/10">
              <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {stats.averageRating || '—'}
                </p>
                {stats.averageRating && (
                  <span className="text-sm text-amber-600/70 dark:text-amber-400/70">/5</span>
                )}
              </div>
              <p className="text-sm text-amber-600/80 dark:text-amber-400/80">Average Rating</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50 dark:border-blue-800/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 dark:bg-blue-500/10">
              <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {stats.totalReviews}
              </p>
              <p className="text-sm text-blue-600/80 dark:text-blue-400/80">Total Reviews</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200/50 dark:border-orange-800/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/20 dark:bg-orange-500/10">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {stats.needsResponse}
              </p>
              <p className="text-sm text-orange-600/80 dark:text-orange-400/80">Needs Response</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border-red-200/50 dark:border-red-800/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/20 dark:bg-red-500/10">
              <Flag className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                {stats.disputed}
              </p>
              <p className="text-sm text-red-600/80 dark:text-red-400/80">Under Dispute</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
