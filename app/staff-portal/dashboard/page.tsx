import { AdminDashboard } from "@/components/admin-dashboard"
import { ProtectedRoute } from "@/components/protected-route"

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminDashboard />
    </ProtectedRoute>
  )
}