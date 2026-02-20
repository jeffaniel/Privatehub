"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getCurrentStaff } from "@/lib/auth"

export default function AdminPage() {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const admin = await getCurrentStaff()
      if (admin) {
        router.push('/staff-portal/dashboard')
      } else {
        router.push('/staff-portal/login')
      }
    }

    checkAuth()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
    </div>
  )
}