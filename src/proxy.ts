import { auth } from "@/auth";
import { NextResponse } from "next/server";
import {
  DEV_SESSION_TOKEN,
  isDevSessionEnabled,
} from "@/auth/dev-session";

const PUBLIC_ROUTES = ["/", "/acesso-restrito"];

/**
 * Protege o casco autenticado (Início, Diário, Progresso, Mais) e
 * qualquer rota futura sob esses fluxos. Rotas públicas — boas-vindas e
 * acesso restrito — continuam acessíveis sem sessão.
 *
 * A galeria do design system vivia aqui como rota pública de
 * desenvolvimento; agora é o Storybook, servido por processo próprio
 * (`npm run storybook`) e fora do App Router.
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
