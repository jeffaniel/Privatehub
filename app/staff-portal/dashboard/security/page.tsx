import { createClient } from "@/lib/server-client"
import { redirect } from "next/navigation"
import { MfaSetup } from "@/components/mfa-setup"
import { Button } from "@/components/ui/button"
import { Shield, Lock, AlertCircle } from "lucide-react"

export default async function SecurityPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/staff-portal/login")
    }

    // Check if MFA is already enabled
    const { data: mfaData } = await supabase
        .from('admin_mfa')
        .select('is_enabled')
        .eq('admin_id', user.id)
        .maybeSingle()

    const isEnabled = mfaData?.is_enabled || false

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Security Settings</h1>
                    <p className="text-muted-foreground mt-1">Manage your account security and authentication methods.</p>
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-1 space-y-4 text-sm">
                    <div className="bg-card p-4 rounded-xl border border-border/50">
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                            <Shield className="h-4 w-4 text-accent" /> Security Overview
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                            We recommend enabling Multi-Factor Authentication (MFA) to prevent unauthorized access to the staff portal.
                        </p>
                    </div>

                    <div className="bg-card p-4 rounded-xl border border-border/50">
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                            <Lock className="h-4 w-4 text-accent" /> Password Policy
                        </h3>
                        <ul className="text-muted-foreground space-y-1 ml-4 list-disc">
                            <li>Minimum 16 characters</li>
                            <li>Uppercase & lowercase</li>
                            <li>Numbers & symbols</li>
                        </ul>
                    </div>
                </div>

                <div className="md:col-span-2 space-y-8">
                    {isEnabled ? (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 flex items-start gap-4">
                            <div className="p-2 rounded-full bg-green-500/20 text-green-500">
                                <Shield className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-green-700 dark:text-green-400">Two-Factor Authentication is Active</h3>
                                <p className="text-sm text-green-600/80 dark:text-green-500/70 mt-1">
                                    Your account is protected with an additional security layer.
                                </p>
                                <Button variant="outline" className="mt-4 border-green-500/30 hover:bg-green-500/10 text-green-700 dark:text-green-400" disabled>
                                    Manage Recovery Codes
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <MfaSetup adminId={user.id} email={user.email || 'Admin'} />
                    )}

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                            <h3 className="font-bold text-amber-700 dark:text-amber-400 text-lg">Identity Verification</h3>
                        </div>
                        <p className="text-sm text-amber-600/80 dark:text-amber-500/70">
                            Staff accounts require higher security standards. Your login activity is being monitored for suspicious patterns.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
