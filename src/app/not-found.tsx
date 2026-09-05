import Link from "next/link";
const NotFound = () => (
  <main className="grid min-h-screen place-content-center gap-4 text-center">
    <h1 className="text-2xl font-semibold">Página não encontrada</h1>
    <Link className="text-primary" href="/dashboard">
      Voltar ao dashboard
    </Link>
  </main>
);
export default NotFound;
