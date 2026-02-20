"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, Calendar, MessageSquare, TrendingUp } from "lucide-react"
import { motion } from "framer-motion"

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
    updated_at: string
}

const STATUS_CONFIG = {
    pending: { label: "Pending", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
    under_review: { label: "Under Review", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
    responded: { label: "Responded", color: "bg-green-500/10 text-green-500 border-green-500/20" },
    closed: { label: "Closed", color: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
}

const CATEGORY_CONFIG = {
    suggestion: { label: "Suggestion", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
    voiceout: { label: "Voice Out", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
}

export default function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const { id } = use(params)
    const [submission, setSubmission] = useState<Submission | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [comments, setComments] = useState<any[]>([])
    const [responseText, setResponseText] = useState("")
    const [isSending, setIsSending] = useState(false)

    useEffect(() => {
        async function fetchSubmission() {
            try {
                const { data, error } = await supabase
                    .from("submissions")
                    .select("*")
                    .eq("id", id)
                    .single()

                if (error) {
                    console.error("Error fetching submission:", error)
                    setError("Failed to load submission")
                    return
                }

                setSubmission(data)

                // Fetch comments
                const { data: commentsData, error: commentsError } = await supabase
                    .from("comments")
                    .select("*")
                    .eq("submission_id", id)
                    .order("created_at", { ascending: true })

                if (!commentsError) {
                    setComments(commentsData || [])
                }
            } catch (err) {
                console.error("Error:", err)
                setError("An error occurred while loading the submission")
            } finally {
                setLoading(false)
            }
        }

        fetchSubmission()
    }, [id])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error || !submission) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle>Error</CardTitle>
                        <CardDescription>{error || "Submission not found"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push("/staff-portal/dashboard")} className="w-full">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const statusConfig = STATUS_CONFIG[submission.status as keyof typeof STATUS_CONFIG]
    const categoryConfig = CATEGORY_CONFIG[submission.category as keyof typeof CATEGORY_CONFIG]

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <Button
                        variant="ghost"
                        onClick={() => router.push("/staff-portal/dashboard")}
                        className="mb-6"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Button>

                    <Card className="border-border/50">
                        <CardHeader>
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge className={categoryConfig.color}>
                                            {categoryConfig.label}
                                        </Badge>
                                        <Badge className={statusConfig.color}>
                                            {statusConfig.label}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-2xl mb-2">{submission.subject}</CardTitle>
                                    <CardDescription className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        {new Date(submission.created_at).toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </CardDescription>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Tracking Code: <span className="font-mono font-semibold">{submission.tracking_code}</span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Message</h3>
                                <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                                    {submission.message}
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                                        <TrendingUp className="h-4 w-4" />
                                        <span className="text-2xl font-bold">{submission.upvotes}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Upvotes</p>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400">
                                        <TrendingUp className="h-4 w-4 rotate-180" />
                                        <span className="text-2xl font-bold">{submission.downvotes}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Downvotes</p>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
                                        <MessageSquare className="h-4 w-4" />
                                        <span className="text-2xl font-bold">{submission.comments_count}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Comments</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Change Status</h3>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                        <Button
                                            key={key}
                                            variant={submission.status === key ? "default" : "outline"}
                                            size="sm"
                                            onClick={async () => {
                                                const { error } = await supabase
                                                    .from("submissions")
                                                    .update({ status: key })
                                                    .eq("id", submission.id)

                                                if (!error) {
                                                    setSubmission({ ...submission, status: key })
                                                }
                                            }}
                                        >
                                            {config.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="mt-6 border-border/50">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" />
                                Responses ({comments.length})
                            </CardTitle>
                            <CardDescription>All responses are visible to the anonymous submitter.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                {comments.map((comment, index) => (
                                    <div key={comment.id} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                                        <p className="text-foreground leading-relaxed">{comment.message}</p>
                                        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                                            <span>Staff</span>
                                            <span>•</span>
                                            <span>{new Date(comment.created_at).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                                {comments.length === 0 && (
                                    <p className="text-center text-sm text-muted-foreground py-4 italic">
                                        No responses yet
                                    </p>
                                )}
                            </div>

                            <div className="pt-6 border-t space-y-4">
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                                        Add a Response
                                    </h3>
                                    <textarea
                                        className="w-full min-h-[120px] p-4 rounded-xl bg-background border border-border/50 focus:border-accent outline-none transition-colors resize-none"
                                        placeholder="Type your response to the student here..."
                                        value={responseText}
                                        onChange={(e) => setResponseText(e.target.value)}
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <Button
                                        onClick={async () => {
                                            if (!responseText.trim()) return
                                            setIsSending(true)
                                            try {
                                                const { data, error } = await supabase
                                                    .from("comments")
                                                    .insert([
                                                        {
                                                            submission_id: id,
                                                            message: responseText.trim(),
                                                        },
                                                    ])
                                                    .select()
                                                    .single()

                                                if (!error && data) {
                                                    setComments([...comments, data])
                                                    setResponseText("")
                                                    // If status is pending, bump to under_review
                                                    if (submission.status === "pending") {
                                                        await supabase
                                                            .from("submissions")
                                                            .update({ status: "under_review" })
                                                            .eq("id", id)
                                                        setSubmission({ ...submission, status: "under_review" })
                                                    }
                                                }
                                            } finally {
                                                setIsSending(false)
                                            }
                                        }}
                                        disabled={isSending || !responseText.trim()}
                                        className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                                    >
                                        {isSending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <TrendingUp className="h-4 w-4" />
                                        )}
                                        Send Response
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    )
}