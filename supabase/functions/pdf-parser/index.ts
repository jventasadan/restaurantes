import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, image, image_type } = await req.json();

    if (!text && !image) {
      return new Response(
        JSON.stringify({ error: "Debe proporcionar el texto extraído del PDF o la imagen del menú en base64." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY") || "";

    // 1. Construir el prompt de sistema
    const systemPrompt = `
Eres un analizador de cartas de restaurante.
Analiza el texto o la imagen del menú proporcionada y devuelve SOLO un JSON con este formato:
{
  "menu_items": [
    {
      "category": "Entrantes",
      "name": "nombre del plato",
      "description": "descripción si existe",
      "price": 0.00,
      "price_type": "por unidad / por persona / por ración / mínimo X personas",
      "allergens": ["gluten", "lacteos", "pescado", "marisco", "huevo", "frutos de cascara", "cacahuetes", "soja", "mostaza", "sesamo", "sulfitos", "altramuces", "moluscos", "apio"],
      "available": true,
      "notes": "indicación especial si existe (ej. 'mínimo 2 personas', 'plato de temporada')"
    }
  ]
}
Si un campo no existe en el texto devuelve null.
No inventes información. Devuelve SOLO el JSON válido.
`;

    // 2. Preparar el contenido del mensaje para Claude
    let content: any[] = [];

    if (image) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: image_type || "image/jpeg",
          data: image,
        },
      });
      content.push({
        type: "text",
        text: "Analiza esta página del menú y extrae todos los platos.",
      });
    } else {
      content.push({
        type: "text",
        text: `Analiza el siguiente texto de la carta:\n\n${text}`,
      });
    }

    // 3. Llamar a Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: "user", content: content }
        ],
        temperature: 0.1, // Baja temperatura para análisis preciso sin creatividad
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Claude API Error:", errText);
      return new Response(JSON.stringify({ error: "Error al llamar a Claude API" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const claudeResult = await response.json();
    const replyText = claudeResult.content.find((c: any) => c.type === "text")?.text || "";

    // 4. Intentar limpiar y parsear el JSON de la respuesta
    let menuData = null;
    try {
      // Remover bloques de código si Claude los incluyó
      const cleanJson = replyText.replace(/```json/g, "").replace(/```/g, "").trim();
      menuData = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Error al parsear el JSON de Claude:", replyText, e);
      return new Response(
        JSON.stringify({
          error: "La respuesta de la IA no pudo ser parseada a JSON",
          raw_response: replyText,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(menuData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Edge Function Exception:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
