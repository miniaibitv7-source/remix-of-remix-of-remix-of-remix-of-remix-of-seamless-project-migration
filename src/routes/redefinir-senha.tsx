import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Criar nova senha — Reinos de Lawl" },
      { name: "description", content: "Defina uma nova senha para entrar nos Reinos de Lawl." },
      { property: "og:title", content: "Criar nova senha — Reinos de Lawl" },
      { property: "og:description", content: "Defina uma nova senha para entrar nos Reinos de Lawl." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

// Opened from the e-mail link: the link proves e-mail ownership and signs the player in to choose a new password.
function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: d }) => setReady((r) => r || !!d.session));
    const t = setTimeout(() => setReady((r) => r ?? false), 4000);
    return () => { data.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setMsg("As senhas não conferem."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { setMsg("Não foi possível salvar a senha. Peça um novo link e tente de novo."); return; }
    setMsg("Senha criada! Abrindo seus personagens…");
    setTimeout(() => navigate({ to: "/" }), 1200);
  };

  const input = "w-full border-2 border-border bg-input px-3 py-3 text-foreground outline-none focus:border-primary";
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 font-mono">
      <form onSubmit={submit} className="w-full max-w-sm border-2 border-border bg-card p-6">
        <h1 className="text-center text-2xl font-bold text-primary">Criar nova senha</h1>
        {ready === false ? (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Este link expirou ou já foi usado. Volte e peça um novo em “Primeiro acesso ou esqueceu a senha?”.
          </p>
        ) : (
          <>
            <p className="mb-5 mt-1 text-center text-sm text-muted-foreground">Escolha a senha que vai usar para entrar.</p>
            <input className={input} type="password" required minLength={6} placeholder="Nova senha" value={password} onChange={(e) => setPassword(e.target.value)} disabled={!ready} />
            <input className={`${input} mt-3`} type="password" required minLength={6} placeholder="Repita a nova senha" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={!ready} />
            {msg && <p className="mt-3 text-sm text-primary">{msg}</p>}
            <button disabled={busy || !ready} className="mt-4 w-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">
              {busy ? "Aguarde…" : ready ? "Salvar senha" : "Verificando link…"}
            </button>
          </>
        )}
        <Link to="/" className="mt-4 block text-center text-xs text-muted-foreground hover:text-primary">Voltar ao início</Link>
      </form>
    </div>
  );
}
