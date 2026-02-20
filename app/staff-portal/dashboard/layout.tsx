import { SessionTimeout } from "@/components/session-timeout"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SessionTimeout>
            {children}
        </SessionTimeout>
    )
}
