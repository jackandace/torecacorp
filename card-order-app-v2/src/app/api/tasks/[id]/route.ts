// タスク更新・削除 API
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import type { StaffTask } from "@/types/database";

const PatchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  category: z.enum(["invoice", "shipment", "oath", "survey", "inventory", "onboarding", "other"]).optional(),
  status: z.enum(["open", "in_progress", "done", "cancelled"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  relatedShopId: z.string().uuid().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof PatchSchema>;
  try {
    body = PatchSchema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 });
  }

  const { data: before } = await supabase
    .from("staff_tasks")
    .select("*")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!before) return NextResponse.json({ error: "not found" }, { status: 404 });

  const update: Partial<StaffTask> = {};
  if (body.title !== undefined)         update.title = body.title;
  if (body.description !== undefined)   update.description = body.description;
  if (body.category !== undefined)      update.category = body.category;
  if (body.priority !== undefined)      update.priority = body.priority;
  if (body.assignedTo !== undefined)    update.assigned_to = body.assignedTo;
  if (body.relatedShopId !== undefined) update.related_shop_id = body.relatedShopId;
  if (body.dueDate !== undefined)       update.due_date = body.dueDate;
  if (body.status !== undefined) {
    update.status = body.status;
    update.completed_at = body.status === "done" ? new Date().toISOString() : null;
  }

  const { error } = await supabase.from("staff_tasks").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit(supabase, {
    adminId: user.id,
    action: "update_task",
    targetTable: "staff_tasks",
    targetId: params.id,
    before: { status: before.status, assigned_to: before.assigned_to },
    after: { status: update.status ?? before.status, assigned_to: update.assigned_to ?? before.assigned_to },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { error } = await supabase
    .from("staff_tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit(supabase, {
    adminId: user.id,
    action: "delete_task",
    targetTable: "staff_tasks",
    targetId: params.id,
  });

  return NextResponse.json({ ok: true });
}
