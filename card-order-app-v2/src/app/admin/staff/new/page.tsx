import { NewStaffForm } from "./NewStaffForm";

export const metadata = { title: "スタッフ招待 | 管理" };

export default function NewStaffPage() {
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">スタッフ招待</h1>
      <p className="text-sm text-slate-500">
        指定メアドに Supabase Auth 招待メールを送信。受信者がリンクからパスワードを設定するとログイン可能になります。
      </p>
      <NewStaffForm />
    </div>
  );
}
