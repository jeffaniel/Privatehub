"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Shield,
  LogOut,
  Search,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Filter,
  ChevronRight,
  Settings,
  TrendingUp,
  BarChart3,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AnimatedCounter } from "@/components/animated-counter"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { supabase } from "@/lib/supabase"
import { getCurrentStaff, clearStaffSession } from "@/lib/auth"
import { isValidCategory, isValidStatus, sanitizeString } from "@/lib/validation"
import { promiseWithTimeout } from "@/lib/utils"

type SubmissionStatus = "pending" | "under_review" | "responded" | "closed"

interface Submission {
  id: string
  tracking_code: string
  category: string
  subject: string
  message: string
  status: SubmissionStatus
  created_at: string
}


const CATEGORY_LABELS: Record<string, string> = {
  suggestion: "Suggestion",
  voiceout: "Voice Out",
}


const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending",
    color: "text-warning",
    bgColor: "bg-warning/10",
    icon: <Clock className="h-4 w-4" />,
  },
  under_review: {
    label: "Under Review",
    color: "text-chart-1",
    bgColor: "bg-chart-1/10",
    icon: <Search className="h-4 w-4" />,
  },
  responded: {
    label: "Responded",
    color: "text-success",
    bgColor: "bg-success/10",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  closed: {
    label: "Closed",
    color: "text-muted-foreground",
    bgColor: "bg-muted/10",
    icon: <Shield className="h-4 w-4" />,
  },
}

const DEFAULT_STATUS = {
  label: "Unknown",
  color: "text-muted-foreground",
  bgColor: "bg-muted/10",
  icon: <AlertTriangle className="h-4 w-4" />,
}



