import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function Settings() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Definições</h1>
        <p className="text-muted-foreground">Gere as tuas preferências e conta</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Conta</CardTitle>
          <CardDescription>Informação do teu perfil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Nome</p>
            <p className="text-sm font-medium">
              {user?.user_metadata?.full_name ?? "—"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm font-medium">{user?.email ?? "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Provider</p>
            <p className="text-sm font-medium">Google OAuth</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
