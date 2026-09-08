# Prepaid gacha and prize-rank layout

## Reference
Read-only inspection of the logged-in original homepage and /box/22, /box/21, /box/13 at https://ori-parade-frontend.vercel.app/ . No original charge, reward claim or draw executed.

## Behavior
Charge is a separate flow. Catalog and detail GachaPlay opens 1/10/100 selection, shows held coins and consumption, and executes directly into a 3.2-second skippable illustrative animation then result. Only insufficient coins link to charge. Result count matches selected count. A synchronous click guard prevents double execution. Sample balance and last result are session-scoped, survive navigation and reload, and never write to the original backend. Charge explicitly adds sample coins, without billing. Header, account and charge balance use the same store.

Animation is a temporary preview using the existing original puff asset, not the real site's video. Results are deterministic illustrative samples, not server-generated prizes. Original backend integration remains outside this prototype.

## Lineup
32 unique observed card assets copied locally. PrizeRank supports arbitrary labels (S/A/B/etc., 1/2/3/etc., or other) and an optional columns setting; automatic fallback chooses 2, 3 or 4 by registered type count. Current snapshot uses the original numeric labels with 2/3/3/4/4 columns, plus special groups. Box22 includes the expanded 14-card fourth rank; box21's lower-rank design sample reuses that expanded shape, and quantities not exposed in its UI remain unset. Box13 keeps the observed 1st and 5th groups. It is not live inventory.

All ten observed caution sections follow the entire lineup, including special groups. No notices are interleaved between prize ranks.

## Validation
- Static export succeeded (58 routes).
- Sample 100 draws at 555 coins: insufficient by 43,000 from 12,500, no debit.
- 10 draws: consumed 5,550 once; animation shown; result 10 cards; held balance 6,950.
- Reload retains 10 results and 6,950 after hydration.
- Separate sample charge of 500 gives 7,450 and persists to catalog header.
- Mobile 390 CSS px: scrollWidth 390; prize groups render 2/3/4 columns.
