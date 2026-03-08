import { AdminLayout } from "./AdminLayout";

export default function AdminAnalytics() {
  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Platform Analytics</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Growth metrics, MRR tracking, and system health.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6 h-48 sm:h-64 flex items-center justify-center">
            <p className="text-xs sm:text-sm text-muted-foreground text-center">Organization growth chart — coming soon</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6 h-48 sm:h-64 flex items-center justify-center">
            <p className="text-xs sm:text-sm text-muted-foreground text-center">MRR tracking — coming soon</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6 h-48 sm:h-64 flex items-center justify-center">
            <p className="text-xs sm:text-sm text-muted-foreground text-center">Active users over time — coming soon</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6 h-48 sm:h-64 flex items-center justify-center">
            <p className="text-xs sm:text-sm text-muted-foreground text-center">Order volume by org — coming soon</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
