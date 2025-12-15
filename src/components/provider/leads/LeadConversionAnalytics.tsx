import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Target, 
  Sparkles, 
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";
import { calculateLeadScore, getScoreColor } from "@/lib/leadScoring";

interface Lead {
  id: string;
  status: string;
  source: string | null;
  insurance_type: string | null;
  urgency: string | null;
  email_verified: boolean | null;
  level_of_care: string | null;
  dual_diagnosis: string | null;
  primary_substance: string[] | null;
  who_seeking_help: string | null;
  preferred_contact: string;
  message: string | null;
}

interface LeadConversionAnalyticsProps {
  leads: Lead[];
}

interface ConversionMetric {
  label: string;
  total: number;
  converted: number;
  rate: number;
  icon?: React.ReactNode;
}

export function LeadConversionAnalytics({ leads }: LeadConversionAnalyticsProps) {
  const analytics = useMemo(() => {
    // Count conversions
    const convertedLeads = leads.filter(l => l.status === 'converted');
    const lostLeads = leads.filter(l => l.status === 'lost');
    const closedLeads = leads.filter(l => ['converted', 'lost', 'closed'].includes(l.status));
    
    // Overall conversion rate (converted / closed decisions)
    const overallRate = closedLeads.length > 0 
      ? (convertedLeads.length / closedLeads.length) * 100 
      : 0;

    // By source
    const qualifiedLeads = leads.filter(l => l.source === 'Request Help Page');
    const directLeads = leads.filter(l => l.source !== 'Request Help Page');
    
    const qualifiedConverted = qualifiedLeads.filter(l => l.status === 'converted').length;
    const qualifiedClosed = qualifiedLeads.filter(l => ['converted', 'lost', 'closed'].includes(l.status)).length;
    
    const directConverted = directLeads.filter(l => l.status === 'converted').length;
    const directClosed = directLeads.filter(l => ['converted', 'lost', 'closed'].includes(l.status)).length;

    const bySource: ConversionMetric[] = [
      {
        label: 'Qualified Intake',
        total: qualifiedLeads.length,
        converted: qualifiedConverted,
        rate: qualifiedClosed > 0 ? (qualifiedConverted / qualifiedClosed) * 100 : 0,
        icon: <Sparkles className="h-4 w-4 text-primary" />,
      },
      {
        label: 'Direct Contact',
        total: directLeads.length,
        converted: directConverted,
        rate: directClosed > 0 ? (directConverted / directClosed) * 100 : 0,
        icon: <FileText className="h-4 w-4 text-muted-foreground" />,
      },
    ];

    // By score grade
    const scoreGrades: Record<string, { total: number; converted: number; closed: number }> = {
      A: { total: 0, converted: 0, closed: 0 },
      B: { total: 0, converted: 0, closed: 0 },
      C: { total: 0, converted: 0, closed: 0 },
      D: { total: 0, converted: 0, closed: 0 },
    };

    leads.forEach(lead => {
      const score = calculateLeadScore(lead);
      scoreGrades[score.grade].total++;
      if (lead.status === 'converted') {
        scoreGrades[score.grade].converted++;
      }
      if (['converted', 'lost', 'closed'].includes(lead.status)) {
        scoreGrades[score.grade].closed++;
      }
    });

    const byScore: ConversionMetric[] = Object.entries(scoreGrades).map(([grade, data]) => ({
      label: `Grade ${grade}`,
      total: data.total,
      converted: data.converted,
      rate: data.closed > 0 ? (data.converted / data.closed) * 100 : 0,
    }));

    // By insurance type
    const insuranceTypes: Record<string, { total: number; converted: number; closed: number }> = {};
    leads.forEach(lead => {
      const type = lead.insurance_type || 'Unknown';
      if (!insuranceTypes[type]) {
        insuranceTypes[type] = { total: 0, converted: 0, closed: 0 };
      }
      insuranceTypes[type].total++;
      if (lead.status === 'converted') {
        insuranceTypes[type].converted++;
      }
      if (['converted', 'lost', 'closed'].includes(lead.status)) {
        insuranceTypes[type].closed++;
      }
    });

    const byInsurance: ConversionMetric[] = Object.entries(insuranceTypes)
      .map(([type, data]) => ({
        label: formatInsuranceLabel(type),
        total: data.total,
        converted: data.converted,
        rate: data.closed > 0 ? (data.converted / data.closed) * 100 : 0,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);

    // By urgency
    const urgencyLevels: Record<string, { total: number; converted: number; closed: number }> = {};
    leads.forEach(lead => {
      const urgency = lead.urgency || 'Unknown';
      if (!urgencyLevels[urgency]) {
        urgencyLevels[urgency] = { total: 0, converted: 0, closed: 0 };
      }
      urgencyLevels[urgency].total++;
      if (lead.status === 'converted') {
        urgencyLevels[urgency].converted++;
      }
      if (['converted', 'lost', 'closed'].includes(lead.status)) {
        urgencyLevels[urgency].closed++;
      }
    });

    const byUrgency: ConversionMetric[] = Object.entries(urgencyLevels)
      .map(([urgency, data]) => ({
        label: formatUrgencyLabel(urgency),
        total: data.total,
        converted: data.converted,
        rate: data.closed > 0 ? (data.converted / data.closed) * 100 : 0,
      }))
      .sort((a, b) => b.rate - a.rate);

    return {
      totalLeads: leads.length,
      convertedCount: convertedLeads.length,
      lostCount: lostLeads.length,
      overallRate,
      bySource,
      byScore,
      byInsurance,
      byUrgency,
    };
  }, [leads]);

  if (leads.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No leads to analyze yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">
                {analytics.overallRate.toFixed(1)}%
              </span>
              {analytics.overallRate >= 25 ? (
                <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700">
                  <ArrowUpRight className="h-3 w-3" />
                  Good
                </Badge>
              ) : analytics.overallRate >= 10 ? (
                <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700">
                  <Minus className="h-3 w-3" />
                  Average
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 bg-red-100 text-red-700">
                  <ArrowDownRight className="h-3 w-3" />
                  Low
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.convertedCount} converted of {analytics.convertedCount + analytics.lostCount} decided
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Converted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-green-600">{analytics.convertedCount}</span>
              <span className="text-sm text-muted-foreground">leads</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-red-600">{analytics.lostCount}</span>
              <span className="text-sm text-muted-foreground">leads</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By Source */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Conversion by Source
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.bySource.map((metric) => (
              <div key={metric.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {metric.icon}
                    <span className="text-sm font-medium">{metric.label}</span>
                    <span className="text-xs text-muted-foreground">({metric.total} leads)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{metric.rate.toFixed(1)}%</span>
                    <span className="text-xs text-muted-foreground">
                      ({metric.converted} converted)
                    </span>
                  </div>
                </div>
                <Progress value={metric.rate} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* By Score Grade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Conversion by Lead Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            {analytics.byScore.map((metric) => {
              const grade = metric.label.replace('Grade ', '') as 'A' | 'B' | 'C' | 'D';
              const colors = getScoreColor(grade);
              return (
                <div 
                  key={metric.label} 
                  className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-lg font-bold ${colors.text}`}>{grade}</span>
                    <span className="text-xs text-muted-foreground">{metric.total} leads</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold">{metric.rate.toFixed(0)}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {metric.converted} converted
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* By Insurance & Urgency */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">By Insurance Type</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.byInsurance.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
            ) : (
              <div className="space-y-3">
                {analytics.byInsurance.map((metric, idx) => (
                  <div key={metric.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                      <span className="text-sm">{metric.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={metric.rate} className="w-16 h-1.5" />
                      <span className="text-sm font-medium w-12 text-right">{metric.rate.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">By Urgency Level</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.byUrgency.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
            ) : (
              <div className="space-y-3">
                {analytics.byUrgency.map((metric, idx) => (
                  <div key={metric.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                      <span className="text-sm">{metric.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={metric.rate} className="w-16 h-1.5" />
                      <span className="text-sm font-medium w-12 text-right">{metric.rate.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatInsuranceLabel(type: string): string {
  const labels: Record<string, string> = {
    'ppo': 'PPO/Private',
    'hmo': 'HMO',
    'self-pay': 'Self-Pay',
    'medicaid': 'Medicaid',
    'medicare': 'Medicare',
    'not-sure': 'Unknown',
    'Unknown': 'Not Specified',
  };
  return labels[type] || type;
}

function formatUrgencyLabel(urgency: string): string {
  const labels: Record<string, string> = {
    'immediate': 'Immediate',
    'within-week': 'Within a Week',
    'flexible': 'Flexible',
    'Unknown': 'Not Specified',
  };
  return labels[urgency] || urgency;
}
