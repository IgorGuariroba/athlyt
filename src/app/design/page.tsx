import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Apple,
  Dumbbell,
  Clock3,
  Flame,
  GitBranch,
  Layers3,
  LogOut,
  RefreshCw,
  Ruler,
  Scale,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { DemoCapturaFoto } from "./demo-captura-foto";
import {
  BarraFaixa,
  BarraMacro,
  CabecalhoCartaoLista,
  CabecalhoSecao,
  CabecalhoTela,
  CampoSelecao,
  CartaoCheckbox,
  CartaoLista,
  CartaoRadio,
  CartaoSelecaoImagem,
  CascataShell,
  ChipSelecao,
  ControleSegmentado,
  EstadoVazio,
  ExplicacaoAgent,
  FaixaDados,
  GraficoTendencia,
  ItemAcaoNavegacao,
  ItemNavegacao,
  LinhaCartaoLista,
  LinhaTempoProgresso,
  LinhasCartaoLista,
  ListaNavegacao,
  MedidorScore,
  Metrica,
  NotaTela,
  PainelMetricas,
  PainelPendencias,
  PerfilUsuario,
  PorQueIsso,
  Revelar,
  SecoesTela,
  SeloVariacao,
  SparklineTendencia,
  TelaConteudo,
  calcularDeltaTendencia,
} from "@/components/tela";
import { TransicaoEtapa } from "@/components/tela/transicao-etapa";

import {
  AvisosDemonstracao,
  ControlesSelecao,
  FaixaDemonstracao,
  MenuSuspenso,
  RoletaDemonstracao,
} from "./galeria-interativa";

export const metadata: Metadata = {
  title: "Galeria de componentes — Athlyt",
  description:
    "Referência visual dos tokens e componentes do MacroFactor Visual System.",
  robots: { index: false, follow: false },
};

/**
 * Galeria visual do design system (DESIGN.md > MacroFactor Visual
 * System). Serve como referência única para conferir tokens e
 * componentes lado a lado antes de compor uma tela nova — é a versão
 * renderizada do catálogo listado por `ui_catalogo`.
 *
 * A página é somente de leitura e não faz parte do casco autenticado:
 * fica fora de `(app)` justamente para não herdar a `BottomNav` e não
 * ser confundida com uma aba do produto.
 *
 * **Só existe em desenvolvimento.** Em produção a rota responde 404: é
 * ferramenta de construção, não superfície do produto, e uma galeria
 * pública seria uma rota sem sessão que ninguém mantém. O `notFound()`
 * aqui é a trava efetiva — o proxy apenas evita o redirecionamento para
 * a tela de boas-vindas antes de chegarmos a este ponto.
 */
const EM_DESENVOLVIMENTO = process.env.NODE_ENV !== "production";

/** Uma única explicação nas três apresentações: a diferença está no
 * peso de atenção que cada tela pode cobrar, não no conteúdo. */
const EXPLICACAO_EXEMPLO = {
  porque:
    "Escolhi o supino com halteres porque sua academia não tem barra livre e o halter poupa seu ombro direito.",
  dadosUsados: [
    { campo: "equipamentos", valor: "halteres, banco" },
    { campo: "lesoes", valor: "ombro direito" },
  ],
};


const PRIMITIVOS = [
  { nome: "neutral-950 / background", classe: "bg-background" },
  { nome: "neutral-900 / surface", classe: "bg-surface" },
  { nome: "neutral-850 / surface-container", classe: "bg-surface-container" },
  {
    nome: "neutral-800 / surface-container-high",
    classe: "bg-surface-container-high",
  },
  { nome: "neutral-700 / border", classe: "bg-border" },
  { nome: "neutral-600 / border-strong", classe: "bg-border-strong" },
  { nome: "neutral-500 / muted", classe: "bg-muted-foreground" },
  { nome: "neutral-100 / on-surface", classe: "bg-on-surface" },
  { nome: "white / on-surface-strong", classe: "bg-on-surface-strong" },
] as const;

