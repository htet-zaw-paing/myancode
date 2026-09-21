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
    const { imageBase64, extension = 'jpg' } = await req.json()

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'No image data provided' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 400 
      })
    }

    const IMAGEKIT_PRIVATE_KEY = Deno.env.get('IMAGEKIT_PRIVATE_KEY');
    if (!IMAGEKIT_PRIVATE_KEY) {
        throw new Error("ImageKit Private Key not configured in Supabase secrets.");
    }

    const authHeader = `Basic ${btoa(IMAGEKIT_PRIVATE_KEY + ":")}`;
    const fileName = `community_post_${Date.now()}.${extension}`;

    const formData = new FormData();
    formData.append('file', imageBase64); 
    formData.append('fileName', fileName);
    formData.append('folder', '/marketplace_posts');
    formData.append('useUniqueFileName', 'true');

    const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        "Authorization": authHeader,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
       throw new Error(result.message || "Failed to upload to ImageKit");
    }

    return new Response(JSON.stringify({ url: result.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})