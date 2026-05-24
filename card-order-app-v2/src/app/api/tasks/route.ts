// タスク作成 API
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const Schema = z.object({
  title: z.string().min(1),
  description: z.string().nullable(),
  category: z.enum(["invoice", "shipment", "oath", "survey", "inventory", "onboarding", "other"]),
  status: z.enum(["open", "in_progress", "done", "cancelled"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  assignedTo: z.string().uuid().nullable(),
  relatedShopId: z.string().uuid().nullable(),
  dueDate: z.string().nullable(),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 });
  }

  const { data: inserted, error } = await supabase
    .from("staff_tasks")
    .insert({
      title: body.title,
      description: body.description,
      category: body.category,
      status: body.status,
      priority: body.priority,
      assigned_to: body.assignedTo,
      related_shop_id: body.relatedShopId,
      due_date: body.dueDate,
      created_by: user.id,
      completed_at: body.status === "done" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();
  if (error || !inserted) return NextResponse.json({ error: error?.message ?? "失敗" }, { status: 500 });

  await writeAudit(supabase, {
    adminId: user.id,
    action: "create_task",
    targetTable: "staff_tasks",
    targetId: inserted.id,
    after: { title: body.title, assigned_to: body.assignedTo, status: body.status },
  });

  return NextResponse.json({ ok: true, task: inserted });
}