const SEMANTICAS = [
  { nome: "success", classe: "bg-success", uso: "Dentro da faixa, salvo" },
  { nome: "warning", classe: "bg-warning", uso: "Atenção, limite próximo" },
  { nome: "error", classe: "bg-error", uso: "Falha, fora da faixa" },
  { nome: "info", classe: "bg-info", uso: "Contexto neutro" },
] as const;

const DADOS = [
  { nome: "nutrition-protein", classe: "bg-nutrition-protein" },
  { nome: "nutrition-fat", classe: "bg-nutrition-fat" },
  { nome: "nutrition-carbs", classe: "bg-nutrition-carbs" },
  { nome: "nutrition-calories", classe: "bg-nutrition-calories" },
  { nome: "data-violet", classe: "bg-data-violet" },
] as const;

const TIPOGRAFIA = [
  { token: "display", classe: "text-display", nota: "40/44 · 700" },
  { token: "headline-lg", classe: "text-headline-lg", nota: "28/32 · 700" },
  { token: "headline-md", classe: "text-headline-md", nota: "22/28 · 700" },
  { token: "title", classe: "text-title", nota: "18/24 · 700" },
  { token: "body-lg", classe: "text-body-lg", nota: "16/24 · 400" },
  { token: "body-md", classe: "text-body-md", nota: "14/20 · 400" },
  { token: "body-sm", classe: "text-body-sm", nota: "12/16 · 400" },
  { token: "label-lg", classe: "text-label-lg", nota: "14/20 · 600" },
  { token: "label-md", classe: "text-label-md", nota: "12/16 · 600" },
  { token: "caption", classe: "text-caption", nota: "10/14 · 500" },
] as const;

const ESPACAMENTOS = [
  { token: "1", classe: "w-1", valor: "4px" },
  { token: "2", classe: "w-2", valor: "8px" },
  { token: "3", classe: "w-3", valor: "12px" },
  { token: "4", classe: "w-4", valor: "16px" },
  { token: "5", classe: "w-5", valor: "20px" },
  { token: "6", classe: "w-6", valor: "24px" },
  { token: "8", classe: "w-8", valor: "32px" },
  { token: "10", classe: "w-10", valor: "40px" },
  { token: "12", classe: "w-12", valor: "48px" },
  { token: "16", classe: "w-16", valor: "64px" },
] as const;

const RAIOS = [
  { token: "radius-sm", classe: "rounded-sm" },
  { token: "radius-md", classe: "rounded-md" },
  { token: "radius-lg", classe: "rounded-lg" },
  { token: "radius-xl", classe: "rounded-xl" },
  { token: "radius-2xl", classe: "rounded-2xl" },
  { token: "radius-pill", classe: "rounded-pill" },
] as const;

const VARIANTES_BOTAO = [
  "default",
  "outline",
  "secondary",
  "ghost",
  "destructive",
  "link",
] as const;

const TAMANHOS_BOTAO = ["xs", "sm", "default", "lg"] as const;

const VARIANTES_BADGE = [
  "default",
  "secondary",
  "destructive",
  "outline",
  "ghost",
] as const;

const ICONES = [
  { nome: "16px · inline", classe: "size-4" },
  { nome: "20px · botões", classe: "size-5" },
  { nome: "24px · ações", classe: "size-6" },
] as const;

const hoje = new Date(2026, 1, 1);
const diasAtras = (dias: number) =>
  new Date(hoje.getTime() - dias * 24 * 60 * 60 * 1000);

const SERIE_PESO = [
  { data: diasAtras(42), valor: 82.4 },
  { data: diasAtras(35), valor: 81.9 },
  { data: diasAtras(28), valor: 81.2 },
  { data: diasAtras(21), valor: 80.8 },
  { data: diasAtras(14), valor: 80.1 },
  { data: diasAtras(7), valor: 79.4 },
  { data: hoje, valor: 78.5 },
];

/** Bloco de exemplo com título e nota de uso, o ritmo repetido da galeria. */
function Amostra({
  titulo,
  nota,
  children,
}: {
  titulo: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <CabecalhoSecao titulo={titulo} descricao={nota} />
      {children}
    </section>
  );
}

