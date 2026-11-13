import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { GEM_PACKS, webhookBase } from "./gem-packs";
import { createInfinitePayLink, settleGemOrder } from "./gem-shop.server";

export const createGemCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ pack: z.number().int().min(0).max(GEM_PACKS.length - 1), slot: z.number().int().min(1).max(5), origin: z.string().url().max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const pack = GEM_PACKS[data.pack];
    if (!pack) throw new Error("Pacote inválido.");
    const { data: save } = await context.supabase.from("game_saves").select("character_slot,data").eq("user_id", context.userId).maybeSingle();
    if (!save || save.character_slot !== data.slot) throw new Error("Abra o personagem novamente antes de comprar.");
    const name = String((save.data as Record<string, unknown>)?.["name"] ?? "").slice(0, 14);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin.from("lawl_gem_orders")
      .insert({ user_id: context.userId, slot: data.slot, character_name: name, pack: data.pack, gems: pack.gems, amount_cents: pack.cents })
      .select("id").single();
    if (error || !order) throw new Error("Não foi possível registrar o pedido.");
    const base = webhookBase(data.origin);
    const url = await createInfinitePayLink({
      order_nsu: order.id,
      items: [{ quantity: 1, price: pack.cents, description: `${pack.gems} gemas - ${name || "Reinos de Lawl"}` }],
      ...(new URL(data.origin).protocol === "https:" ? { redirect_url: `${new URL(data.origin).origin}/?pagamento=gemas` } : {}),
      ...(base ? { webhook_url: `${base}/api/public/infinitepay-webhook` } : {}),
    });
    await supabaseAdmin.from("lawl_gem_orders").update({ checkout_url: url }).eq("id", order.id);
    return { orderId: order.id, url };
  });

export const confirmGemReturn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ order_nsu: z.string().uuid(), slug: z.string().min(1).max(200), transaction_nsu: z.string().min(1).max(200), receipt_url: z.string().max(500).optional() }).parse(d))
  .handler(async ({ data }) => ({
    status: await settleGemOrder({ orderId: data.order_nsu, slug: data.slug, transactionNsu: data.transaction_nsu, receiptUrl: data.receipt_url }),
  }));
