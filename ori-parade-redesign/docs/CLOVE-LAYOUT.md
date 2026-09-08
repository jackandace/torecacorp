# Clove structure, Ori Parade surfaces

Reference inspected in browser: https://oripa.clove.jp/oripa/Pokemon , a visible Pokemon detail, account drawer, profile and notifications. Desktop and mobile catalog checked. This is a reference adaptation for Ori Parade's existing feature set, not an assertion of a full pixel-identical clone of every Clove screen.

## Layout tokens
- Main header 56px, catalog max 1000px, two desktop columns / one mobile column.
- Compact 3:1 campaign tiles, category navigation, filter and sorting row, product list.
- Utility screens max 640px with 56px back/title header; detail content max 500px in image → controls → prizes order.
- Account drawer max 512px on desktop / full width on mobile. Rank, four shortcuts, feature banner, settings in sequence.
- Pop identity in cream/pink backgrounds, original decorative asset, orange buttons and pastel surfaces. Removed global enclosing frame and mobile bottom navigation.

## URL correspondence
- /oripa/All, /oripa/Pokemon, /oripa/OnePiece
- /oripa/Pokemon/22, /oripa/Pokemon/21, /oripa/Pokemon/13
- /notification, /point, /coupon, /mypage/address, /others/help-oripa-rank
- /mypage and /mypage/profile currently share the existing account overview; no new external-profile data added.
Legacy URLs remain valid. Ori Parade-specific lab, tickets, boosts and special draws retain their existing routes. Clove-only game features, promotions and balances are not copied.

## Verification
Static export succeeds across 58 routes. Browser checks: desktop catalog, 390 CSS-pixel account page, detail, catalog and account drawer. Detail width overflow was corrected and verified at scrollWidth = innerWidth = 390. Menu opens successfully. Existing sample transaction confirmation behavior is unchanged. No production backend changes.
