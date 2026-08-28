import { cn } from "@/lib/utils";

export function PersonalizacaoPendente({ children }: { children: React.ReactNode }) { return <section aria-labelledby="personalizacao-titulo" className="overflow-hidden rounded-2xl border border-border bg-surface-container">{children}</section>; }
export function CartaoSessaoDoDia({ children, className }: { children: React.ReactNode; className?: string }) { return <section className={cn("overflow-hidden rounded-2xl border-2 border-on-surface-strong bg-surface-container", className)}>{children}</section>; }
export function CartaoSessaoDoDiaCorpo({ children }: { children: React.ReactNode }) { return <div className="p-5">{children}</div>; }
export function CartaoSessaoDoDiaAcao({ children }: { children: React.ReactNode }) { return <div className="flex min-h-14 w-full items-center justify-center bg-background text-base font-bold">{children}</div>; }
export function CartaoPlanoAtivo({ children, className }: { children: React.ReactNode; className?: string }) { return <section aria-labelledby="plano-ativo-titulo" className={cn("overflow-hidden rounded-2xl border border-border bg-surface-container", className)}>{children}</section>; }
export function CabecalhoPlanoAtivo({ children }: { children: React.ReactNode }) { return <div className="flex items-start justify-between p-5 pb-4">{children}</div>; }
export const CartaoPlanoAtivoCabecalho = CabecalhoPlanoAtivo;
export function MetricasPlanoAtivo({ children }: { children: React.ReactNode }) { return <div className="grid grid-cols-2 gap-px bg-border">{children}</div>; }
export const CartaoPlanoAtivoSecao = ({ children }: { children: React.ReactNode }) => <div className="border-t border-border p-5">{children}</div>;
