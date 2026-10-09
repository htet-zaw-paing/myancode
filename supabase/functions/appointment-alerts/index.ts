import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import webpush from "npm:web-push"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')

console.log("=== FUNCTION BOOTED ===")
console.log("Keys loaded:", {
  hasResend: !!RESEND_API_KEY,
  hasVapidPub: !!VAPID_PUBLIC_KEY,
  hasVapidPriv: !!VAPID_PRIVATE_KEY
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

    let subject = ""
    let pushTitle = ""
    let pushBody = ""
    let htmlMessage = ""

    if (type === 'INSERT') {
      subject = "Meeting Ticket Received - MyanCode"
      pushTitle = "Ticket Opened"
      pushBody = `Hi ${record.full_name}, we have received your request for an appointment. Your ticket is currently PENDING.`
      htmlMessage = `<p>Hi ${record.full_name}, we have received your request for an appointment. Your ticket is currently <strong>PENDING</strong>.</p>`
    
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
    } else {
      console.log("No relevant changes. Exiting early.")
      return new Response("No relevant changes", { status: 200 })
    }

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
          JSON.stringify({ title: pushTitle, body: pushBody })
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

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } })

  } catch (error) {
    console.error("FATAL SCRIPT ERROR:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})