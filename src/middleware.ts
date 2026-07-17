import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/chat", "/settings", "/stats", "/paywall"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return response;
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

  if (isProtected && !user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/";
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }

  if (
    user &&
    (path === "/chat" ||
      path.startsWith("/chat/") ||
      path === "/settings" ||
      path.startsWith("/settings/") ||
      path === "/stats" ||
      path.startsWith("/stats/"))
  ) {
    const { data: balance } = await supabase.rpc("get_credit_balance", {
      p_user_id: user.id,
    });
    if ((balance as number) <= 0) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/paywall";
      return NextResponse.redirect(redirect);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
