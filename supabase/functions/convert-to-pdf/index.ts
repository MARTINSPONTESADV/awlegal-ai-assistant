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

    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    const convertRes = await fetch(
      `https://v2.convertapi.com/convert/docx/to/pdf?Secret=${secret}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Parameters: [
            { Name: "File", FileValue: { Name: file.name, Data: base64 } },
            { Name: "StoreFile", Value: true },
          ],
        }),
      }
    );

    if (!convertRes.ok) {
      const errText = await convertRes.text();
      console.error("ConvertAPI error:", errText);
      return new Response(
        JSON.stringify({ error: `ConvertAPI error: ${convertRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await convertRes.json();
    const pdfFile = result.Files?.[0];
    if (!pdfFile?.FileData) {
      return new Response(
        JSON.stringify({ error: "No PDF data returned" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode base64 PDF
    const pdfBytes = Uint8Array.from(atob(pdfFile.FileData), (c) => c.charCodeAt(0));

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
