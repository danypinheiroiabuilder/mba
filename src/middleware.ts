import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// alias: este módulo já exporta `config` (matcher do middleware)
import { config as appConfig, isSupabaseConfigured } from "@/config/env";

export const runtime = "nodejs";

const SUPABASE_URL = appConfig.supabase.url;
const SUPABASE_ANON_KEY = appConfig.supabase.anonKey;

const PRIVATE_ROUTES = ["/", "/transacoes", "/categorias", "/resumo"];
const PUBLIC_ONLY_ROUTES = ["/login", "/reset"];

export async function middleware(request: NextRequest) {
  // Sem as variáveis do Supabase não há como validar sessão aqui. Deixa passar
  // para a tela de login, que mostra as instruções de configuração, em vez de
  // derrubar toda requisição do site.
  if (!isSupabaseConfigured) return NextResponse.next({ request });

  const isRsc = request.headers.get("rsc") === "1";
  if (isRsc) return NextResponse.next({ request });

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() valida o token JWT com o Supabase — nunca usar getSession() aqui
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isPrivate = PRIVATE_ROUTES.some(
    (r) => pathname === r || (r !== "/" && pathname.startsWith(r)),
  );
  const isPublicOnly = PUBLIC_ONLY_ROUTES.some((r) => pathname.startsWith(r));

  // Um redirect cria uma resposta nova, que não herda os cookies gravados por
  // setAll() durante o getUser() (refresh de token). Sem copiá-los, a sessão
  // renovada seria perdida sempre que a requisição terminasse em redirect.
  const redirectPreservingCookies = (url: URL) => {
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => response.cookies.set(cookie));
    return response;
  };

  if (!user && isPrivate) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return redirectPreservingCookies(loginUrl);
  }

  if (user && isPublicOnly) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/";
    return redirectPreservingCookies(dashboardUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/rsc|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)).*)",
  ],
};
