import { useAuth } from "@/hooks/useAuth";
import Auth from "./Auth";
import { Scale, Clock, ShieldX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Navigate } from "react-router-dom";

export default function Index() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Scale className="h-10 w-10 animate-pulse text-primary" />
      </div>
    );
  }

  if (!user) return <Auth />;

  if (profile?.status === "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md animate-fade-in">
          <CardContent className="pt-8 text-center space-y-4">
            <Clock className="mx-auto h-12 w-12 text-warning" />
            <h2 className="font-display text-2xl font-bold">Aguardando Aprovação</h2>
            <p className="text-muted-foreground">
              Seu cadastro foi recebido e está aguardando aprovação do administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profile?.status === "rejected") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md animate-fade-in">
          <CardContent className="pt-8 text-center space-y-4">
            <ShieldX className="mx-auto h-12 w-12 text-destructive" />
            <h2 className="font-display text-2xl font-bold">Acesso Negado</h2>
            <p className="text-muted-foreground">
              Seu acesso foi negado pelo administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <Navigate to="/home" replace />;
}
