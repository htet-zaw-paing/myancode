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
    const old_record = payload.old_record || {}
    const type = payload.type 

    let subject = ""
    let message = ""
    let pushTitle = ""

    if (type === 'INSERT') {
      subject = "Meeting Ticket Received - MyanCode"
      pushTitle = "Ticket Opened"
      message = `Hi ${record.full_name}, we have received your request for an appointment. Your ticket is currently PENDING.`
    } else if (type === 'UPDATE' && record.status !== old_record.status) {
      subject = `Ticket Update: ${record.status.toUpperCase()}`
      pushTitle = `Ticket ${record.status.toUpperCase()}`
      message = `Hi ${record.full_name}, your meeting request status has been updated to: ${record.status.toUpperCase()}.`
    } else {
      console.log("No status change. Exiting early.")
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
        html: `<div style="font-family: sans-serif; padding: 20px;"><h2>MyanCode Updates</h2><p>${message}</p></div>`,
      }),
    })
    const resendResult = await resendResponse.text()
    console.log("4. RESEND API RESPONSE:", resendResponse.status, resendResult)

    if (record.push_subscription) {
      console.log("5. PUSH SUBSCRIPTION FOUND. Sending Web Push...")
      try {
        await webpush.sendNotification(
          record.push_subscription,
          JSON.stringify({ title: pushTitle, body: message })
        )
        console.log("6. WEB PUSH SUCCESSFUL!")
      } catch (pushError) {
        console.error('7. WEB PUSH FAILED TO DELIVER:', pushError)
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