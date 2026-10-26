import { Link } from "react-router-dom";
import { Card } from "../components/ui/card";
import { buttonVariants } from "../components/ui/button";

export function NotFound() {
  return (
    <Card className="connection-state">
      <h2>Página não encontrada</h2>
      <Link className={buttonVariants()} to="/">
        Ir para a visão geral
      </Link>
    </Card>
  );
}
