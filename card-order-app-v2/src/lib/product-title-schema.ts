import { z } from "zod";

/** タイトル (ポケモン / ワンピース …) の入力 */
export const TitleBody = z.object({
  name: z.string().trim().min(1, "タイトル名は必須です").max(80),
  keywords: z.array(z.string().trim().min(1).max(60)).max(30),
  sortOrder: z.number().int().min(0).max(9999),
});
