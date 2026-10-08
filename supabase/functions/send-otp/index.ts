import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record

    if (!record || !record.email || !record.otp_code) {
      return new Response("Invalid payload", { status: 400 })
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "MyanCode <noreply@myancode.com>",
        to: record.email,
        subject: "Your MyanCode Verification Code",
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; text-align: center;">
            <h2>Verify Your Meeting Request</h2>
            <p>Your 6-digit verification code is:</p>
            <h1 style="font-size: 36px; letter-spacing: 5px; color: #2997ff;">${record.otp_code}</h1>
            <p style="color: #666; font-size: 12px;">This code will expire in 10 minutes.</p>
          </div>
        `,
      }),
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
      status: res.ok ? 200 : 400,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})