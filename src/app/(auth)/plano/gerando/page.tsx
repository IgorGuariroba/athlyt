import { redirect } from "next/navigation";
/** Compatibilidade: geração exige consentimento explícito no resumo da triagem. */
export default function GerandoPlanoPage() {
  redirect("/triagem/resumo");
}
