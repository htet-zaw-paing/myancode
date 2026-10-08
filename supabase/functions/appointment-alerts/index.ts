import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import webpush from "npm:web-push"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')

// Configure the native Web Push sender with your email
webpush.setVapidDetails(
  'mailto:htetzawpaing.dev@gmail.com',
  VAPID_PUBLIC_KEY!,
  VAPID_PRIVATE_KEY!
)

serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record 
    const old_record = payload.old_record 
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
      return new Response("No relevant changes", { status: 200 })
    }

    await fetch("https://api.resend.com/emails", {
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

    if (record.push_subscription) {
      try {
        await webpush.sendNotification(
          record.push_subscription,
          JSON.stringify({ title: pushTitle, body: message })
        )
      } catch (pushError) {
        console.error('User push delivery failed:', pushError)
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})