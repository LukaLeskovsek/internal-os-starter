import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  // Only a page on this same site. Resolve `next` once and redirect to that URL
  // object: re-parsing a path string would turn "/x/..//evil.com" into another host.
  const requested = new URL(url.searchParams.get("next") || "/home", url.origin);
  const target = requested.origin === url.origin ? requested : new URL("/home", url.origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(target);
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=Invite+link+could+not+be+accepted.", url.origin),
  );
}
