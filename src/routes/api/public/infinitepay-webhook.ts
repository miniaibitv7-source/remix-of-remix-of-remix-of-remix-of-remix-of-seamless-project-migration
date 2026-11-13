import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  order_nsu: z.string().uuid(),
  invoice_slug: z.string().min(1).max(200),
  transaction_nsu: z.string().min(1).max(200),
  receipt_url: z.string().max(500).optional().nullable(),
});

// InfinitePay webhooks are unsigned: every notice is re-checked with /payment_check before crediting.
export const Route = createFileRoute("/api/public/infinitepay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed;
        try { parsed = Body.safeParse(await request.json()); } catch { return new Response("bad json", { status: 400 }); }
        if (!parsed.success) return new Response("ignored", { status: 200 });
        const b = parsed.data;
        try {
          const { settleGemOrder } = await import("@/lib/gem-shop.server");
          const status = await settleGemOrder({ orderId: b.order_nsu, slug: b.invoice_slug, transactionNsu: b.transaction_nsu, receiptUrl: b.receipt_url });
          return new Response(status, { status: status === "pending" ? 400 : 200 });
        } catch (e) {
          console.error("InfinitePay webhook error:", e);
          return new Response("error", { status: 400 });
        }
      },
    },
  },
});
