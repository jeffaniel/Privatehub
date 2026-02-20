"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, CheckCircle2, Copy, AlertCircle, Loader2, RefreshCw, Key, Download } from "lucide-react"
import { toast } from "sonner"
import { generateMfaSecret, generateMfaQrCode, enableMfa } from "@/lib/mfa"
import { generateRecoveryCodes } from "@/lib/password-security"

interface MfaSetupProps {
    adminId: string
    email: string
}

export function MfaSetup({ adminId, email }: MfaSetupProps) {
    const [step, setStep] = useState<"initial" | "scanning" | "verifying" | "complete">("initial")
    const [secret, setSecret] = useState("")
    const [qrCodeUrl, setQrCodeUrl] = useState("")
    const [verificationCode, setVerificationCode] = useState("")
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    const startSetup = async () => {
        setIsLoading(true)
        setError("")
        try {
            const newSecret = generateMfaSecret()
            const qrUrl = await generateMfaQrCode(email, newSecret)
            setSecret(newSecret)
            setQrCodeUrl(qrUrl)
            setStep("scanning")
        } catch (err) {
            setError("Failed to initialize MFA setup")
        } finally {
            setIsLoading(false)
        }
    }

    const handleVerify = async () => {
        if (verificationCode.length !== 6) {
            setError("Please enter a 6-digit code")
            return
        }

        setIsLoading(true)
        setError("")
        try {
            // In a real app, you would verify the code on the server before enabling
            // For this implementation, we'll verify it here and then call the enableMfa action
            const { verifyMfaToken } = await import("@/lib/mfa")
            const isValid = verifyMfaToken(verificationCode, secret)

            if (!isValid) {
                setError("Invalid code. Please try again.")
                setIsLoading(false)
                return
            }

            const codes = generateRecoveryCodes(10)
            const success = await enableMfa(adminId, secret, codes)

            if (success) {
                setRecoveryCodes(codes)
                setStep("complete")
                toast.success("MFA enabled successfully")
            } else {
                setError("Failed to enable MFA in the database")
            }
        } catch (err) {
            setError("Verification failed")
        } finally {
            setIsLoading(false)
        }
    }

    const copyToClipboard = (text: string, message: string) => {
        navigator.clipboard.writeText(text)
        toast.success(message)
    }

    const downloadRecoveryCodes = () => {
        const content = `LincolnVoice Recovery Codes\nUser: ${email}\nDate: ${new Date().toLocaleDateString()}\n\n${recoveryCodes.join("\n")}\n\nKeep these codes in a secure place. They can be used to access your account if you lose your authenticator device.`
        const blob = new Blob([content], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "mfa-recovery-codes.txt"
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <Card className="glass-strong border-primary/20 shadow-xl overflow-hidden relative">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/20">
                        <Shield className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                        <CardTitle>Multi-Factor Authentication</CardTitle>
                        <CardDescription>Secure your account with TOTP</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <AnimatePresence mode="wait">
                    {step === "initial" && (
                        <motion.div
                            key="initial"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4 text-center py-6"
                        >
                            <div className="mx-auto h-20 w-20 bg-accent/10 rounded-full flex items-center justify-center mb-4">
                                <Shield className="h-10 w-10 text-accent opacity-50" />
                            </div>
                            <p className="text-muted-foreground">
                                MFA adds an extra layer of security to your account by requiring a code from an authenticator app.
                            </p>
                            <Button onClick={startSetup} disabled={isLoading} className="bg-accent text-accent-foreground">
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Enable MFA
                            </Button>
                        </motion.div>
                    )}

                    {step === "scanning" && (
                        <motion.div
                            key="scanning"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="text-center">
                                <p className="font-medium mb-4">Step 1: Scan the QR Code</p>
                                <div className="bg-white p-3 rounded-xl inline-block shadow-inner mx-auto">
                                    {qrCodeUrl ? (
                                        <img src={qrCodeUrl} alt="MFA QR Code" className="w-48 h-48" />
                                    ) : (
                                        <div className="w-48 h-48 flex items-center justify-center bg-gray-100">
                                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 rounded-lg bg-muted border border-border">
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Can't scan?</p>
                                    <div className="flex items-center justify-between gap-2">
                                        <code className="text-sm font-mono break-all">{secret}</code>
                                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(secret, "Secret copied")}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <Button onClick={() => setStep("verifying")} className="w-full">
                                    Next: Verify Code
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {step === "verifying" && (
                        <motion.div
                            key="verifying"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <div className="text-center mb-6">
                                <p className="font-medium">Step 2: Enter Verification Code</p>
                                <p className="text-sm text-muted-foreground mt-1">Enter the 6-digit code from your app to confirm</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="vcode">Verification Code</Label>
                                    <Input
                                        id="vcode"
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="000000"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                        className="text-center text-2xl tracking-[0.5em] h-14"
                                        autoFocus
                                    />
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                                        <AlertCircle className="h-4 w-4" />
                                        {error}
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setStep("scanning")} className="flex-1">
                                        Back
                                    </Button>
                                    <Button onClick={handleVerify} disabled={isLoading || verificationCode.length !== 6} className="flex-1 bg-accent text-accent-foreground">
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        Verify & Enable
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === "complete" && (
                        <motion.div
                            key="complete"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-6 text-center"
                        >
                            <div className="mx-auto h-16 w-16 bg-green-500/10 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="h-10 w-10 text-green-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">MFA Enabled!</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Your account is now protected with two-factor authentication.
                                </p>
                            </div>

                            <div className="text-left bg-muted p-4 rounded-xl border border-border">
                                <div className="flex items-center justify-between mb-3 underline decoration-accent/30 offset-2">
                                    <p className="text-xs font-bold uppercase flex items-center gap-1">
                                        <Key className="h-3 w-3 text-accent" /> Recovery Codes
                                    </p>
                                    <Button variant="ghost" size="sm" onClick={downloadRecoveryCodes} className="h-7 px-2 text-xs">
                                        <Download className="h-3 w-3 mr-1" /> Save as TXT
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {recoveryCodes.map((code) => (
                                        <div key={code} className="bg-background px-2 py-1 rounded border border-border/50 text-xs font-mono text-center">
                                            {code}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-3 italic">
                                    Keep these safely! Each code can be used once to bypass MFA if you lose your phone.
                                </p>
                            </div>

                            <Button onClick={() => window.location.reload()} className="w-full">
                                Close
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    )
}
