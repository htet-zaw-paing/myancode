import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? ""; 

const ALLOWED_SENDERS = [
  "htetzawpaing@myancode.com",
  "hello@myancode.com",
  "maintenance@myancode.com",
  "update@myancode.com",
  "noreply@myancode.com",
  "promotion@myancode.com"
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY environment variable.");
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) throw new Error("Unauthorized: Missing JWT.");

    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
        global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized: Invalid session.");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role?.toLowerCase() !== "founder") {
      throw new Error("Forbidden: Only Founders can send emails.");
    }

    const { from, to, subject, html, reply_to } = await req.json();

    if (!from || !to || !subject || !html || !reply_to) {
      throw new Error("Missing required email fields.");
    }

    if (!ALLOWED_SENDERS.includes(reply_to)) {
      throw new Error("Forbidden: Sender address is not authorized.");
    }

    let finalFrom = "";
    if (reply_to === "htetzawpaing@myancode.com" && from.includes("Htet Zaw Paing")) {
        finalFrom = "Htet Zaw Paing <htetzawpaing@myancode.com>";
    } else if (reply_to === "hello@myancode.com" && from.includes("MyanCode")) {
        finalFrom = "MyanCode <hello@myancode.com>";
    } else if (reply_to === "maintenance@myancode.com" && from.includes("Maintenance")) {
        finalFrom = "MyanCode Maintenance <maintenance@myancode.com>";
    } else if (reply_to === "update@myancode.com" && from.includes("Update")) {
        finalFrom = "MyanCode Updates <update@myancode.com>";
    } else if (reply_to === "noreply@myancode.com" && from.includes("MyanCode")) {
        finalFrom = "MyanCode <noreply@myancode.com>";
    } else if (reply_to === "promotion@myancode.com" && from.includes("Promotion")) {
        finalFrom = "MyanCode Promotions <promotion@myancode.com>";
    } else {
        throw new Error("Forbidden: Invalid 'From' alias.");
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: finalFrom,
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: html,
        reply_to: reply_to,
      }),
    });

    const resendData = await resendRes.json();
    const isSuccess = resendRes.ok;

    const supabaseAdmin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    
    const { error: logError } = await supabaseAdmin
      .from("email_messages")
      .insert({
        recipient: Array.isArray(to) ? to.join(", ") : to,
        sender: finalFrom,
        reply_to: reply_to,
        subject: subject,
        html_content: html,
        resend_email_id: isSuccess ? resendData.id : null,
        status: isSuccess ? "sent" : "failed",
        error_message: isSuccess ? null : JSON.stringify(resendData),
        sent_by: user.id
      });

    if (logError) {
      console.error("Failed to insert email log:", logError);
    }

    if (!isSuccess) {
      throw new Error("Email sending failed from provider.");
    }

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});