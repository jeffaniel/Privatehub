"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Copy, AlertCircle, Loader2 } from "lucide-react"
import confetti from "canvas-confetti"
import { supabase } from "@/lib/supabase"
import { isValidCategory, hasMinLength } from "@/lib/validation"
import { sanitizeSubmissionMetadata, generateAnonymousTrackingCode } from "@/lib/anonymization"
import { sanitizeText } from "@/lib/sanitization"

const CATEGORIES = [
  { value: "suggestion", label: "Suggestion", emoji: "💡" },
  { value: "voiceout", label: "Voice Out", emoji: "📢" },
]




export function SubmissionForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [trackingCode, setTrackingCode] = useState("")
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  const [currentStep, setCurrentStep] = useState(1)

  const [formData, setFormData] = useState({
    category: "",
    subject: "",
    message: "",
  })

  // Calculate progress
  const progress =
    [formData.category, formData.subject, formData.message.length >= 20].filter(Boolean).length * 33.33

  // Update step based on form completion
  useEffect(() => {
    if (formData.message.length >= 20) setCurrentStep(3)
    else if (formData.subject) setCurrentStep(2)
    else setCurrentStep(1)
  }, [formData])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!isValidCategory(formData.category)) {
      setError("Please select a valid category")
      return
    }

    if (!hasMinLength(formData.subject, 5)) {
      setError("Subject must be at least 5 characters long")
      return
    }

    if (!hasMinLength(formData.message, 20)) {
      setError("Message must be at least 20 characters long")
      return
    }

    const sanitizedSubject = sanitizeText(formData.subject).substring(0, 100)
    const sanitizedMessage = sanitizeText(formData.message).substring(0, 5000)

    setIsSubmitting(true)

    try {
      const code = generateAnonymousTrackingCode()

      // Prepare metadata-sanitized data
      const submissionData = sanitizeSubmissionMetadata({
        tracking_code: code,
        category: formData.category,
        subject: sanitizedSubject,
        message: sanitizedMessage,
        status: "pending",
        upvotes: 0,
        downvotes: 0,
        comments_count: 0,
      })

      // Insert submission into Supabase
      const { data, error: supabaseError } = await supabase
        .from("submissions")
        .insert([submissionData])
        .select()

      if (supabaseError) {
        console.error("Supabase error detail:", {
          message: supabaseError.message,
          details: supabaseError.details,
          hint: supabaseError.hint,
          code: supabaseError.code,
        })
        setError(`Failed to submit: ${supabaseError.message || "Unknown error"}`)
        setIsSubmitting(false)
        return
      }

      setTrackingCode(code)
      setSubmitted(true)

      // Trigger confetti celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#00F5FF", "#0F1A3A", "#E2E8F0"],
      })
    } catch (err) {
      console.error("Submission error:", err)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(trackingCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-accent/30 overflow-hidden">
          <div className="h-1 bg-accent" />
          <CardHeader className="text-center pt-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10"
            >
              <motion.div
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <CheckCircle2 className="h-10 w-10 text-accent" />
              </motion.div>
            </motion.div>
            <CardTitle className="text-2xl">Submission Received!</CardTitle>
            <CardDescription>Your anonymous feedback has been securely submitted.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-xl bg-primary/5 border border-primary/10 p-6 text-center"
            >
              <p className="text-sm text-muted-foreground mb-3">Your Tracking Code</p>
              <div className="flex items-center justify-center gap-3">
                <code className="text-2xl md:text-3xl font-mono font-bold text-foreground tracking-wider">
                  {trackingCode}
                </code>
                <Button variant="ghost" size="icon" onClick={copyToClipboard} className="shrink-0">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <AnimatePresence>
                {copied && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-accent mt-2"
                  >
                    Copied to clipboard!
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            <div className="rounded-xl border border-border bg-card p-4">
              <h4 className="font-medium text-foreground mb-2">Important</h4>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-accent">•</span>
                  Save this code to check for responses
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent">•</span>
                  This is the only way to access your submission
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent">•</span>
                  Lost codes cannot be recovered
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button className="flex-1" onClick={() => (window.location.href = "/track")}>
                Track Submission
              </Button>
              <Button
                variant="outline"
                className="flex-1 bg-transparent"
                onClick={() => {
                  setSubmitted(false)
                  setFormData({ category: "", subject: "", message: "" })
                }}
              >
                Submit Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full bg-accent shimmer"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <CardHeader>
          <CardTitle>Submit Your Feedback</CardTitle>
          <CardDescription>All fields are required. Your submission is completely anonymous.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 1: Category */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Label htmlFor="category" className="flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium ${currentStep >= 1 ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  1
                </span>
                Category
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger id="category" className="neu-input">
                  <SelectValue placeholder="What type of feedback?" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <span className="flex items-center gap-2">
                        <span>{cat.emoji}</span>
                        {cat.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>

            {/* Step 2: Subject */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Label htmlFor="subject" className="flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium ${currentStep >= 2 ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  2
                </span>
                Subject
              </Label>
              <Input
                id="subject"
                placeholder="Brief summary of your feedback"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="neu-input"
              />
            </motion.div>

            {/* Step 3: Message */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Label htmlFor="message" className="flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium ${currentStep >= 3 ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  3
                </span>
                Message
              </Label>
              <Textarea
                id="message"
                placeholder="Describe your feedback in detail..."
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="neu-input resize-none"
              />


              <p className="text-xs text-muted-foreground">
                Be specific while avoiding personal identifying information.
              </p>
            </motion.div>

            <Button
              type="submit"
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20"
              disabled={isSubmitting}
              size="lg"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting Securely...
                </span>
              ) : (
                "Submit Anonymously"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}