export default function GaleriaDesignPage() {
  if (!EM_DESENVOLVIMENTO) {
    notFound();
  }

  return (
    <TelaConteudo>
      <CabecalhoTela
        contexto="Referência interna"
        titulo="Galeria de componentes"
        descricao="Tokens e componentes do MacroFactor Visual System renderizados lado a lado. Use como conferência antes de compor uma tela."
        acao={<Badge variant="outline">v1.0.0</Badge>}
      />

      <SecoesTela>
        {/* 1. Foundations ------------------------------------------------ */}
        <Amostra
          titulo="Cores — neutros"
          nota="O preto é estrutural. Superfícies sobem por contraste, não por sombra."
        >
          <CartaoLista>
            <LinhasCartaoLista>
              {PRIMITIVOS.map((cor) => (
                <LinhaCartaoLista
                  key={cor.nome}
                  titulo={cor.nome}
                  valor={
                    <span
                      aria-hidden="true"
                      className={`block size-8 rounded-md border border-border ${cor.classe}`}
                    />
                  }
                />
              ))}
            </LinhasCartaoLista>
          </CartaoLista>
        </Amostra>

        <Amostra
          titulo="Cores — semânticas"
          nota="Estado nunca é comunicado apenas por cor; sempre acompanha texto ou ícone."
        >
          <CartaoLista>
            <LinhasCartaoLista>
              {SEMANTICAS.map((cor) => (
                <LinhaCartaoLista
                  key={cor.nome}
                  titulo={cor.nome}
                  meta={cor.uso}
                  valor={
                    <span
                      aria-hidden="true"
                      className={`block size-8 rounded-md ${cor.classe}`}
                    />
                  }
                />
              ))}
            </LinhasCartaoLista>
          </CartaoLista>
        </Amostra>

        <Amostra
          titulo="Cores — dados e nutrientes"
          nota="Cor de nutriente é significado, não ornamento: a mesma cor identifica o mesmo macro em toda a interface."
        >
          <div className="flex flex-wrap gap-3">
            {DADOS.map((cor) => (
              <div key={cor.nome} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`block size-5 rounded-pill ${cor.classe}`}
                />
                <span className="text-body-sm text-muted-foreground">
                  {cor.nome}
                </span>
              </div>
            ))}
          </div>
        </Amostra>

        <Amostra
          titulo="Tipografia"
          nota="Títulos em sentence case; caixa alta só em eyebrow de seção."
        >
          <div className="flex flex-col gap-4">
            {TIPOGRAFIA.map((item) => (
              <div key={item.token} className="flex flex-col gap-1">
                <span className="text-caption text-muted-foreground">
                  {item.token} · {item.nota}
                </span>
                <span className={`${item.classe} text-on-surface-strong`}>
                  Coach adaptativo
                </span>
              </div>
            ))}
          </div>
        </Amostra>

        <Amostra
          titulo="Espaçamento"
          nota="Escala de 4px. Padding de cartão 16px, gap de seção 24px, gap inline 8px."
        >
          <div className="flex flex-col gap-2">
            {ESPACAMENTOS.map((espaco) => (
              <div key={espaco.token} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-caption tabular-nums text-muted-foreground">
                  space-{espaco.token}
                </span>
                <span
                  aria-hidden="true"
                  className={`block h-3 rounded-xs bg-on-surface ${espaco.classe}`}
                />
                <span className="text-caption tabular-nums text-muted-foreground">
                  {espaco.valor}
                </span>
              </div>
            ))}
          </div>
        </Amostra>

        <Amostra
          titulo="Raios"
          nota="Cartões e campos em raio pequeno; pill reservado a chips, segmented e avatares."
        >
          <div className="flex flex-wrap gap-4">
            {RAIOS.map((raio) => (
              <div key={raio.token} className="flex flex-col items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`block size-14 border border-border-strong bg-surface-container ${raio.classe}`}
                />
                <span className="text-caption text-muted-foreground">
                  {raio.token}
                </span>
              </div>
            ))}
          </div>
        </Amostra>

        <Amostra
          titulo="Elevação"
          nota="Profundidade vem de superfície e borda, não de sombra — a interface é dark-first."
        >
          <div className="flex flex-col gap-2">
            {[
              { nivel: "Nível 0 · página", classe: "bg-background" },
              { nivel: "Nível 1 · superfície", classe: "bg-surface" },
              { nivel: "Nível 2 · cartão", classe: "bg-surface-container" },
              {
                nivel: "Nível 3 · popover / modal",
                classe: "bg-surface-container-high",
              },
            ].map((nivel) => (
              <div
                key={nivel.nivel}
                className={`rounded-lg border border-border px-4 py-3 text-body-sm text-on-surface ${nivel.classe}`}
              >
                {nivel.nivel}
              </div>
            ))}
          </div>
        </Amostra>

        <Amostra
          titulo="Ícones"
          nota="Família única (lucide), peso uniforme, alinhados ao texto."
        >
          <div className="flex items-end gap-6">
            {ICONES.map((icone) => (
              <div key={icone.nome} className="flex flex-col items-center gap-2">
                <Dumbbell
                  aria-hidden="true"
                  className={`${icone.classe} text-on-surface`}
                />
                <span className="text-caption text-muted-foreground">
                  {icone.nome}
                </span>
              </div>
            ))}
          </div>
        </Amostra>

        {/* 2. Componentes ------------------------------------------------ */}
        <Amostra
          titulo="Botões — variantes"
          nota="Um CTA principal por viewport; secundárias recuam visualmente."
        >
          <div className="flex flex-wrap items-center gap-3">
            {VARIANTES_BOTAO.map((variante) => (
              <Button key={variante} variant={variante}>
                {variante}
              </Button>
            ))}
          </div>
        </Amostra>

        <Amostra titulo="Botões — tamanhos e estados">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {TAMANHOS_BOTAO.map((tamanho) => (
                <Button key={tamanho} size={tamanho}>
                  {tamanho}
                </Button>
              ))}
              <Button size="icon" aria-label="Ação com ícone">
                <Flame aria-hidden="true" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled>Desabilitado</Button>
              <Button variant="outline" disabled>
                Desabilitado outline
              </Button>
              <Button>
                <Scale aria-hidden="true" />
                Com ícone
              </Button>
            </div>
            <Button size="cta">CTA principal (48px)</Button>
          </div>
        </Amostra>

        <Amostra titulo="Badges">
          <div className="flex flex-wrap items-center gap-2">
            {VARIANTES_BADGE.map((variante) => (
              <Badge key={variante} variant={variante}>
                {variante}
              </Badge>
            ))}
          </div>
        </Amostra>

        <Amostra
          titulo="Campos de formulário"
          nota="Altura mínima de 48px, unidade próxima do valor, ajuda abaixo do campo."
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="galeria-peso">Peso de hoje</Label>
              <Input id="galeria-peso" placeholder="78,5 kg" inputMode="decimal" />
              <p className="text-body-sm text-muted-foreground">
                Registre sempre no mesmo horário para reduzir ruído.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="galeria-erro">Altura</Label>
              <Input id="galeria-erro" defaultValue="0" aria-invalid />
              <p className="text-body-sm text-error">
                Informe um valor entre 120 e 230 cm.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="galeria-obs">Observações da sessão</Label>
              <Textarea
                id="galeria-obs"
                rows={3}
                placeholder="Como foi o treino?"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="galeria-desab">Campo desabilitado</Label>
              <Input id="galeria-desab" defaultValue="Somente leitura" disabled />
            </div>
          </div>
        </Amostra>

        <Amostra titulo="Seleção">
          <ControlesSelecao />
        </Amostra>

        <Amostra
          titulo="Cartões de opção"
          nota="Opção destacada da cascata, com ícone, descrição e controle circular."
        >
          <RadioGroup defaultValue="recomposicao" className="flex flex-col gap-3">
            <CartaoRadio
              id="galeria-objetivo-recomposicao"
              value="recomposicao"
              titulo="Recomposição corporal"
              descricao="Reduzir gordura e desenvolver massa muscular a partir da sua linha de base."
              Icone={RefreshCw}
            />
            <CartaoRadio
              id="galeria-objetivo-gordura"
              value="perder-gordura"
              titulo="Priorizar perda de gordura"
              descricao="Preservar o máximo de massa muscular."
              Icone={Flame}
            />
          </RadioGroup>
          <div className="mt-3">
            <CartaoCheckbox
              id="galeria-disponibilidade-segunda"
              name="dias"
              value="segunda"
              titulo="Segunda-feira"
              descricao="Disponível para treino"
              defaultChecked
            />
          </div>
        </Amostra>

        <Amostra
          titulo="Cartão de seleção com imagem"
          nota="Catálogos visuais em linha: miniatura, rótulo e controle formam um único alvo de toque."
        >
          <CartaoSelecaoImagem
            id="galeria-equipamento-halteres"
            name="galeria-equipamentos"
            value="halteres"
            rotulo="Halteres"
            src="/equipamentos/personalizado.svg"
            defaultChecked
          />
        </Amostra>

        <Amostra
          titulo="Captura de foto"
          nota="Câmera traseira em um toque e galeria como alternativa, com prévia antes do envio. Usada no registro de refeição por foto."
        >
          <DemoCapturaFoto />
        </Amostra>

        <Amostra
          titulo="Moldura de cascata"
          nota="Progresso, retorno, título e transição usados nas perguntas da triagem."
        >
          <CascataShell
            titulo="Qual é o seu objetivo atual?"
            indice={5}
            total={14}
            elemento="section"
          >
            <p className="text-body-sm text-muted-foreground">
              Conteúdo variável da etapa.
            </p>
          </CascataShell>
          <TransicaoEtapa indice={5}>
            <span className="sr-only">Demonstração da transição entre etapas</span>
          </TransicaoEtapa>
        </Amostra>

        <Amostra
          titulo="Campo de seleção"
          nota="Lista fechada com a roda nativa do sistema, mas altura, superfície e chevron do produto."
        >
          <div className="flex flex-col gap-4">
            <CampoSelecao
              id="galeria-metodo"
              rotulo="Método da medição"
              descricao="Trocar de aparelho muda o número sem que o corpo tenha mudado."
              opcoes={[
                { valor: "bioimpedancia", rotulo: "Bioimpedância" },
                { valor: "adipometro", rotulo: "Adipômetro" },
                { valor: "dexa", rotulo: "DEXA/DXA" },
              ]}
            />
            <CampoSelecao
              compacto
              id="galeria-periodo-filtro"
              rotulo="Filtro compacto"
              opcoes={[
                { valor: "7", rotulo: "7 dias" },
                { valor: "30", rotulo: "30 dias" },
              ]}
            />
          </div>
        </Amostra>

        <Amostra
          titulo="Controle de faixa"
          nota="Ajuste contínuo e aproximado — zoom, opacidade. Para grandezas precisas, use a roleta."
        >
          <FaixaDemonstracao />
        </Amostra>

        <Amostra
          titulo="Chips"
          nota="Seleção múltipla com alvo de 44px; estado na superfície e na borda."
        >
          <div className="flex flex-wrap gap-2">
            {[
              { valor: "supino", rotulo: "Supino", marcado: true },
              { valor: "agachamento", rotulo: "Agachamento", marcado: true },
              { valor: "remada", rotulo: "Remada", marcado: false },
              { valor: "terra", rotulo: "Levantamento terra", marcado: false },
            ].map((chip) => (
              <ChipSelecao
                key={chip.valor}
                id={`galeria-chip-${chip.valor}`}
                name="galeria-exercicios"
                value={chip.valor}
                rotulo={chip.rotulo}
                defaultChecked={chip.marcado}
              />
            ))}
          </div>
        </Amostra>

        <Amostra
          titulo="Controle segmentado"
          nota="O estado alternado vive na URL — a tela continua endereçável."
        >
          <ControleSegmentado
            rotulo="Período do gráfico"
            opcoes={[
              { valor: "30", rotulo: "30d", href: "/design?periodo=30", ativo: false },
              { valor: "90", rotulo: "90d", href: "/design?periodo=90", ativo: true },
              { valor: "365", rotulo: "1a", href: "/design?periodo=365", ativo: false },
            ]}
          />
        </Amostra>

        <Amostra titulo="Menu suspenso">
          <MenuSuspenso />
        </Amostra>

        <Amostra
          titulo="Lista de navegação"
          nota="Destinos agrupados em um cartão com divisores; a linha inteira é o alvo. Padrão do “More” do MacroFactor."
        >
          <ListaNavegacao>
            <ItemNavegacao
              href="/design"
              Icone={GitBranch}
              rotulo="Trilhas de Decisão"
              descricao="Dados e regras por trás de cada recomendação"
            />
            <ItemNavegacao
              href="/design"
              Icone={ShieldCheck}
              rotulo="Consentimentos"
            />
            <ItemNavegacao
              href="/design"
              Icone={RefreshCw}
              rotulo="Sincronização"
              valor="3"
            />
            <ItemAcaoNavegacao
              acao="/design"
              Icone={LogOut}
              rotulo="Sair"
            />
          </ListaNavegacao>
        </Amostra>

        <Amostra
          titulo="Perfil de usuário"
          nota="Identidade diretamente sobre o fundo, antes dos grupos de configurações."
        >
          <PerfilUsuario
            nome="Atleta Athlyt"
            detalhe="atleta@athlyt.com"
          />
        </Amostra>

        <Amostra
          titulo="Painel de métricas"
          nota="Faixa de 2 a 4 números de resumo; unidade junto do valor, rótulo abaixo."
        >
          <PainelMetricas>
            <Metrica Icone={Clock3} valor={52} unidade="m" rotulo="Duração" />
            <Metrica Icone={Layers3} valor={18} rotulo="Séries" />
            <Metrica Icone={Dumbbell} valor={4820} unidade=" kg" rotulo="Volume" />
          </PainelMetricas>
        </Amostra>

        <Amostra
          titulo="Medidor de score"
          nota="A cor não classifica o resultado: pintar de vermelho um score baixo adicionaria julgamento."
        >
          <div className="flex flex-col gap-4">
            <MedidorScore rotulo="Aderência" valor={86} />
            <MedidorScore rotulo="Desempenho" valor={62} />
            <MedidorScore rotulo="Recuperação" valor={34} />
          </div>
        </Amostra>

        <Amostra titulo="Avatares">
          <div className="flex items-center gap-6">
            <Avatar size="sm">
              <AvatarFallback>AT</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>MV</AvatarFallback>
            </Avatar>
            <Avatar size="lg">
              <AvatarFallback>JS</AvatarFallback>
            </Avatar>
            <AvatarGroup>
              <Avatar>
                <AvatarFallback>AT</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>MV</AvatarFallback>
              </Avatar>
              <AvatarGroupCount>+3</AvatarGroupCount>
            </AvatarGroup>
          </div>
        </Amostra>

        <Amostra
          titulo="Cartão"
          nota="Cartão agrupa; divisores separam. Não transforme cada linha em cartão."
        >
          <Card>
            <CardHeader>
              <CardTitle>Aderência da semana</CardTitle>
              <CardDescription>
                Sete dias comparados à prescrição vigente.
              </CardDescription>
              <CardAction>
                <Badge variant="secondary">86%</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Progress value={86} />
              <p className="text-body-sm text-muted-foreground">
                Seis registros completos de sete dias.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm">
                Ver detalhamento
              </Button>
            </CardFooter>
          </Card>
        </Amostra>

        <Amostra
          titulo="Cartão de lista"
          nota="Itens homogêneos separados por divisor de 1px, métrica alinhada à direita."
        >
          <CartaoLista>
            <CabecalhoCartaoLista
              indicador={1}
              titulo="Treino A — Empurrar"
              meta="4 exercícios · 52 min estimados"
              Icone={Dumbbell}
            />
            <LinhasCartaoLista>
              <LinhaCartaoLista
                titulo="Supino reto"
                meta="Peito · barra"
                valor="3×8"
              >
                <FaixaDados>72,5 kg · RIR 2 · descanso 120 s</FaixaDados>
              </LinhaCartaoLista>
              <LinhaCartaoLista
                titulo="Desenvolvimento militar"
                meta="Ombros · halteres"
                valor="3×10"
              >
                <FaixaDados>22 kg · RIR 2 · descanso 90 s</FaixaDados>
              </LinhaCartaoLista>
              <LinhaCartaoLista
                titulo="Tríceps na polia"
                meta="Tríceps · cabo"
                valor="3×12"
              />
            </LinhasCartaoLista>
          </CartaoLista>
        </Amostra>

        <Amostra
          titulo="Painel de pendências"
          nota="Limitação persistente com contexto, pendências em linhas legíveis e uma única ação de resolução."
        >
          <PainelPendencias
            titulo="Complete seu perfil"
            descricao="Saia do Modo Conservador e receba orientações ajustadas aos seus dados."
            itens={[
              {
                id: "idade",
                titulo: "Idade",
                descricao: "Cálculo de necessidades energéticas ajustado à idade",
              },
              {
                id: "objetivo",
                titulo: "Objetivo",
                descricao: "Priorização de desempenho e composição corporal",
              },
              {
                id: "disponibilidade",
                titulo: "Disponibilidade semanal",
                descricao: "Divisão de treino executável na sua rotina",
              },
            ]}
            acao={<Button size="lg">Completar perfil</Button>}
          />
        </Amostra>

        <Amostra
          titulo="Barras de macro"
          nota="Cada macro mantém sua cor e a contribuição calórica é explícita."
        >
          <CartaoLista>
            <CabecalhoCartaoLista
              titulo="Almoço"
              meta="720 kcal"
              Icone={Apple}
            />
            <LinhasCartaoLista>
              <LinhaCartaoLista titulo="Distribuição">
                <div className="flex flex-col gap-2">
                  <BarraMacro macro="proteina" gramas={48} caloriasTotais={720} />
                  <BarraMacro
                    macro="carboidratos"
                    gramas={82}
                    caloriasTotais={720}
                  />
                  <BarraMacro macro="gorduras" gramas={22} caloriasTotais={720} />
                </div>
              </LinhaCartaoLista>
            </LinhasCartaoLista>
          </CartaoLista>
        </Amostra>

        <Amostra
          titulo="Barra de faixa"
          nota="Posição atual, meta e faixa ideal na mesma escala, com resumo textual."
        >
          <BarraFaixa
            rotuloAcessivel="Peso atual de 78,5 kg, meta de 76 kg, faixa ideal entre 74 e 80 kg."
            atual={78.5}
            min={70}
            max={86}
            meta={76}
            unidade="kg"
          />
        </Amostra>

        <Amostra
          titulo="Gráfico de tendência"
          nota="Séries comparáveis dividem o mesmo eixo; unidade e contexto temporal nunca somem."
        >
          <GraficoTendencia
            titulo="Peso corporal"
            unidade="kg"
            series={[{ nome: "Tendência", valores: SERIE_PESO }]}
          />
        </Amostra>

        <Amostra
          titulo="Indicadores compactos de tendência"
          nota="Sparkline apoia uma métrica já escrita; o selo sempre explicita direção, magnitude e janela sem julgar por cor."
        >
          <CartaoLista className="flex flex-col gap-3 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-label-lg text-on-surface-strong">
                Peso de tendência
              </span>
              <SeloVariacao
                delta={calcularDeltaTendencia(SERIE_PESO)}
                unidade="kg"
                porSemana
              />
            </div>
            <SparklineTendencia
              serie={SERIE_PESO}
              cor="text-nutrition-calories"
              className="h-14"
            />
          </CartaoLista>
          <CartaoLista className="mt-3 px-2 py-2">
            <LinhaTempoProgresso
              eventos={[
                {
                  data: hoje,
                  titulo: "Peso",
                  detalhe: "78,5 kg",
                },
                {
                  data: diasAtras(7),
                  titulo: "Cintura",
                  detalhe: "82,1 cm",
                },
              ]}
            />
          </CartaoLista>
        </Amostra>

        <Amostra
          titulo="Roleta de valor"
          nota="Entrada por gesto para grandezas contínuas: arrasto 1:1, inércia e encaixe no tique."
        >
          <RoletaDemonstracao />
        </Amostra>

        <Amostra
          titulo="Feedback de ação"
          nota="A mensagem aparece onde a ação foi disparada e se traz para o campo de visão."
        >
          <AvisosDemonstracao />
        </Amostra>

        <Amostra
          titulo="Progresso"
          nota="Barra fina, sem percentual decorativo — o número acompanha o rótulo."
        >
          <div className="flex flex-col gap-4">
            <Progress value={25} />
            <Progress value={60} />
            <Progress value={100} />
          </div>
        </Amostra>

        <Amostra
          titulo="Disclosure"
          nota="Detalhes de cálculo e ressalvas ficam colapsados, não escondidos."
        >
          <div className="flex flex-col gap-4">
            <Revelar rotulo="Como este número é calculado">
              A tendência usa média móvel exponencial sobre os registros dos
              últimos 14 dias, o que reduz o efeito de variação de água e
              conteúdo intestinal.
            </Revelar>
            <PorQueIsso
              explicacao={{
                porque:
                  "Estimei sua manutenção a partir de 80 kg, 180 cm e 35 anos, com atividade moderada.",
                dadosUsados: [
                  { campo: "pesoKg", valor: "80 kg" },
                  { campo: "alturaCm", valor: "180 cm" },
                  { campo: "idadeAnos", valor: "35 anos" },
                ],
              }}
            />
            <Revelar rotulo="Trocar exercício" Icone={Ruler}>
              Substituições mantêm o padrão de movimento e a faixa de repetições
              prescrita.
            </Revelar>
          </div>
        </Amostra>

        <Amostra
          titulo="Explicação do agent"
          nota="A mesma explicação, com três pesos de atenção. Fechado é o padrão; aberto só quando o atleta está prestes a divergir do plano; ícone só sob carga física, sem os pares campo/valor."
        >
          <div className="flex flex-col gap-4">
            <ExplicacaoAgent
              pergunta="Por que este exercício?"
              explicacao={EXPLICACAO_EXEMPLO}
            />
            <ExplicacaoAgent
              pergunta="Por que esta refeição?"
              explicacao={EXPLICACAO_EXEMPLO}
              apresentacao="aberto"
            />
            <ExplicacaoAgent
              pergunta="Por que este exercício?"
              explicacao={EXPLICACAO_EXEMPLO}
              apresentacao="icone"
            />
          </div>
        </Amostra>

        <Amostra
          titulo="Estado vazio"
          nota="Explica a causa e oferece a próxima ação, sem linguagem punitiva."
        >
          <div className="flex flex-col gap-4">
            <EstadoVazio
              Icone={TrendingUp}
              titulo="Sem registros no período"
              descricao="A tendência aparece a partir do segundo registro comparável."
              acao={
                <Button variant="outline" size="sm">
                  Registrar peso
                </Button>
              }
            />
            <EstadoVazio
              titulo="Sem ação disponível"
              descricao="Quando nada pode ser feito agora, o estado explica a causa e para por aí."
            />
          </div>
        </Amostra>
      </SecoesTela>

      <NotaTela>
        Página de referência interna, fora do casco autenticado e não indexada.
        A fonte normativa continua sendo <code>DESIGN.md</code>; quando um caso
        não couber nos componentes acima, ajuste o componente em{" "}
        <code>src/components/</code> para que a correção alcance todas as telas.
      </NotaTela>
    </TelaConteudo>
  );
}
