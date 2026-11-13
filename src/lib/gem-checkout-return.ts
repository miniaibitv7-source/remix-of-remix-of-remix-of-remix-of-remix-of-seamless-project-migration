const KEY = "lawl-gem-checkout-return-v1";

type CheckoutReturn = { userId: string; slot: number; orderId: string };
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Only a return hint; character access is still checked by the character RPC. */
export function rememberGemCheckout(store: Store, value: CheckoutReturn) {
  store.setItem(KEY, JSON.stringify(value));
}

export function takeGemCheckout(store: Store, userId: string): CheckoutReturn | null {
  const raw = store.getItem(KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<CheckoutReturn>;
    if (value.userId !== userId) return null;
    store.removeItem(KEY);
    if (!Number.isInteger(value.slot) || typeof value.slot !== "number" || value.slot < 1 || value.slot > 5 || typeof value.orderId !== "string") return null;
    return { userId, slot: value.slot, orderId: value.orderId };
  } catch {
    store.removeItem(KEY);
    return null;
  }
}