"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { motion, AnimatePresence } from "framer-motion"

export function MobileNav() {
    const [isOpen, setIsOpen] = useState(false)

    const links = [
        { href: "/", label: "Home" },
        { href: "/trending", label: "Trending" },
        { href: "/submit", label: "Submit Feedback" },
        { href: "/track", label: "Track Submission" },
    ]

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" aria-label="Open menu">
                    <Menu className="h-6 w-6" />
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                    <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-4 mt-8">
                    <AnimatePresence>
                        {links.map((link, index) => (
                            <motion.div
                                key={link.href}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Link
                                    href={link.href}
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-lg font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                >
                                    {link.label}
                                </Link>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </nav>
            </SheetContent>
        </Sheet>
    )
}
