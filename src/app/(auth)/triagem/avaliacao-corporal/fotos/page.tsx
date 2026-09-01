import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Lock } from "lucide-react";
import { AvisoAcao } from "@/components/tela/aviso-acao";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { obterPanoramaCorporal } from "@/domain/medicoes/repositorio";
import { configuracaoR2, criarStorageR2 } from "@/infra/storage";
import {
  enviarFotoCorporal,
  excluirFotoCorporal,
  excluirTodasFotosCorporais,
} from "./actions";
import { EnvioFotos } from "@/components/fotos/envio-fotos";

/**
 * As fotos seguem a mesma moldura das demais etapas da avaliação:
 * fundo `background`, margens de 24px, voltar circular no topo,
 * cabeçalho rótulo/título/
 * apoio e CTA principal ao pé da tela. As quatro poses são um único
 * cartão com divisores de 1px — pertencem à mesma unidade de
 * informação e a comparação depende de serem tratadas como conjunto,
 * e não como quatro campos soltos.
 *
 * O formulário de envio é cliente (`@/components/fotos/envio-fotos`)
 * porque as fotos precisam ser reduzidas no aparelho antes de virarem
 * corpo da Server Action.
 */

export default async function FotosAvaliacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const mensagens = await searchParams;
  const config = configuracaoR2();
  const panorama = await obterPanoramaCorporal(session.user.id);
  const urls = config
    ? await Promise.all(
        panorama.fotos.slice(0, 4).map(async (foto) => ({
          foto,
          url: await criarStorageR2(config).urlLeitura(foto.objectKey),
        })),
      )
    : [];

  return (
    <main className="flex flex-1 flex-col gap-6 bg-background px-6 py-8">
      <Link
        href="/triagem/avaliacao-corporal/gordura"
        aria-label="Voltar"
        className="-ml-3 flex size-11 items-center justify-center rounded-full text-on-surface-strong transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="size-8" aria-hidden="true" />
      </Link>

      <header className="flex flex-col gap-2">
        <p className="text-label-md font-semibold tracking-wide text-muted-foreground uppercase">
          Fotos opcionais
        </p>
        <h1 className="text-headline-md font-bold text-on-surface-strong">
          Comparação visual padronizada
        </h1>
        <p className="text-body-md leading-relaxed text-muted-foreground">
          O que torna duas fotos comparáveis é repetir pose, distância e
          iluminação. Envie as que conseguir agora — as demais podem vir depois.
        </p>
      </header>

      {/* Estes avisos vêm de ações da lista de fotos, que fica abaixo
          do formulário; `AvisoAcao` traz a mensagem ao campo de visão
          em vez de esperar que o usuário role até o topo. */}
      {mensagens.erro ? <AvisoAcao tipo="erro">{mensagens.erro}</AvisoAcao> : null}
      {mensagens.sucesso ? (
        <AvisoAcao tipo="sucesso">{mensagens.sucesso}</AvisoAcao>
      ) : null}

      {!config ? (
        <section className="flex gap-3 rounded-2xl border border-border bg-surface-container px-5 py-4">
          <Lock className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <strong className="text-title text-on-surface-strong">
              Cloudflare R2 ainda não configurado
            </strong>
            <p className="text-body-sm leading-relaxed text-muted-foreground">
              Preencha as quatro variáveis <code>R2_*</code> do <code>.env</code>.
              O bucket deve permanecer privado.
            </p>
          </div>
        </section>
      ) : (
        <EnvioFotos action={enviarFotoCorporal} />
      )}

      {urls.length ? (
        <section className="overflow-hidden rounded-2xl border border-border bg-surface-container">
          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
            <strong className="text-title text-on-surface-strong">
              Fotos privadas recentes
            </strong>
            <form action={excluirTodasFotosCorporais}>
              <Button type="submit" size="sm" variant="ghost" className="text-error">
                Excluir todas
              </Button>
            </form>
          </div>
          <ul className="grid gap-px border-t border-border bg-border">
            {urls.map(({ foto, url }) => (
              <li
                key={foto.id}
                className="flex items-center justify-between gap-3 bg-background px-5 py-3"
              >
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-body-sm text-on-surface underline decoration-border-strong underline-offset-4"
                >
                  Abrir {foto.pose.replaceAll("_", " ")} — link temporário
                </a>
                <form action={excluirFotoCorporal}>
                  <input type="hidden" name="fotoId" value={foto.id} />
                  {/* O nome acessível cita a pose: com quatro fotos na
                      lista, quatro botões "Excluir" idênticos não dizem
                      a quem lê por leitor de tela o que será apagado. */}
                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    aria-label={`Excluir foto ${foto.pose.replaceAll("_", " ")}`}
                  >
                    Excluir
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-auto flex flex-col gap-3">
        <Button asChild size="lg" variant="secondary" className="h-12 w-full">
          <Link href="/triagem/objetivo">Continuar</Link>
        </Button>
        <Button asChild variant="ghost" className="h-12 w-full">
          <Link href="/triagem/avaliacao-corporal/essenciais">
            Revisar medidas
          </Link>
        </Button>
      </div>
    </main>
  );
}
