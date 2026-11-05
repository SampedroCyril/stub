import { useMemo } from "react";
import { useApp } from "../store/AppStore.jsx";
import { ownedItems, exploitCtx, poolOf, earnings, balance, DEFAULT_EQ } from "./shop.js";

/** Boutique et Arsenal du joueur : objets possédés, solde de mégots, réserves d'effets pour le combat. */
export function useShop() {
  const { S, state } = useApp();
  return useMemo(() => {
    const bought = state.shop?.bought || [], eq = { ...DEFAULT_EQ, ...state.shop?.eq };
    const ctx = exploitCtx(S.ev, S.best), owned = ownedItems(bought, ctx), earn = earnings(S.ev, S.startAt, S.now);
    return { bought, eq, ctx, owned, earn, bal: balance(earn.total, bought) };
  }, [S, state.shop]);
}
/** Réserves d'effets équipés : ultimes et K.O. tirés à chaque coup, signature tirée par combat. */
export function useArsenal() {
  const { owned, eq } = useShop();
  return useMemo(() => ({ ult: poolOf("ult", eq, owned), ko: poolOf("ko", eq, owned), sig: poolOf("sig", eq, owned), tray: poolOf("tray", eq, owned) }), [owned, eq]);
}
