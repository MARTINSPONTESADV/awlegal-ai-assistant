import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get("CONVERTAPI_SECRET");
    if (!secret) {
      return new Response(
        JSON.stringify({ error: "CONVERTAPI_SECRET not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[convert-audio-ogg] Processing: ${file.name}, size: ${file.size}, type: ${file.type}`);

    // Upload to ConvertAPI for webm → ogg conversion
    const uploadForm = new FormData();
    uploadForm.append("File", file, file.name);
    uploadForm.append("StoreFile", "true");
    // Force Opus codec for WhatsApp PTT compatibility
    uploadForm.append("AudioCodec", "libopus");
    uploadForm.append("AudioBitrate", "32000");
    uploadForm.append("AudioChannels", "1");
    uploadForm.append("AudioSampleRate", "16000");

    const convertRes = await fetch(
      `https://v2.convertapi.com/convert/webm/to/ogg?Secret=${secret}`,
      { method: "POST", body: uploadForm }
    );

    if (!convertRes.ok) {
      const errText = await convertRes.text();
      console.error("[convert-audio-ogg] ConvertAPI error:", convertRes.status, errText);
      return new Response(
        JSON.stringify({ error: `ConvertAPI error: ${convertRes.status}`, details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await convertRes.json();
    const oggFile = result.Files?.[0];
    if (!oggFile) {
      console.error("[convert-audio-ogg] No files in response:", JSON.stringify(result));
      return new Response(
        JSON.stringify({ error: "No OGG file returned" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download converted OGG from URL
    const oggUrl = oggFile.Url || oggFile.FileUrl;
    if (oggUrl) {
      console.log("[convert-audio-ogg] Downloading converted OGG from URL");
      const oggRes = await fetch(oggUrl);
      if (!oggRes.ok) {
        return new Response(
          JSON.stringify({ error: "Failed to download converted OGG" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(oggRes.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/ogg; codecs=opus",
          "Content-Disposition": `attachment; filename="${file.name.replace(/\.\w+$/, ".ogg")}"`,
        },
      });
    }

    // Fallback: use FileData (base64)
    if (oggFile.FileData) {
      console.log("[convert-audio-ogg] Using FileData fallback");
      const raw = atob(oggFile.FileData);
      const oggBytes = Uint8Array.from(raw, (c: string) => c.charCodeAt(0));
      return new Response(oggBytes, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/ogg; codecs=opus",
          "Content-Disposition": `attachment; filename="${file.name.replace(/\.\w+$/, ".ogg")}"`,
        },
      });
    }

    return new Response(
      JSON.stringify({ error: "No OGG data returned" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[convert-audio-ogg] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
