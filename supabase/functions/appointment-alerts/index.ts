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
        <p>Hi ${record.full_name},</p>
        <p>We have received your request. Your Ticket ID is <strong>${record.ticket_id}</strong> and your status is currently <strong>PENDING</strong>.</p>
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

      htmlMessage = `<p>Hi ${record.full_name}, your meeting request status has been updated to: <strong>${record.status.toUpperCase()}</strong>.</p>`
      if (record.remarks) {
        htmlMessage += `
          <div style="margin-top: 20px; padding: 15px; background-color: #f4f4f5; border-left: 4px solid #0066CC; border-radius: 4px; color: #3f3f46;">
            <strong>Note:</strong><br/>
            ${record.remarks}
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
        <div style="margin: 25px 0;">
            <a href="${targetUrl}" style="background-color: #0066CC; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block;">
                ${btnText}
            </a>
        </div>
        <p style="color: #666; font-size: 14px;">Please keep this email for your records. We will also notify you here once your status is updated by our team.</p>
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
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #171717;">
                 <h2 style="color: #0066CC;">MyanCode Updates</h2>
                 ${htmlMessage}
               </div>`,
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