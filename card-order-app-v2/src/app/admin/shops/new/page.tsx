import { NewShopForm } from "./NewShopForm";

export const metadata = { title: "ショップ新規登録 | 管理" };

export default function NewShopPage() {
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">ショップ新規登録</h1>
      <p className="text-sm text-slate-500">
        登録後、招待メールが送信されます。受信者はメールのリンクから初回パスワードを設定してログインします。
      </p>
      <NewShopForm />
    </div>
  );
}
