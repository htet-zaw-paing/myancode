import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// --- NEW TELEGRAM SECRETS ---
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log("=== FUNCTION BOOTED ===")
console.log("Keys loaded:", {
  hasResend: !!RESEND_API_KEY,
  hasVapidPub: !!VAPID_PUBLIC_KEY,
  hasVapidPriv: !!VAPID_PRIVATE_KEY,
  hasTelegramToken: !!TELEGRAM_BOT_TOKEN,
  hasTelegramChatId: !!TELEGRAM_CHAT_ID
})

webpush.setVapidDetails(
  'mailto:htetzawpaing.dev@gmail.com',
  VAPID_PUBLIC_KEY!,
  VAPID_PRIVATE_KEY!
)

serve(async (req) => {
  try {
    const payload = await req.json()
    console.log("1. DATABASE PAYLOAD RECEIVED:", JSON.stringify(payload, null, 2))
    
    const record = payload.record 
    const type = payload.type 

    let targetUrl = "https://www.myancode.com/track-ticket/"
    let btnText = "Track Ticket Status"

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('email', record.email)
        .maybeSingle()

      if (profile && profile.role === 'client') {
        targetUrl = "https://www.myancode.com/hub#appointments"
        btnText = "View in Client Hub"
      }
    } catch (e) {
      console.error(e)
    }

    let subject = ""
    let pushTitle = ""
    let pushBody = ""
    let htmlMessage = ""
    let tgText = "" // NEW TELEGRAM TEXT VARIABLE

    if (type === 'INSERT') {
      subject = `Meeting Ticket Received: ${record.ticket_id}`
      pushTitle = "Ticket Opened"
      pushBody = `Hi ${record.full_name}, your Ticket ID is ${record.ticket_id}. It is currently PENDING.`
      
      htmlMessage = `
        <p style="margin: 0 0 16px 0;">Dear ${record.full_name},</p>
        <p style="margin: 0 0 24px 0;">This is an official confirmation that your request has been received. Your ticket identifier is <strong style="font-family: monospace; font-size: 16px;">${record.ticket_id}</strong>, and its current status is <strong>PENDING</strong>.</p>
      `
      
      // NEW TELEGRAM FORMATTING FOR INSERT
      tgText = `🔔 *NEW TICKET OPENED*\n\n*ID:* \`${record.ticket_id}\`\n*Client:* ${record.full_name}\n*Email:* ${record.email}\n*Type:* ${record.request_type || 'Appointment'}\n*Status:* PENDING`

    } else if (type === 'UPDATE') {
      subject = `Ticket Update: ${record.status.toUpperCase()}`
      pushTitle = `Ticket ${record.status.toUpperCase()}`
      
      pushBody = `Your meeting request status is now ${record.status.toUpperCase()}.`
      if (record.remarks) {
        pushBody += `\nNote: ${record.remarks}`
      }

      htmlMessage = `
        <p style="margin: 0 0 16px 0;">Dear ${record.full_name},</p>
        <p style="margin: 0 0 24px 0;">Please be advised that the status of your request (ID: <strong style="font-family: monospace; font-size: 16px;">${record.ticket_id}</strong>) has been formally updated to: <strong>${record.status.toUpperCase()}</strong>.</p>
      `
      
      if (record.remarks) {
        htmlMessage += `
          <div class="email-note" style="margin-bottom: 24px; padding: 16px 20px; background-color: #F9F9F9; border-left: 3px solid #000000;">
            <strong style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Moderator Note</strong>
            <span style="font-size: 14px; line-height: 1.6;">${record.remarks}</span>
          </div>`
      }

      // NEW TELEGRAM FORMATTING FOR UPDATE
      tgText = `📝 *TICKET UPDATED*\n\n*ID:* \`${record.ticket_id}\`\n*Client:* ${record.full_name}\n*New Status:* ${record.status.toUpperCase()}`
      if (record.remarks) {
        tgText += `\n*Note:* ${record.remarks}`
      }

    } else {
      console.log("No relevant changes. Exiting early.")
      return new Response("No relevant changes", { status: 200 })
    }

    htmlMessage += `
        <div style="margin: 32px 0;">
            <a href="${targetUrl}" class="email-btn" style="background-color: #000000; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; display: inline-block;">
                ${btnText}
            </a>
        </div>
        <div class="email-footer" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E5E5; color: #666666; font-size: 11px; line-height: 1.6; text-transform: uppercase; letter-spacing: 0.5px;">
            <p style="margin: 0;">This is an automated administrative message. Please retain this correspondence for your records. Further updates will be issued as your request progresses.</p>
        </div>
    `

    console.log("2. PREPARING ALERTS FOR:", record.email)

    console.log("3. SENDING RESEND EMAIL...")
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "MyanCode <noreply@myancode.com>", 
        to: record.email,
        subject: subject,
        html: `<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="color-scheme" content="light dark">
          <style>
            body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
            @media (prefers-color-scheme: dark) {
              .email-bg { background-color: #000000 !important; }
              .email-card { background-color: #111111 !important; border-color: #333333 !important; }
              .email-text { color: #ffffff !important; }
              .email-border { border-color: #ffffff !important; }
              .email-btn { background-color: #ffffff !important; color: #000000 !important; }
              .email-note { background-color: #222222 !important; border-left-color: #ffffff !important; }
              .email-footer { color: #888888 !important; border-top-color: #333333 !important; }
            }
          </style>
        </head>
        <body class="email-bg" style="margin: 0; padding: 20px; background-color: #F4F4F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
          <div class="email-card" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E5E5E5; padding: 40px; box-sizing: border-box;">
            <div class="email-border" style="border-bottom: 2px solid #000000; padding-bottom: 16px; margin-bottom: 32px;">
              <h2 class="email-text" style="margin: 0; font-size: 16px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #000000;">MYANCODE</h2>
            </div>
            <div class="email-text" style="color: #000000; font-size: 15px; line-height: 1.6;">
              ${htmlMessage}
            </div>
          </div>
        </body>
        </html>`,
      }),
    })
    const resendResult = await resendResponse.text()
    console.log("4. RESEND API RESPONSE:", resendResponse.status, resendResult)

    if (record.push_subscription) {
      console.log("5. PUSH SUBSCRIPTION FOUND. Sending Web Push...")
      
      let subData = record.push_subscription;
      if (typeof subData === 'string') {
        subData = JSON.parse(subData);
      }

      try {
        await webpush.sendNotification(
          subData,
          JSON.stringify({ title: pushTitle, body: pushBody, url: targetUrl }),
          {
            urgency: 'high',
            TTL: 86400
          }
        )
        console.log("6. WEB PUSH SUCCESSFUL!")
      } catch (pushError) {
        console.error('7. WEB PUSH FAILED TO DELIVER:', pushError.message)
        console.error('8. PUSH SERVER REJECTION REASON:', pushError.body || "No body provided")
        console.error('9. PUSH SERVER STATUS CODE:', pushError.statusCode || "No status code")
      }
    } else {
      console.log("5. NO PUSH SUBSCRIPTION FOUND IN DATABASE FOR THIS ROW.")
    }

    // --- NEW TELEGRAM LOGIC ---
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      console.log("10. SENDING TELEGRAM ADMIN ALERT...")
      const tgUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
      try {
        const tgResponse = await fetch(tgUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: tgText,
            parse_mode: 'Markdown'
          })
        })
        console.log("11. TELEGRAM API RESPONSE:", tgResponse.status)
      } catch (tgError) {
        console.error("12. TELEGRAM ALERT FAILED:", tgError)
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } })

  } catch (error) {
    console.error("FATAL SCRIPT ERROR:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})