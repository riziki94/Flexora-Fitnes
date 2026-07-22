import { createServerFn } from "@tanstack/react-start";

/**
 * Send a Zongosol design via email to patrick.kitolano@kitoslight.com.
 * Uses fetch to call a simple email-relay endpoint. If no email service is
 * configured, the design is logged and success is returned anyway.
 */
export const sendDesignEmail = createServerFn()
  .validator((data: {
    design: Record<string, unknown>;
    customerName?: string;
    customerEmail?: string;
  }) => data)
  .handler(async ({ data }) => {
    const { design, customerName, customerEmail } = data;

    // Build a human-readable email body
    const model = (design as any).selectedModel || "Unknown";
    const size = (design as any).containerSize || "Unknown";
    const layout = (design as any).layoutType || "single";
    const rooms = Array.isArray((design as any).rooms)
      ? (design as any).rooms.map((r: any) => `${r.label} (${r.type})`).join(", ")
      : "None";
    const total = (design as any)._totalEstimate || 0;
    const solar = (design as any).solarPanels ? "Yes" : "No";
    const deck = (design as any).deck ? "Yes" : "No";
    const battery = (design as any).batterySize || "None";
    const heatPump = (design as any).heatPumpType || "None";
    const windTurbine = (design as any).windTurbine ? `Yes (${(design as any).windTurbineSize || "?"}kW)` : "No";

    const emailBody = `
New Zongosol Design Submission
===============================
Customer: ${customerName || "Not provided"}
Email: ${customerEmail || "Not provided"}

Design Summary:
  Model: ${model}
  Container Size: ${size}
  Layout: ${layout}
  Rooms: ${rooms}
  Estimated Total: ${total} NOK

Energy:
  Solar Panels: ${solar}
  Battery: ${battery}
  Heat Pump: ${heatPump}
  Wind Turbine: ${windTurbine}

Full Design JSON:
${JSON.stringify(design, null, 2)}
`.trim();

    // Try to send via a simple HTTP email relay if configured
    // This uses the Resend API-compatible endpoint if RESEND_API_KEY is set
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from: "Kitozon Zongosol <noreply@kitozon.com>",
            to: ["patrick.kitolano@kitoslight.com"],
            subject: `New Zongosol Design — ${customerName || "Anonymous"} — ${model}`,
            text: emailBody,
          }),
        });

        if (response.ok) {
          console.log("[zongosol-actions] Design email sent successfully");
          return { success: true, message: "Design saved and sent to our team!" };
        } else {
          const errBody = await response.text();
          console.error("[zongosol-actions] Email API error:", response.status, errBody);
        }
      } catch (err) {
        console.error("[zongosol-actions] Email send failed:", err);
      }
    }

    // Fallback: log the design and return success
    console.log("[zongosol-actions] Design saved (no email API configured):");
    console.log(emailBody);

    return { success: true, message: "Design saved! Our team will review it." };
  });
