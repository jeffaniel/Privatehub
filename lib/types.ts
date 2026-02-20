// Shared types for the anonymous feedback application

export type SubmissionStatus = "pending" | "under_review" | "responded" | "closed"

export type SubmissionCategory = "feedback" | "complaint" | "suggestion" | "report" | "other"

export type UserRole = "admin" | "moderator" | "viewer"

export interface Organization {
  id: string
  name: string
  slug: string
  description: string
  contactEmail: string
  website: string
  createdAt: string
  updatedAt: string
}

export interface Submission {
  id: string
  trackingCode: string
  organizationId: string
  category: SubmissionCategory
  subject: string
  message: string
  status: SubmissionStatus
  createdAt: string
  updatedAt: string
}

export interface Response {
  id: string
  submissionId: string
  message: string
  adminId: string
  adminName: string
  createdAt: string
}

export interface TeamMember {
  id: string
  organizationId: string
  userId: string
  name: string
  email: string
  role: UserRole
  status: "active" | "pending"
  invitedAt: string
  joinedAt?: string
}

export interface NotificationSettings {
  emailOnNewSubmission: boolean
  emailOnUrgentReport: boolean
  dailyDigest: boolean
  weeklyReport: boolean
}

// API response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
