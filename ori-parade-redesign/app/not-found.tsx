
import {sitePath} from "../lib/site-path";
import { SiteHeader, SiteFooter, Empty } from './shared';
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="page-container subpage">
<h1 className="sr-only">ページが見つかりません</h1>
        <Empty
          title="ページが見つかりません"
          description="URLをご確認いただくか、トップページへお戻りください。"
          href={sitePath("/")}
          label="オリパ一覧へ"
        />
      </main>
      <SiteFooter />
    </>
  );
}
