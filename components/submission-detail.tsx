"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Shield,
  ArrowLeft,
  Clock,
  Search,
  MessageSquare,
  CheckCircle2,
  Send,
  Loader2,
} from "lucide-react"

type SubmissionStatus = "pending" | "under_review" | "responded" | "closed"

interface Response {
  id: string
  message: string
  createdAt: string
  adminName: string
}

interface Submission {
  id: string
  trackingCode: string
  category: string
  subject: string
  message: string
  status: SubmissionStatus
  createdAt: string
  responses: Response[]
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



const CATEGORY_LABELS: Record<string, string> = {
  feedback: "Feedback",
  complaint: "Complaint",
  suggestion: "Suggestion",
  report: "Report",
  praise: "Praise",
  other: "Other",
}

import { supabase } from "@/lib/supabase"
import { getCurrentStaff } from "@/lib/auth"

export function SubmissionDetail({ submissionId }: { submissionId: string }) {
  const [submission, setSubmission] = useState<any>(null)
  const [status, setStatus] = useState<string>("open")
  const [responseText, setResponseText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [responses, setResponses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('submissions')
          .select('*')
          .eq('id', submissionId)
          .single()

        if (error) throw error
        setSubmission(data)
        setStatus(data.status)

        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('*')
          .eq('submission_id', submissionId)
          .order('created_at', { ascending: true })

        if (commentsError) throw commentsError
        setResponses(commentsData || [])
      } catch (err) {
        console.error("Error fetching submission:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [submissionId])

  if (!submission) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">Submission not found</p>
              <Link href="/staff-portal/dashboard">
                <Button>Back to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  const handleSendResponse = async () => {
    if (!responseText.trim()) return

    try {
      setIsSending(true)
      const staff = await getCurrentStaff()

      const { data, error } = await supabase
        .from('comments')
        .insert([{
          submission_id: submissionId,
          message: responseText.trim(),
          // In a real app, you'd track which admin sent this
        }])
        .select()

      if (error) throw error

      setResponses([...responses, data[0]])
      setResponseText("")

      // Auto-update status to under_review if it was pending
      if (status === 'pending') {
        await handleStatusChange('under_review')
      }

    } catch (err) {
      console.error("Error sending response:", err)
    } finally {
      setIsSending(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('submissions')
        .update({ status: newStatus })
        .eq('id', submissionId)

      if (error) throw error
      setStatus(newStatus)
    } catch (err) {
      console.error("Error updating status:", err)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
              Admin
            </Badge>
          </div>
          <Link href="/staff-portal/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back <span className="hidden sm:inline">to Dashboard</span>
            </Button>
          </Link>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
        {/* Submission Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <Card className="overflow-hidden">
            <div className="h-1 bg-accent" />
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-xl">{submission.subject}</CardTitle>
                  <CardDescription className="mt-1">
                    Submitted on {new Date(submission.createdAt).toLocaleDateString()} at{" "}
                    {new Date(submission.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{CATEGORY_LABELS[submission.category]}</Badge>
                  <Badge className={`${STATUS_CONFIG[status].bgColor} ${STATUS_CONFIG[status].color}`}>
                    <span className="flex items-center gap-1">
                      {STATUS_CONFIG[status].icon}
                      {STATUS_CONFIG[status].label}
                    </span>
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Tracking Code</Label>
                <code className="block mt-1 text-sm font-mono bg-muted px-3 py-2 rounded-lg">
                  {submission.trackingCode}
                </code>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Message</Label>
                <p className="mt-1 text-foreground bg-muted/50 rounded-xl p-4 leading-relaxed">{submission.message}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Status Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Manage Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Label htmlFor="status" className="text-muted-foreground whitespace-nowrap">
                  Update Status:
                </Label>
                <Select value={status} onValueChange={(value) => handleStatusChange(value as SubmissionStatus)}>
                  <SelectTrigger id="status" className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="responded">Responded</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Responses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Responses ({responses.length})</CardTitle>
              <CardDescription>Responses are visible to the submitter via their tracking code.</CardDescription>
            </CardHeader>
            <CardContent>
              {responses.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">No responses yet</p>
              ) : (
                <div className="space-y-4">
                  {responses.map((response, index) => (
                    <motion.div
                      key={response.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="rounded-xl border border-accent/20 bg-accent/5 p-4"
                    >
                      <p className="text-foreground leading-relaxed">{response.message}</p>
                      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                        <span className="font-medium text-accent">{response.adminName}</span>
                        <span>•</span>
                        <span>
                          {new Date(response.createdAt).toLocaleDateString()} at{" "}
                          {new Date(response.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Send Response */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border-accent/20">
            <CardHeader>
              <div>
                <CardTitle className="text-lg">Send Response</CardTitle>
                <CardDescription>Your response will be visible to the anonymous submitter.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Write your response here..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleSendResponse}
                  disabled={!responseText.trim() || isSending}
                  className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Response
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}
