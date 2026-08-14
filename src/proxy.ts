import { auth } from "@/auth";
import { NextResponse } from "next/server";
import {
  DEV_SESSION_TOKEN,
  isDevSessionEnabled,
} from "@/auth/dev-session";

/**
 * A galeria do design system é ferramenta de construção: existe só em
 * desenvolvimento e a própria rota responde 404 em produção. Mantê-la
 * fora da lista pública no build de produção evita que uma tentativa de
 * acesso sequer chegue ao App Router.
 */
const PUBLIC_ROUTES = [
  "/",
  "/acesso-restrito",
  ...(process.env.NODE_ENV !== "production" ? ["/design"] : []),
];

/**
 * Protege o casco autenticado (Início, Diário, Progresso, Mais) e
 * qualquer rota futura sob esses fluxos. Rotas públicas — boas-vindas,
 * acesso restrito e (apenas em desenvolvimento) a galeria do design
 * system — continuam acessíveis sem sessão.
 */
export default auth(function proxy(req) {
  const isPublicRoute = PUBLIC_ROUTES.includes(req.nextUrl.pathname);

  if (!req.auth && isDevSessionEnabled()) {
    const destination = req.nextUrl.clone();
    if (destination.pathname === "/") destination.pathname = "/inicio";

    const response = NextResponse.redirect(destination);
    response.cookies.set("authjs.session-token", DEV_SESSION_TOKEN, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return response;
  }

  if (!req.auth && !isPublicRoute) {
    const signInUrl = new URL("/", req.nextUrl.origin);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons).*)"],
};
