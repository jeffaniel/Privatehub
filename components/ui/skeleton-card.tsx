export function SkeletonCard() {
    return (
        <div className="rounded-xl border border-border bg-card p-5 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/4 mb-2" />
            <div className="h-5 bg-muted rounded w-3/4 mb-3" />
            <div className="h-4 bg-muted rounded w-1/2" />
        </div>
    )
}

export function SkeletonSubmission() {
    return (
        <div className="rounded-xl border border-border bg-card p-6 animate-pulse space-y-4">
            <div className="flex items-center justify-between">
                <div className="h-6 bg-muted rounded w-1/3" />
                <div className="h-5 bg-muted rounded w-20" />
            </div>
            <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-5/6" />
                <div className="h-4 bg-muted rounded w-4/6" />
            </div>
            <div className="flex gap-4">
                <div className="h-8 bg-muted rounded w-20" />
                <div className="h-8 bg-muted rounded w-20" />
            </div>
        </div>
    )
}
