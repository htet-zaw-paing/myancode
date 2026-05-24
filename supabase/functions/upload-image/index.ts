import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64, extension } = await req.json()
    
    if (!imageBase64) throw new Error("No image data provided")

    const githubToken = Deno.env.get('GITHUB_PAT')
    
    if(!githubToken) throw new Error("GitHub token not configured on server.")

    const owner = 'myancode'
    const repo = 'myancode_marketplace'
    const fileName = `post_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension || 'png'}`
    const path = `uploads/${fileName}`

    const githubRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MyanCode-Marketplace-App',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: `Auto-upload image ${fileName}`,
        content: imageBase64
      })
    })

    if (!githubRes.ok) {
      const errorData = await githubRes.json()
      throw new Error(`GitHub API error: ${errorData.message || githubRes.statusText}`)
    }

    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`

    return new Response(
      JSON.stringify({ url: rawUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})