"use client"

import { isValidTrackingCode } from "@/lib/security"
import { sanitizeString } from "@/lib/validation"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  Eye,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  User,
  CalendarDays,
  Tag,
  Send,
  Loader2,
  ChevronUp,
  ChevronDown
} from "lucide-react"

interface Submission {
  id: string
  tracking_code: string
  category: string
  subject: string
  message: string
  status: string
  upvotes: number
  downvotes: number
  comments_count: number
  created_at: string
}

interface Comment {
  id: string
  message: string
  created_at: string
}

export default function SubmissionPage() {
  const params = useParams()
  const router = useRouter()
  const trackingCode = params.id as string

  const [submission, setSubmission] = useState<Submission | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [loading, setLoading] = useState(true)
  const [commenting, setCommenting] = useState(false)
  const [voting, setVoting] = useState(false)

  useEffect(() => {
    fetchSubmission()
    fetchComments()
  }, [trackingCode])

  const fetchSubmission = async () => {
    try {
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .eq("tracking_code", trackingCode)
        .single()

      if (error) throw error
      setSubmission(data)
    } catch (error) {
      console.error("Error fetching submission:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("submission_id", submission?.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error("Error fetching comments:", error)
    }
  }

  const handleVote = async (type: 'up' | 'down') => {
    if (!submission || voting) return

    setVoting(true)
    try {
      // Use the 'votes' table - trigger handles the submission count
      const { error } = await supabase
        .from("votes")
        .insert([{
          submission_id: submission.id,
          vote_type: type,
          fingerprint: 'manual-vote'
        }])

      if (error) throw error

      // Optimistic local update
      setSubmission(prev => prev ? {
        ...prev,
        [type === 'up' ? 'upvotes' : 'downvotes']: (prev[type === 'up' ? 'upvotes' : 'downvotes'] || 0) + 1
      } : null)
    } catch (error) {
      console.error("Error voting:", error)
    } finally {
      setVoting(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !submission || commenting) return

    setCommenting(true)
    try {
      const sanitizedMessage = sanitizeString(newComment.trim(), 1000)

      // Insert comment - trigger handles the submission comments_count
      const { error: commentError } = await supabase
        .from("comments")
        .insert([
          {
            submission_id: submission.id,
            message: sanitizedMessage
          }
        ])

      if (commentError) throw commentError

      // Update local state (optimistic)
      setNewComment("")
      setSubmission(prev => prev ? {
        ...prev,
        comments_count: (prev.comments_count || 0) + 1
      } : null)

      // Refresh comments list
      fetchComments()
    } catch (error) {
      console.error("Error adding comment:", error)
    } finally {
      setCommenting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="h-4 w-4" />
      case 'under_review':
        return <Eye className="h-4 w-4" />
      case 'implemented':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'under_review':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'implemented':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-24">
          <Card>
            <CardContent className="pt-6 text-center">
              <h2 className="text-2xl font-bold mb-4">Submission Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The submission with tracking code "{trackingCode}" could not be found.
              </p>
              <Button onClick={() => router.push('/track')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tracking
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-semibold text-lg">
              Lincoln<span className="text-accent">Voice</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/track">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Tracking
              </Button>
            </Link>
            <Badge className={`${getStatusColor(submission.status)} border`}>
              {getStatusIcon(submission.status)}
              <span className="ml-1 capitalize">{submission.status.replace('_', ' ')}</span>
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Tracking Code Banner */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tracking Code</p>
                <p className="text-2xl font-mono font-bold">{submission.tracking_code}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground">Submitted</p>
                <p className="font-medium">{formatDate(submission.created_at)}</p>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Submission Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-2xl">{submission.subject}</CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            <span className="capitalize">{submission.category}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {new Date(submission.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="prose max-w-none">
                      <p className="text-lg whitespace-pre-wrap">{submission.message}</p>
                    </div>

                    <Separator />

                    {/* Voting Section */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVote('up')}
                            disabled={voting}
                            className="gap-2"
                          >
                            <ChevronUp className="h-4 w-4" />
                            <span className="font-medium">{submission.upvotes}</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVote('down')}
                            disabled={voting}
                            className="gap-2"
                          >
                            <ChevronDown className="h-4 w-4" />
                            <span className="font-medium">{submission.downvotes}</span>
                          </Button>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-4 w-4" />
                            {submission.upvotes} upvotes
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsDown className="h-4 w-4" />
                            {submission.downvotes} downvotes
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Comments Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Comments ({submission.comments_count})
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Add Comment Form */}
                    <div className="space-y-4">
                      <Textarea
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={handleAddComment}
                          disabled={commenting || !newComment.trim()}
                        >
                          {commenting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Posting...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Post Comment
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {/* Comments List */}
                    <div className="space-y-4">
                      {comments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No comments yet. Be the first to comment!</p>
                        </div>
                      ) : (
                        comments.map((comment, index) => (
                          <motion.div
                            key={comment.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex gap-4"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="bg-muted/50 rounded-lg p-4">
                                <p className="whitespace-pre-wrap">{comment.message}</p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                {formatDate(comment.created_at)}
                              </p>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Status Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Submission Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className={`${getStatusColor(submission.status)} p-4 rounded-lg border`}>
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(submission.status)}
                        <span className="font-semibold capitalize">
                          {submission.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm">
                        {submission.status === 'open' && 'Your submission is open for voting and comments.'}
                        {submission.status === 'under_review' && 'Your submission is currently under review by the administration.'}
                        {submission.status === 'implemented' && 'Your submission has been implemented!'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Stats Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
                        <p className="text-3xl font-bold text-green-600">{submission.upvotes}</p>
                        <p className="text-sm font-medium text-green-800">Upvotes</p>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg border border-red-100">
                        <p className="text-3xl font-bold text-red-600">{submission.downvotes}</p>
                        <p className="text-sm font-medium text-red-800">Downvotes</p>
                      </div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-3xl font-bold text-blue-600">{submission.comments_count}</p>
                      <p className="text-sm font-medium text-blue-800">Comments</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => navigator.clipboard.writeText(window.location.href)}
                    >
                      <span>Share Submission</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => router.push('/track')}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Track Another Submission
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => window.print()}
                    >
                      <span>Print This Page</span>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}