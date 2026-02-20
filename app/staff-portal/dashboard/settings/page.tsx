import { OrganizationSettings } from "@/components/organization-settings"
import { ProtectedRoute } from "@/components/protected-route"

export default function SettingsPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <OrganizationSettings />
    </ProtectedRoute>
  )
}