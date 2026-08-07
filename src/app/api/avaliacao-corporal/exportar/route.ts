import { auth } from "@/auth";
import { obterPanoramaCorporal } from "@/domain/medicoes/repositorio";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ erro: "Não autenticado" }, { status: 401 });
  const panorama = await obterPanoramaCorporal(session.user.id);
  const exportacao = {
    exportadoEm: new Date().toISOString(),
    medicoes: panorama.medicoes,
    pesos: panorama.pesos,
    gorduras: panorama.gorduras,
    fotos: panorama.fotos.map((foto) => ({ id: foto.id, assessmentId: foto.assessmentId, pose: foto.pose, condicoes: foto.condicoes, protocoloVersao: foto.protocoloVersao, excluirEm: foto.excluirEm, observadoEm: foto.observadoEm, createdAt: foto.createdAt })),
    metas: panorama.metas,
    avaliacoesVisuais: panorama.avaliacoesVisuais,
    revisoesSemanais: panorama.revisoes,
  };
  return new Response(JSON.stringify(exportacao, null, 2), { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="athlyt-avaliacao-corporal-${new Date().toISOString().slice(0, 10)}.json"`, "cache-control": "private, no-store" } });
}
