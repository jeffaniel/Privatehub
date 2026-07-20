"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Shield, ArrowLeft, TrendingUp, ThumbsUp, ThumbsDown, MessageSquare, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Submission {
  id: string
  tracking_code: string
  category: string
  subject: string
  message: string
  status: "pending" | "under_review" | "responded" | "closed"
  upvotes: number
  downvotes: number
  comments_count: number
  created_at: string
}

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "text-warning", bgColor: "bg-warning/10" },
  under_review: { label: "Under Review", color: "text-chart-1", bgColor: "bg-chart-1/10" },
  responded: { label: "Responded", color: "text-success", bgColor: "bg-success/10" },
  closed: { label: "Closed", color: "text-muted-foreground", bgColor: "bg-muted/10" },
}

const CATEGORY_CONFIG = {
  suggestion: { label: "Suggestion", emoji: "💡" },
  voiceout: { label: "Voice Out", emoji: "📢" },
}

export default function TrendingPage() {
  const [filter, setFilter] = useState("all")
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [voted, setVoted] = useState<Record<string, "up" | "down" | null>>({})

  // Fetch submissions from Supabase
  useEffect(() => {
    fetchSubmissions()
  }, [])

  const fetchSubmissions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching submissions:", error)
        return
      }

      setSubmissions(data || [])
    } catch (err) {
      console.error("Unexpected error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async (id: string, type: "up" | "down") => {
    const currentVote = voted[id]
    if (currentVote === type) return // Already voted this way

    // Optimistic update
    setVoted((prev) => ({
      ...prev,
      [id]: type,
    }))

    try {
      // 1. Insert into votes table (Triggers will handle the submission count)
      const { error: voteError } = await supabase
        .from("votes")
        .insert([{
          submission_id: id,
          vote_type: type,
          fingerprint: 'anonymous-session' // Basic fingerprint
        }])

      if (voteError) throw voteError

      // 2. Persist in localStorage to prevent double voting in current session
      const savedVotes = JSON.parse(localStorage.getItem('user_votes') || '{}')
      savedVotes[id] = type
      localStorage.setItem('user_votes', JSON.stringify(savedVotes))

      // 3. Update local count (simulating trigger result)
      setSubmissions((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s

          let up = s.upvotes
          let down = s.downvotes

          // Revert old vote if switching (though current logic just adds)
          if (type === 'up') up++
          if (type === 'down') down++

          return { ...s, upvotes: up, downvotes: down }
        })
      )
    } catch (err) {
      console.error("Voting error:", err)
      // Revert optimistic
      setVoted((prev) => ({
        ...prev,
        [id]: currentVote,
      }))
    }
  }

  const filteredSubmissions = submissions
    .filter((s) => {
      if (filter === "all") return true
      return s.status === filter
    })
    .sort((a, b) => {
      // Sort by net votes (upvotes - downvotes)
      const aScore = a.upvotes - a.downvotes
      const bScore = b.upvotes - b.downvotes
      return bScore - aScore
    })

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
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">
              <span className="hidden sm:inline">Lincoln Student Union </span>
              <span className="inline sm:hidden">LSU </span>
              <span className="text-accent">Voice</span>
            </span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-24 pt-28">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 text-accent mb-4">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium">Community Voice</span>
            </div>
            <h1
              className="text-3xl md:text-4xl font-bold text-foreground mb-3"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Trending <span className="text-accent">Submissions</span>
            </h1>
            <p className="text-muted-foreground">
              Vote for the changes you want to see. Your voice shapes our community.
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center justify-between mb-6"
          >
            <p className="text-sm text-muted-foreground">
              {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? "s" : ""}
            </p>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="responded">Responded</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-accent border-r-transparent"></div>
              <p className="mt-4 text-muted-foreground">Loading submissions...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredSubmissions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No submissions found.</p>
            </div>
          )}

          {/* Submissions List */}
          <div className="space-y-4">
            {filteredSubmissions.map((submission, index) => (
              <motion.div
                key={submission.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Card className="overflow-hidden hover:border-accent/30 transition-colors">
                  <CardContent className="p-0">
                    <div className="flex">
                      {/* Voting section */}
                      <div className="flex flex-col items-center justify-center gap-1 p-4 bg-muted/30 border-r border-border">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${voted[submission.id] === "up" ? "text-success" : ""}`}
                          onClick={() => handleVote(submission.id, "up")}
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <span className="font-semibold text-foreground">
                          {submission.upvotes - submission.downvotes}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${voted[submission.id] === "down" ? "text-destructive" : ""}`}
                          onClick={() => handleVote(submission.id, "down")}
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h3 className="font-semibold text-foreground">{submission.subject}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {CATEGORY_CONFIG[submission.category as keyof typeof CATEGORY_CONFIG]?.emoji}{" "}
                                {CATEGORY_CONFIG[submission.category as keyof typeof CATEGORY_CONFIG]?.label}
                              </Badge>
                              <Badge
                                className={`text-xs ${STATUS_CONFIG[submission.status].bgColor} ${STATUS_CONFIG[submission.status].color}`}
                              >
                                {STATUS_CONFIG[submission.status].label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{submission.message}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {submission.comments_count} comments
                          </span>
                          <span>{new Date(submission.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
