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
    const apiKey = Deno.env.get("CLOUDMERSIVE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "CLOUDMERSIVE_API_KEY not configured" }),
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

    console.log(`Processing file: ${file.name}, size: ${file.size} bytes`);

    // Send to Cloudmersive DOCX→PDF API
    const uploadForm = new FormData();
    uploadForm.append("inputFile", file, file.name);

    const convertRes = await fetch(
      "https://api.cloudmersive.com/convert/docx/to/pdf",
      {
        method: "POST",
        headers: { "Apikey": apiKey },
        body: uploadForm,
      }
    );

    if (!convertRes.ok) {
      const errText = await convertRes.text();
      console.error("Cloudmersive error:", convertRes.status, errText);
      return new Response(
        JSON.stringify({ error: `Cloudmersive error: ${convertRes.status} - ${errText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cloudmersive returns the PDF binary directly in the response body
    const pdfBytes = await convertRes.arrayBuffer();

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${file.name.replace(".docx", ".pdf")}"`,
      },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