export function AdminDashboard() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [currentStaff, setCurrentStaff] = useState<any>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [weeklyActivity, setWeeklyActivity] = useState<any[]>([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    under_review: 0,
    responded: 0,
    closed: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const loadStaff = async () => {
      const staff = await getCurrentStaff()
      if (isMounted && staff) {
        setCurrentStaff(staff)
      }
    }
    loadStaff()
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    if (currentStaff) {
      fetchSubmissions()
      fetchStats()
    }
  }, [currentStaff, statusFilter, categoryFilter])

  const fetchSubmissions = async () => {
    try {
      setLoading(true)
      console.log('🔍 [AdminDashboard] Fetching submissions...')

      // Use centralized validation/sanitization
      const sanitizedSearch = sanitizeString(searchQuery, 100)
      const currentStatus = isValidStatus(statusFilter) ? statusFilter : "all"
      const currentCategory = isValidCategory(categoryFilter) ? categoryFilter : "all"

      let query = supabase.from("submissions").select("*").order("created_at", { ascending: false })

      if (currentStatus !== "all") {
        query = query.eq("status", currentStatus)
      }

      if (currentCategory !== "all") {
        query = query.eq("category", currentCategory)
      }

      // Add timeout to submissions query
      const { data, error } = await promiseWithTimeout(query as any, 10000, 'Submissions fetch') as any

      if (error) throw error

      console.log(`✅ [AdminDashboard] Fetched ${data?.length || 0} submissions`)
      setSubmissions(data || [])

      // Calculate category chart data
      const counts: Record<string, number> = {}
      data?.forEach((sub: any) => {
        counts[sub.category] = (counts[sub.category] || 0) + 1
      })

      const chartData = Object.entries(counts).map(([name, value], index) => ({
        name: CATEGORY_LABELS[name] || name,
        value,
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
      }))
      setCategoryData(chartData)
    } catch (error) {
      console.error("❌ [AdminDashboard] Error fetching submissions:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      console.log('🔍 [AdminDashboard] Fetching stats...')
      const { data, error } = await promiseWithTimeout(
        supabase.from('submissions').select('status, created_at') as any,
        10000,
        'Stats fetch'
      ) as any

      if (error) throw error

      // 1. Calculate general stats
      const total = data.length
      const responded = data.filter((s: any) => s.status === 'responded').length
      const underReview = data.filter((s: any) => s.status === 'under_review').length
      const closed = data.filter((s: any) => s.status === 'closed').length

      const newStats = {
        total,
        pending: data.filter((s: any) => s.status === 'pending').length,
        under_review: underReview,
        responded: responded,
        closed: closed,
        resolution_rate: total > 0 ? Math.round(((responded + closed) / total) * 100) : 0
      }
      setStats(newStats)

      // 2. Calculate weekly activity data (last 7 days)
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const last7Days: { dateStr: string; day: string; submissions: number; responses: number }[] = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        last7Days.push({
          dateStr: date.toISOString().split('T')[0],
          day: days[date.getDay()],
          submissions: 0,
          responses: 0
        })
      }

      data.forEach((sub: any) => {
        const subDate = new Date(sub.created_at).toISOString().split('T')[0]
        const dayData = last7Days.find(d => d.dateStr === subDate)
        if (dayData) {
          dayData.submissions++
          if (['responded', 'closed', 'under_review'].includes(sub.status)) {
            dayData.responses++
          }
        }
      })

      setWeeklyActivity(last7Days)
      console.log('✅ [AdminDashboard] Stats and Weekly Activity updated')
    } catch (error) {
      console.error('❌ [AdminDashboard] Error fetching stats:', error)
    }
  }

  const handleLogout = () => {
    clearStaffSession()
    router.push('/staff-portal/login')
  }

  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      sub.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.tracking_code.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header with glassmorphism */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30"
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">
              <span className="hidden sm:inline">Lincoln Student Union </span>
              <span className="inline sm:hidden">LSU </span>
              <span className="text-accent">Voice</span>
            </span>
            <Badge variant="outline" className="ml-2 border-accent/50 text-accent">
              Staff
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden md:block">
              {currentStaff?.full_name || 'Staff Member'}
            </span>
            <Link href="/staff-portal/dashboard/security">
              <Button variant="ghost" size="icon" title="Security Settings">
                <Shield className="h-5 w-5 text-accent" />
                <span className="sr-only">Security</span>
              </Button>
            </Link>
            <Link href="/staff-portal/dashboard/settings">
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-8 pt-24">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-foreground" style={{ fontFamily: "var(--font-poppins)" }}>
            Welcome back, {currentStaff?.full_name || 'Staff'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Role: <Badge variant="outline" className="ml-2">{currentStaff?.role || 'Staff Member'}</Badge>
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            title="Total Submissions"
            value={stats.total}
            icon={<MessageSquare className="h-5 w-5" />}
            color="text-accent"
            bgColor="bg-accent/10"
            delay={0.1}
          />
          <StatCard
            title="Pending Review"
            value={stats.pending}
            icon={<Clock className="h-5 w-5" />}
            color="text-warning"
            bgColor="bg-warning/10"
            delay={0.2}
          />
          <StatCard
            title="Under Review"
            value={stats.under_review}
            icon={<Search className="h-5 w-5" />}
            color="text-chart-1"
            bgColor="bg-chart-1/10"
            delay={0.3}
          />
          <StatCard
            title="Responded"
            value={stats.responded}
            icon={<CheckCircle2 className="h-5 w-5" />}
            color="text-success"
            bgColor="bg-success/10"
            delay={0.4}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {/* Weekly Activity Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-accent" />
                      Weekly Activity
                    </CardTitle>
                    <CardDescription>Submissions and responses this week</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                    +12% vs last week
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyActivity}>
                      <defs>
                        <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorResponses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="submissions"
                        stroke="hsl(var(--accent))"
                        fillOpacity={1}
                        fill="url(#colorSubmissions)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="responses"
                        stroke="hsl(var(--chart-3))"
                        fillOpacity={1}
                        fill="url(#colorResponses)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Category Breakdown */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-accent" />
                  By Category
                </CardTitle>
                <CardDescription>Distribution of submission types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData.length > 0 ? categoryData : [{ name: 'None', value: 1, color: 'hsl(var(--muted))' }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {categoryData.map((cat) => (
                    <div key={cat.name} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">{cat.name}</span>
                      <span className="font-medium text-foreground ml-auto">{cat.value}</span>
                    </div>
                  ))}
                  {categoryData.length === 0 && <p className="text-xs text-muted-foreground col-span-2 text-center">No data available</p>}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>


        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by subject or tracking code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="responded">Responded</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                      <SelectItem value="complaint">Complaint</SelectItem>
                      <SelectItem value="suggestion">Suggestion</SelectItem>
                      <SelectItem value="report">Report</SelectItem>
                      <SelectItem value="praise">Praise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Submissions List */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          <Card>
            <CardHeader>
              <CardTitle>Recent Submissions</CardTitle>
              <CardDescription>
                {loading ? 'Loading...' : `${filteredSubmissions.length} submission${filteredSubmissions.length !== 1 ? 's' : ''} found`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <AnimatePresence>
                  {loading ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Loading submissions...
                    </motion.div>
                  ) : filteredSubmissions.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No submissions match your filters
                    </motion.div>
                  ) : (
                    filteredSubmissions.map((submission, index) => (
                      <SubmissionRow key={submission.id} submission={submission} index={index} />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  color,
  bgColor,
  delay,
}: {
  title: string
  value: number
  icon: React.ReactNode
  color: string
  bgColor: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -2 }}
    >
      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold text-foreground">
                <AnimatedCounter value={value} duration={1500} />
              </p>
            </div>
            <div className={`p-3 rounded-xl ${bgColor} ${color}`}>{icon}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function SubmissionRow({ submission, index }: { submission: Submission; index: number }) {
  const status = STATUS_CONFIG[submission.status] ?? DEFAULT_STATUS

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/staff-portal/dashboard/submissions/${submission.id}`}>
        <div
          className={`flex items-center gap-4 rounded-xl border p-4 hover:bg-muted/50 transition-all cursor-pointer border-border`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="font-medium text-foreground truncate">{submission.subject}</h4>
              <Badge variant="outline" className="text-xs">
                {CATEGORY_LABELS[submission.category] || submission.category}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{submission.tracking_code}</code>
              <span>{new Date(submission.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <Badge className={`${status.bgColor} ${status.color} flex items-center gap-1 shrink-0`}>
            {status.icon}
            {status.label}
          </Badge>
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        </div>
      </Link>
    </motion.div>
  )
}
