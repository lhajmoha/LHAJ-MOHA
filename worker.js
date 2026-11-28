export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    let payload;
    try {
      payload = await request.json();
    } catch (_) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const target = String(payload?.target || "").toLowerCase().trim();
    const webhookMap = {
      verification: env.WEBHOOK_VERIFICATION,
      verifie: env.WEBHOOK_VERIFIE,
      sit: env.WEBHOOK_SITh
    };

    const webhookUrl = webhookMap[target] || env.WEBHOOK_DEFAULT;

    if (!webhookUrl) {
      return new Response(JSON.stringify({ ok: false, error: "Webhook not configured for target" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const discordBody = {};
    if (typeof payload?.content === "string" && payload.content.trim()) {
      discordBody.content = payload.content.slice(0, 2000);
    }

    if (payload?.embed && typeof payload.embed === "object") {
      discordBody.embeds = [
        {
          title: String(payload.embed.title || "").slice(0, 256),
          color: typeof payload.embed.color === "number" ? payload.embed.color : 0x00f0ff,
          fields: Array.isArray(payload.embed.fields)
            ? payload.embed.fields.slice(0, 25).map(f => ({
                name: String(f?.name || "Info").slice(0, 256),
                value: String(f?.value || "—").slice(0, 1024),
                inline: Boolean(f?.inline)
              }))
            : [],
          timestamp: new Date().toISOString()
        }
      ];
    }

    if (!discordBody.content && !discordBody.embeds) {
      return new Response(JSON.stringify({ ok: false, error: "Empty message payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    try {
      const discordRes = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discordBody)
      });

      return new Response(JSON.stringify({ ok: discordRes.ok, status: discordRes.status }), {
        status: discordRes.ok ? 200 : 502,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: "Discord request failed" }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }
};
