import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

function obterIniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);

  if (partes.length === 0) return "A";
  if (partes.length === 1) return partes[0].slice(0, 2).toLocaleUpperCase("pt-BR");

  return `${partes[0][0]}${partes.at(-1)?.[0]}`.toLocaleUpperCase("pt-BR");
}

/**
 * Identidade compacta exibida no topo de telas de conta. O avatar claro,
 * nome forte e metadado recuado reproduzem a hierarquia da aba More do
 * MacroFactor sem transformar o perfil em outro cartão.
 */
export function PerfilUsuario({
  nome,
  detalhe,
  imagem,
}: {
  nome: string;
  detalhe?: string | null;
  imagem?: string | null;
}) {
  return (
    <section aria-label="Perfil" className="flex items-center gap-4">
      <Avatar className="size-20 bg-inverse-surface" aria-hidden="true">
        {imagem ? <AvatarImage src={imagem} alt="" /> : null}
        <AvatarFallback className="bg-inverse-surface text-title font-bold text-inverse-on-surface">
          {obterIniciais(nome)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-title font-bold text-on-surface-strong">
          {nome}
        </p>
        {detalhe ? (
          <p className="mt-1 truncate text-body-md text-muted-foreground">
            {detalhe}
          </p>
        ) : null}
      </div>
    </section>
  );
}
