"use client";
const ErrorPage = ({ reset }: { reset: () => void }) => (
  <main className="grid min-h-screen place-content-center gap-4 p-8">
    <h1 className="text-xl font-semibold">Não foi possível carregar o BaseControl.</h1>
    <p className="text-muted-foreground">
      Verifique a conexão com o Neon e se as migrations foram aplicadas.
    </p>
    <button className="rounded-md bg-primary px-4 py-2 text-white" onClick={reset}>
      Tentar novamente
    </button>
  </main>
);
export default ErrorPage;
