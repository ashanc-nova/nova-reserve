import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Flame, Users, Clock, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import type { ChartConfig } from '../ui/chart'
import { ChartContainer, ChartTooltipContent } from '../ui/chart'
import { AIInsights } from './AIInsights'

// Simulated data - in a real app, this would come from a backend
const buzzData = {
  totalGuests: 128,
  avgWaitTime: 22,
  trendingDishes: [
    { name: "Sirius Steak Frites", orders: 45, trend: 'up' },
    { name: "Cosmic Bruschetta", orders: 38, trend: 'up' },
    { name: "Andromeda Pasta", orders: 32, trend: 'down' },
  ],
  peakHours: [
    { hour: '5 PM', guests: 15 },
    { hour: '6 PM', guests: 28 },
    { hour: '7 PM', guests: 45 },
    { hour: '8 PM', guests: 30 },
    { hour: '9 PM', guests: 10 },
  ],
  ordersByCategory: [
    { name: 'Main Courses', value: 109, fill: '#3B82F6' },
    { name: 'Appetizers', value: 97, fill: '#8B5CF6' },
    { name: 'Desserts', value: 45, fill: '#10B981' },
  ],
}

const chartConfig = {
  guests: {
    label: 'Guests',
  },
  mains: {
    label: 'Main Courses',
    color: '#3B82F6',
  },
  apps: {
    label: 'Appetizers',
    color: '#8B5CF6',
  },
  desserts: {
    label: 'Desserts',
    color: '#10B981',
  },
} satisfies ChartConfig

export function BuzzFeed() {
  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in-50">
      {/* Stat Cards */}
      <Card className="col-span-1 bg-gradient-to-br from-blue-500/10 to-card border-blue-500/20 shadow-lg shadow-blue-500/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Guests Today</CardTitle>
          <Users className="h-4 w-4 text-blue-400" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl sm:text-4xl font-bold gradient-text">{buzzData.totalGuests}</div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-400" />
            +12 since yesterday
          </p>
        </CardContent>
      </Card>
      <Card className="col-span-1 bg-gradient-to-br from-orange-500/10 to-card border-orange-500/20 shadow-lg shadow-orange-500/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Average Wait Time</CardTitle>
          <Clock className="h-4 w-4 text-orange-400" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl sm:text-4xl font-bold gradient-text">{buzzData.avgWaitTime}<span className='text-xl sm:text-2xl'>min</span></div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-400" />
            ~5 min less than last Friday
          </p>
        </CardContent>
      </Card>
      
      {/* AI Insights Card */}
      <AIInsights avgWaitTime={buzzData.avgWaitTime} />
      
      {/* Trending Dishes */}
      <Card className="lg:col-span-1 bg-gradient-to-br from-red-500/10 to-card border-red-500/20 shadow-lg shadow-red-500/5">
        <CardHeader>
          <CardTitle className='gradient-text flex items-center gap-2 text-base sm:text-lg'>
            <Flame className='text-red-400 h-4 w-4 sm:h-5 sm:w-5'/>
            Hottest Dishes
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground">Most popular items in the galaxy right now</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {buzzData.trendingDishes.map((dish, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-red-500/5 to-transparent border border-red-500/10 hover:border-red-500/20 transition-all duration-200">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30">
                  <span className='font-bold text-red-400 text-sm'>{index + 1}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none text-foreground">{dish.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{dish.orders} orders tonight</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {dish.trend === 'up' ? (
                  <TrendingUp className='h-4 w-4 text-green-400' />
                ) : (
                  <TrendingUp className='h-4 w-4 text-red-400 rotate-180' />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      
      {/* Peak Hours Chart */}
      <Card className="col-span-1 lg:col-span-2 bg-gradient-to-br from-purple-500/10 to-card border-purple-500/20 shadow-lg shadow-purple-500/5">
        <CardHeader>
          <CardTitle className='gradient-text flex items-center gap-2 text-base sm:text-lg'>
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
            Peak Hours
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground">Guest traffic over the evening</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <ChartContainer config={chartConfig} className="h-[180px] sm:h-[200px] w-full">
            <BarChart data={buzzData.peakHours}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className='stroke-gray-600' />
              <XAxis dataKey="hour" tickLine={false} tickMargin={10} axisLine={false} stroke="#9CA3AF" fontSize={12} />
              <YAxis tickLine={false} axisLine={false} stroke="#9CA3AF" fontSize={12} />
              <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
              <Bar dataKey="guests" fill="#3B82F6" radius={8} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Orders by Category */}
      <Card className="col-span-1 lg:col-span-2 bg-gradient-to-br from-green-500/10 to-card border-green-500/20 shadow-lg shadow-green-500/5">
        <CardHeader>
          <CardTitle className='gradient-text flex items-center gap-2 text-base sm:text-lg'>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
            Category Buzz
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground">What's popular by course</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[180px] sm:h-[200px]">
            <PieChart>
              <Tooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
              <Pie data={buzzData.ordersByCategory} dataKey="value" nameKey="name" innerRadius={50} strokeWidth={5}>
                {buzzData.ordersByCategory.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

