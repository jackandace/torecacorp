import { NewProductForm } from "./NewProductForm";

export const metadata = { title: "商品新規登録 | 管理" };

export default function NewProductPage() {
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">商品新規登録</h1>
      <p className="text-sm text-slate-500">登録後の詳細ページで画像アップロードと公開設定を行います。</p>
      <NewProductForm />
    </div>
  );
}
