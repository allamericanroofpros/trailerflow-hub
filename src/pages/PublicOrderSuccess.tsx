import { useParams, useSearchParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function PublicOrderSuccess() {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const orderNumber = params.get("order");

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="p-6 max-w-md w-full text-center space-y-3">
        <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
        <h1 className="text-xl font-bold">Order received!</h1>
        {orderNumber && <p className="text-sm">Order #{orderNumber}</p>}
        <p className="text-sm text-muted-foreground">
          The trailer has been notified. You'll pay at pickup for now — once the vendor
          connects Square, you'll be redirected to pay online here.
        </p>
        <Button asChild variant="outline">
          <Link to={`/order/${slug}`}>Back to menu</Link>
        </Button>
      </Card>
    </div>
  );
}
