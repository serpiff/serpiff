# serpiff for Chrome

[English](README.md) | 日本語

表示しているGitHubのPull Requestをローカルで動くコードレビューツールの[serpiff](https://github.com/serpiff/serpiff)で開くChrome拡張です。

## できること

- Pull Requestのページ（`https://github.com/<owner>/<name>/pull/<n>`と、その下の`/files`や`/commits/<sha>`などのページ）ではツールバーのボタンが有効になります。押すと`serpiff://open?url=<PRのURL>`を開き、serpiffがそのPull Requestのセッションを開きます。セッションがなければ作ります（`serp session add <PR URL> --open`と同じです）。
- PRのヘッダーのCodeボタンのすぐ後ろにも、serpiffのロゴのボタン（ツールチップは`serpiffで開く`）を足します。同じ`serpiff://`のURLへの普通のリンクです。ヘッダーが見つからないときは何も足しません。
- Pull Requestの一覧（`/pulls`とそのタブ（`/pulls/inbox`など）、`/<owner>/<name>/pulls`とその`/<user>`、`/<filter>/<user>`のパス。クエリのフィルターの有無は問いません）では各行のメタデータの右端に小さなserpiffのロゴのボタンを足します。ここではツールバーのボタンは無効のままです（1つのPull Requestではないため）。
- ほかのすべてのページではツールバーのボタンは無効（グレー）で、何も足しません。
- serpiffに渡すURLはいつも`https://github.com/<owner>/<name>/pull/<n>`の形に正規化します（末尾のスラッシュ、サブパス、クエリ、フラグメントは付けません）。

GitHubはページを読み込み直さずに移動します。拡張はその移動にも追従します。

## 必要なもの

- serpiff 0.3.9以降。この拡張を内蔵し、`serpiff://`のURLスキームを登録する、アプリのserpiff（`.app`）が必要です。serpiffが起動していなければmacOSが起動します。`serpiffd serve`と`app:dev`のビルドはこのスキームを受け取りません。
- Pull Requestのリポジトリが、あらかじめserpiffに登録されていること。

## インストール

この拡張はChromeウェブストアでは配布していません。serpiffのアプリが拡張を内蔵していて、起動のたびに`~/.local/share/serpiff/chrome-extension/`へ書き出します。[serpiff.com](https://serpiff.com/#chrome)にも同じ手順があります。

1. serpiffを一度起動します。
2. `chrome://extensions`を開き、デベロッパーモードをオンにします。
3. serpiffのメニューの「ヘルプ」→「Chrome拡張をFinderで表示」を選び、Chromeで「パッケージ化されていない拡張機能を読み込む」を選んでそのフォルダーを指定します。フォルダーは隠しフォルダーの`.local`の中にあるので、Finderからダイアログにドラッグするか、パスを⌘⇧Gで貼ってください。
4. GitHubのPull Requestを開き、ツールバーのserpiffのボタンをクリックします（パズルのピースのメニューからピン留めできます）。

拡張をインストールしたり読み込み直したりしたら、すでに開いているGitHubのタブを再読み込みしてください。

更新するには、serpiffを更新し（起動のときにフォルダーを書き直します）、`chrome://extensions`でserpiffの再読み込みボタン（↻）をクリックします。フォルダーは動かさないでください（Chromeはそこから読みます）。

Chromeウェブストアの版を入れていた場合は、この版を読み込む前に削除してください。IDが違うので、両方あるとボタンが2つ出ます。

ページ上のボタンはgithub.comから`serpiff://`を開くので、Chromeはサイトごとにserpiffを開くかを尋ねます。「常に許可」を選べます。ツールバーのボタンは拡張から開くので、Chromeの尋ね方が違う場合があります（毎回尋ねられるかもしれません）。尋ねられたら許可してください。

## 権限

- コンテンツスクリプトは`https://github.com/*`だけで動きます。ページ自身のURLを読み、ページ上のボタンを足します。
- ホストの権限、`tabs`、ネットワークへのアクセス、ストレージは使いません。
- サービスワーカーはPRのページだと知らせてきたタブのツールバーのボタンを有効または無効にし、ボタンが押されたらそのタブを`serpiff://`のURLに移動させるだけです。

## 対応していないもの

- Pull Request以外（Issue、ブランチ、比較のページ）。
- GitHub Enterprise（`github.com`以外のホスト）。

## テスト

依存はありません。Node 24以降が必要です。このフォルダー（serpiff/serpiffでは`chrome/`、ソースのリポジトリでは`integrations/chrome/`）で実行します。

```sh
node --test
```

`tests/normalize.test.mjs`は`normalize.js`のURLの正規化を調べます。

## ライセンス

MIT。[`LICENSE`](LICENSE)をご覧ください。
