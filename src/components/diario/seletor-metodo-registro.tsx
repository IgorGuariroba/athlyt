import Link from "next/link";
import { Camera, Keyboard, Mic, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ContextoRegistro {
  dia: string;
  refeicaoRef?: string | null;
}

/** Os quatro caminhos de registro compartilham exatamente o mesmo contexto. */
export function SeletorMetodoRegistro({ dia, refeicaoRef }: ContextoRegistro) {
  const query = new URLSearchParams({ dia });
  if (refeicaoRef) query.set("refeicao", refeicaoRef);
  const contexto = query.toString();

  const metodos = [
    { nome: "Foto", Icone: Camera, href: `/diario/registrar/foto?${contexto}` },
    { nome: "Texto", Icone: Keyboard, href: `/diario/registrar/descricao?${contexto}&metodo=texto` },
    { nome: "Áudio", Icone: Mic, href: `/diario/registrar/descricao?${contexto}&metodo=audio` },
    { nome: "Busca manual", Icone: Search, href: `/diario/registrar?${contexto}` },
  ];

  return (
    <section aria-label="Escolha como registrar a refeição" className="grid grid-cols-2 gap-2">
      {metodos.map(({ nome, Icone, href }) => (
        <Button key={nome} asChild variant="outline" className="h-14 justify-start">
          <Link href={href} aria-label={`Registrar por ${nome.toLocaleLowerCase("pt-BR")}`}>
            <Icone className="size-4" aria-hidden="true" /> {nome}
          </Link>
        </Button>
      ))}
    </section>
  );
}
