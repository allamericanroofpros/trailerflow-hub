import { AdminLayout } from "./AdminLayout";

export default function AdminAnalytics() {
  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Growth metrics, MRR tracking, and system health. Charts will populate as the platform scales.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-6 h-64 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Organization growth chart — coming soon</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 h-64 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">MRR tracking — coming soon</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 h-64 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Active users over time — coming soon</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 h-64 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Order volume by org — coming soon</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
