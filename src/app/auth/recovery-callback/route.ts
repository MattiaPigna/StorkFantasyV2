import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const code = searchParams.get("code");

  // DEBUG TEMPORANEO - da rimuovere dopo il fix
  const allParams: Record<string, string> = {};
  searchParams.forEach((value, key) => { allParams[key] = value; });
  if (Object.keys(allParams).length === 0 || (!code && !token_hash)) {
    return NextResponse.redirect(`${origin}/?debug_params=${encodeURIComponent(JSON.stringify(allParams))}`);
  }

  const supabase = await createClient();

  // PKCE flow
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/auth/reset-password`);
    }
  }

  // Token hash flow
  if (token_hash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: "recovery" });
    if (!error) {
      return NextResponse.redirect(`${origin}/auth/reset-password`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=link_invalido`);
}
