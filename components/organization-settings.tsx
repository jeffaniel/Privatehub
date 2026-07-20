"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Shield,
  ArrowLeft,
  Building2,
  Users,
  Mail,
  Save,
  Copy,
  CheckCircle2,
  Settings,
  Bell,
  Database,
  TrendingUp,
  MessageSquare,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

// Using existing submissions table for organization data
interface OrganizationData {
  name: string
  description: string
  contact_email: string
  website: string
}

interface StatsData {
  total_submissions: number
  pending_submissions: number
  under_review_submissions: number
  responded_submissions: number
  closed_submissions: number
  total_comments: number
}

import { getCurrentStaff } from "@/lib/auth"

export function OrganizationSettings() {
  console.log("🏗️ [OrganizationSettings] Mounting...")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const router = useRouter()
  const [organization, setOrganization] = useState<OrganizationData>({
    name: "Lincoln Student Union Voice",
    description: "Anonymous feedback platform for Lincoln College Science Management and Technology Student Union",
    contact_email: "staff@lincolnvoice.edu",
    website: "",
  })

  const [stats, setStats] = useState<StatsData>({
    total_submissions: 0,
    pending_submissions: 0,
    under_review_submissions: 0,
    responded_submissions: 0,
    closed_submissions: 0,
    total_comments: 0,
  })

  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [notifications, setNotifications] = useState({
    emailOnNewSubmission: true,
    emailOnUrgentReport: true,
    dailyDigest: false,
    weeklyReport: true,
  })
  const [dbSettingsId, setDbSettingsId] = useState<string | null>(null)

  const submissionUrl = typeof window !== "undefined" ? `${window.location.origin}/submit` : ""

  useEffect(() => {
    console.log("🏁 [OrganizationSettings] Initializing data fetch...")
    fetchStats()
    fetchSettings()

    return () => {
      console.log("🧹 [OrganizationSettings] Unmounting...")
    }
  }, [])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setDbSettingsId(data.id)
        setOrganization({
          name: data.name,
          description: data.description,
          contact_email: data.contact_email,
          website: data.website
        })
        if (data.notifications_json) {
          setNotifications(data.notifications_json)
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    }
  }

  const fetchStats = async () => {
    try {
      // Get submission stats
      const { data: submissions, error: submissionsError } = await supabase
        .from("submissions")
        .select("status")

      if (submissionsError) throw submissionsError

      // Get comment stats
      const { data: comments, error: commentsError } = await supabase
        .from("comments")
        .select("id")

      if (commentsError) throw commentsError

      const statsData: StatsData = {
        total_submissions: submissions?.length || 0,
        pending_submissions: submissions?.filter(s => s.status === 'pending').length || 0,
        under_review_submissions: submissions?.filter(s => s.status === 'under_review').length || 0,
        responded_submissions: submissions?.filter(s => s.status === 'responded').length || 0,
        closed_submissions: submissions?.filter(s => s.status === 'closed').length || 0,
        total_comments: comments?.length || 0,
      }

      setStats(statsData)
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const handleSaveOrganization = async () => {
    setIsSaving(true)
    setSuccessMessage("")
    setError("")

    try {
      // Basic input validation
      if (organization.contact_email && !organization.contact_email.includes("@")) {
        throw new Error("Invalid email format")
      }

      const payload = {
        name: organization.name,
        description: organization.description,
        contact_email: organization.contact_email,
        website: organization.website,
        notifications_json: notifications,
        updated_at: new Date().toISOString(),
      }

      let error
      if (dbSettingsId) {
        const { error: updateError } = await supabase.from("organization_settings").update(payload).eq("id", dbSettingsId)
        error = updateError
      } else {
        const { data, error: insertError } = await supabase.from("organization_settings").insert([payload]).select()
        error = insertError
        if (data && data[0]) setDbSettingsId(data[0].id)
      }

      if (error) throw error

      setSuccessMessage("Settings saved successfully to database")
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {
      console.error("Error saving settings:", error)
      setError(error instanceof Error ? error.message : "Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  const copySubmissionUrl = async () => {
    if (submissionUrl) {
      await navigator.clipboard.writeText(submissionUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleLogout = async () => {
    const { clearStaffSession } = await import("@/lib/auth")
    clearStaffSession()
    router.push("/staff-portal/login")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">
              <span className="hidden sm:inline">Lincoln Student Union Voice</span>
              <span className="inline sm:hidden">LSU Voice</span> Staff Portal
            </span>
            <Badge variant="outline" className="ml-2">
              Staff
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/staff-portal/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
          <p className="text-muted-foreground">Manage your platform settings and view system statistics.</p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Submissions</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total_submissions}</p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold text-foreground">{stats.pending_submissions}</p>
                </div>
                <div className="p-2 rounded-lg bg-warning/10">
                  <MessageSquare className="h-5 w-5 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Under Review</p>
                  <p className="text-2xl font-bold text-foreground">{stats.under_review_submissions}</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Responded</p>
                  <p className="text-2xl font-bold text-foreground">{stats.responded_submissions}</p>
                </div>
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="platform" className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1 mb-8">
            <TabsTrigger value="platform" className="gap-2 py-2">
              <Building2 className="h-4 w-4" />
              Platform
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 py-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="database" className="gap-2 py-2">
              <Database className="h-4 w-4" />
              Database
            </TabsTrigger>
            <TabsTrigger value="share" className="gap-2 py-2">
              <Settings className="h-4 w-4" />
              Share
            </TabsTrigger>
          </TabsList>

          {/* Platform Settings Tab */}
          <TabsContent value="platform">
            <Card>
              <CardHeader>
                <CardTitle>Platform Information</CardTitle>
                <CardDescription>
                  Basic information about your Lincoln Student Union Voice platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Platform Name</Label>
                  <Input
                    id="orgName"
                    value={organization.name}
                    onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgDescription">Description</Label>
                  <Textarea
                    id="orgDescription"
                    value={organization.description}
                    onChange={(e) => setOrganization({ ...organization, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="orgEmail">Contact Email</Label>
                    <Input
                      id="orgEmail"
                      type="email"
                      value={organization.contact_email}
                      onChange={(e) => setOrganization({ ...organization, contact_email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgWebsite">Website</Label>
                    <Input
                      id="orgWebsite"
                      type="url"
                      placeholder="https://example.com"
                      value={organization.website}
                      onChange={(e) => setOrganization({ ...organization, website: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveOrganization} disabled={isSaving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Configure how you receive notifications about new submissions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">New Submission Alert</p>
                    <p className="text-sm text-muted-foreground">Get notified when a new submission is received</p>
                  </div>
                  <Switch
                    checked={notifications.emailOnNewSubmission}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, emailOnNewSubmission: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Urgent Report Alert</p>
                    <p className="text-sm text-muted-foreground">
                      Immediate notification for submissions marked as urgent
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailOnUrgentReport}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, emailOnUrgentReport: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Daily Digest</p>
                    <p className="text-sm text-muted-foreground">Summary of all submissions from the past 24 hours</p>
                  </div>
                  <Switch
                    checked={notifications.dailyDigest}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, dailyDigest: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Weekly Report</p>
                    <p className="text-sm text-muted-foreground">Weekly summary with statistics and trends</p>
                  </div>
                  <Switch
                    checked={notifications.weeklyReport}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyReport: checked })}
                  />
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Note: These settings are saved locally in your browser. For real email notifications,
                    you would need to set up a backend service.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database">
            <Card>
              <CardHeader>
                <CardTitle>Database Information</CardTitle>
                <CardDescription>
                  View and manage your Supabase database
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Current Tables</p>
                    <div className="grid gap-2 mt-2">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">submissions</span>
                        <Badge variant="outline">{stats.total_submissions} records</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">comments</span>
                        <Badge variant="outline">{stats.total_comments} records</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">votes</span>
                        <Badge variant="outline">votes table</Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Database Actions</p>
                    <div className="flex gap-2 mt-2">
                      <Button variant="outline" size="sm" onClick={() => window.open('https://supabase.com/dashboard/project/qajbticeqivhbvakmsby', '_blank')}>
                        Open Supabase Dashboard
                      </Button>
                      <Button variant="outline" size="sm" onClick={fetchStats}>
                        Refresh Statistics
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Share Tab */}
          <TabsContent value="share">
            <Card>
              <CardHeader>
                <CardTitle>Submission URL</CardTitle>
                <CardDescription>
                  Share this URL to allow people to submit feedback
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input value={submissionUrl} readOnly className="font-mono text-sm" />
                    <Button variant="outline" onClick={copySubmissionUrl} className="gap-2 flex-shrink-0 bg-transparent">
                      {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>

                  <div className="rounded-lg border border-border p-4 bg-muted/50">
                    <h4 className="font-medium text-foreground mb-2">Embed Code</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Add this iframe to your website to embed the feedback form directly.
                    </p>
                    <pre className="text-xs bg-background p-3 rounded border border-border overflow-x-auto">
                      {`<iframe
  src="${submissionUrl}"
  width="100%"
  height="600"
  style="border: none; border-radius: 8px;"
  title="Submit Feedback"
></iframe>`}
                    </pre>
                  </div>

                  <div className="rounded-lg border border-border p-4 bg-primary/5">
                    <h4 className="font-medium text-foreground mb-2">QR Code</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Share this link via QR code for mobile users.
                    </p>
                    <div className="text-center">
                      <div className="inline-block p-4 bg-white rounded-lg">
                        {/* Placeholder for QR code */}
                        <div className="w-32 h-32 flex items-center justify-center border-2 border-dashed border-gray-300 rounded">
                          <span className="text-xs text-gray-500">QR Code</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Scan this code to open the submission form
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
