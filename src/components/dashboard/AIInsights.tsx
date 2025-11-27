import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { BrainCircuit, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { generateInsights } from '../../lib/openai'
import { useTypewriter } from '../../hooks/useTypewriter'
import { useToast } from '../../hooks/use-toast'

export function AIInsights({ avgWaitTime }: { avgWaitTime: number }) {
  const [isPending, setIsPending] = useState(true)
  const [insights, setInsights] = useState<{ insight: string; suggestion: string } | null>(null)
  const { toast } = useToast()

  const displayedSuggestion = useTypewriter(insights?.suggestion ?? '', 30)

  useEffect(() => {
    setIsPending(true)
    generateInsights({
      todayReservations: 0,
      upcomingWeekReservations: 0,
      avgPartySize: 0,
      cancellationRatePct: 0,
      avgWaitTime
    }).then((result) => {
      if (result.insight && result.suggestion) {
        setInsights(result)
      } else {
        toast({ title: 'AI Error', description: 'Could not load AI insights.', variant: 'destructive' })
      }
    }).catch(() => {
      toast({ title: 'AI Error', description: 'Could not load AI insights.', variant: 'destructive' })
    }).finally(() => {
      setIsPending(false)
    })
  }, [avgWaitTime, toast])

  return (
    <Card className="col-span-1 bg-gradient-to-br from-primary/20 to-card border-primary/30 shadow-lg shadow-primary/10">
      <CardHeader className="pb-4">
        <CardTitle className="gradient-text flex items-center gap-2 text-base sm:text-lg">
          <BrainCircuit className="text-primary h-4 w-4 sm:h-5 sm:w-5" />
          AI Insights
        </CardTitle>
        <CardDescription className='text-muted-foreground min-h-[40px] text-xs sm:text-sm leading-relaxed'>
          {isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing restaurant data...
            </span>
          ) : (
            insights?.insight
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="flex items-center justify-center h-24">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Generating insights...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-primary">AI Recommendation</span>
            </div>
            <div className="bg-gradient-to-r from-primary/10 to-transparent rounded-lg p-4 border border-primary/20">
              <p className="text-sm leading-relaxed text-foreground font-medium">
                {displayedSuggestion}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

