"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { isValidTrackingCode } from "@/lib/security"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, ExternalLink, Clock, CheckCircle, Eye, Shield } from "lucide-react"

export function TrackingForm() {
  const [trackingCode, setTrackingCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submission, setSubmission] = useState<any>(null)
  const router = useRouter()

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSubmission(null)

    if (!isValidTrackingCode(trackingCode)) {
      setError("Please enter a valid tracking code (e.g., ABCD-1234-EFGH)")
      setLoading(false)
      return
    }

    try {
      // Normalize tracking code (remove hyphens and spaces)
      const normalizedCode = trackingCode.toUpperCase().replace(/[^A-Z0-9]/g, "")

      // Fetch submission from Supabase
      const { data, error: supabaseError } = await supabase
        .from("submissions")
        .select("*")
        .eq("tracking_code", normalizedCode)
        .single()

      if (supabaseError) {
        if (supabaseError.code === 'PGRST116') {
          setError("No submission found with this tracking code")
        } else {
          setError("Failed to fetch submission")
        }
        return
      }

      setSubmission(data)
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'under_review':
        return <Eye className="h-4 w-4" />
      case 'responded':
        return <CheckCircle className="h-4 w-4" />
      case 'closed':
        return <Shield className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'under_review':
        return 'bg-blue-100 text-blue-800'
      case 'responded':
        return 'bg-green-100 text-green-800'
      case 'closed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleTrack} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="tracking-code" className="text-sm font-medium">
            Enter Tracking Code
          </label>
          <div className="flex gap-2">
            <Input
              id="tracking-code"
              placeholder="XXXX-XXXX-XXXX"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Tracking...
                </>
              ) : (
                "Track"
              )}
            </Button>
          </div>
        </div>
      </form>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {submission && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">Submission Details</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tracking Code: {submission.tracking_code}
                  </p>
                </div>
                <Badge className={`${getStatusColor(submission.status)} flex items-center gap-1`}>
                  {getStatusIcon(submission.status)}
                  {submission.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Category</p>
                  <p className="capitalize">{submission.category}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Submitted</p>
                  <p>{new Date(submission.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Subject</p>
                <p className="font-medium">{submission.subject}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Message</p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap">{submission.message}</p>
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-4 border-t">
                <div className="flex gap-6 justify-between sm:justify-start">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{submission.upvotes}</p>
                    <p className="text-xs text-muted-foreground">Upvotes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{submission.downvotes}</p>
                    <p className="text-xs text-muted-foreground">Downvotes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{submission.comments_count}</p>
                    <p className="text-xs text-muted-foreground">Comments</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/submission/${submission.tracking_code}`)}
                  className="w-full sm:w-auto"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Full Submission
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="text-center text-sm text-muted-foreground">
        <p>Don't have a tracking code? Check your email for the confirmation message.</p>
      </div>
    </div>
  )
}
