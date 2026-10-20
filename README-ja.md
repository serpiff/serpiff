<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://serpiff.com/img/readme/serpiff-wordmark-dark-tight.svg">
  <img src="https://serpiff.com/img/readme/serpiff-wordmark-light-tight.svg" alt="serpiff" width="270">
</picture>

[English](https://github.com/serpiff/serpiff/blob/main/README.md) | 日本語

GitHubのPull Requestをローカルで効率的にレビューするためのツールです。Pull Requestとローカルのブランチを関数や型などの宣言ごとに読み進められます。

- ダウンロードと使い方: <https://serpiff.com>
- 配布物: [Releases](https://github.com/serpiff/serpiff/releases/latest)

このリポジトリには配布物、サイトの公開に使うファイル、Claude Codeのmod、Chrome拡張だけを置いています。**アプリのソースコードは公開していません。**`claude-code/`にあるClaude Codeのmodと`chrome/`にあるChrome拡張はMITライセンスです。

## インストール

Appleシリコンを搭載したMac（macOS 27.0以降）が対象です。`git`と`gh`がインストールされPATHが通っていて、`gh auth login`でログインしている必要があります。ターミナルで次のコマンドを実行します。

```
gh release download -R serpiff/serpiff -p install.sh -O - | sh
```

dmgを手動でインストールする手順など、詳しくは[serpiff.com](https://serpiff.com/#install)をご覧ください。

## 名前の由来

**serpiff**は*serpit*（ラテン語で「這う」）と*diff*を合わせた名前で、ロゴと同じく蛇を表しています。

## ロゴ

「蛇に睨まれた蛙」ということわざは蛇に睨まれて身がすくみ、動けなくなった蛙を指します。serpiffのロゴではS字の蛇が蛙の代わりにdiff（削除された1行と追加された1行）を睨んでいます。差分のどこも見逃さないというレビュアーの視線を表しています。

## 機能紹介

### 宣言ごとのViewed

GitHubのViewedはファイル単位ですが、serpiffではもっと細かく付けられます。Goでは変更された宣言（関数、メソッド、型など）ごとに、Markdownでは変更されたセクションごとにViewedのチェックボックスがあります。チェックすると宣言は1行に畳まれ、ファイル内の変更された宣言がすべてViewedになると、ファイル全体が畳まれます。

<kbd>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://serpiff.com/img/readme/viewed-dark.gif">
  <img src="https://serpiff.com/img/readme/viewed-light.gif" alt="Greet、titleCase、FarewellをViewedにすると、それぞれが畳まれ、最後にファイル全体が畳まれる">
</picture>
</kbd>

### 処理の流れを追いながらのレビュー

呼び出しをCtrl+クリック（macOSではCmd+クリック）すると、その行のすぐ下に定義が開きます（ピーク）。開いた定義の中でも次の呼び出しを開け、コードの続く限り深くたどれます。変更された宣言のピークにはそれぞれViewedのチェックボックスがあり、チェックするとそのピークと、まわりのViewedになった階層もまとめて閉じ、まだ読む必要のある階層まで戻ります。

<kbd>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://serpiff.com/img/readme/peek-dark.gif">
  <img src="https://serpiff.com/img/readme/peek-light.gif" alt="Greet、titleCase、splitWordsをCtrl+クリックして3つのピークを入れ子に開き、それぞれをViewedにすると閉じる">
</picture>
</kbd>

### Markdownを描画したまま読む

Markdownファイルの差分は生のソースではなく描画した文書としてブロックごとに比べます。描画された画面のまま、段落、リストの項目、表の行、コードの行にコメントできます。セクションごとにViewedにでき、正確な行を見たいときはソースの表示に切り替えられます。

<kbd>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://serpiff.com/img/readme/markdown-dark.gif">
  <img src="https://serpiff.com/img/readme/markdown-light.gif" alt="描画したMarkdownの差分にコメントを追加して開く">
</picture>
</kbd>

### インデントだけの変更を読みやすく

コードを新しいブロックで囲むと、実際に変わったのは囲む側の行だけでも、GitHubは中の行をすべて削除して追加し直したものとして表示します。serpiffは先頭の空白を除いた内容で行を対応づけるので、本当に追加、削除、変更された行だけが緑か赤で強調されます。インデントが変わっただけの行は薄く表示され、増えたり減ったりしたスペース（`·`）やタブ（`→`）が1文字ずつ印で示されます。変わるのは見せ方だけです。インデントだけが変わった行も変更として数えられ、隠されずに表示され、Viewedにする必要があります。

<kbd>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://serpiff.com/img/readme/indent-dark.png">
  <img src="https://serpiff.com/img/readme/indent-light.png" alt="コンポーネントのマークアップを新しいdivと条件分岐で囲んだ差分。新しい行とh2からh3への変更だけが緑で、間にあるインデントだけが変わった行は薄く表示され、増えたインデントが印で示されている">
</picture>
</kbd>

### 常に新しい差分だけを表示

Viewedにした宣言がその後のpushで変更されると、serpiffは`!`の印を付け、ベースとの差分全体ではなく、Viewedにした時点から今までの差分として開きます。見出しの行は左がViewedにしたときのバージョン、右が今のバージョンであることを示します。すでに読んだ行は色が付かず、削除された行を含め、それ以降に変わったところだけが強調されます。Gitの履歴には依存しません。Viewedにした瞬間の宣言そのもののテキストをserpiffが保存しているので、force pushやrebase、squashでViewedにしたときのコミットが消えても、その時点からの差分を表示できます。`from viewed`と`from base`の切り替えで、宣言ごとにベースとの差分全体に戻せ、`s`キーで印の付いたすべての宣言をまとめて切り替えられます。

<kbd>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://serpiff.com/img/readme/since-viewed-dark.gif">
  <img src="https://serpiff.com/img/readme/since-viewed-light.gif" alt="Loadとファイル先頭のimportが、どちらも「Since last viewed」の見出しで開く。左はViewedにしたとき、右は今。importの切り替えは常にfrom viewedのままで、Viewedにしてからlogがfmtに替わったことを示す。Loadの切り替えはfrom viewedとfrom baseを行き来し、from viewedではViewedにしてから変わったところ（削除されたlog.Printfの行と、fmt.Errorfに書き換えられたエラー）だけに色が付き、from baseではベースとの差分全体（data = normalize(data)の行も）に色が付く。normalizeとparseはそのpushで変わっていないので、Viewedのまま畳まれている">
</picture>
</kbd>

### Storybookを比較

差分にStorybookのストーリーのファイル、またはそれと対になるコンポーネント（`Button.stories.tsx`に対する`Button.tsx`）が含まれると、そのファイルのヘッダーに`▶ Stories`の切り替えが出ます。オンにすると差分の下にパネルが開き、各ストーリーのベースとヘッドを並べて描画します。propsやマークアップの変更で見た目がどう変わったかをそのコードを読みながら確かめられます。ストーリーのビルドではPull Requestのコードが動くため、ビルドするのは信頼されたセッション（自分のPull Request、ローカルのブランチ、外部のワークツリー、明示的に信頼したもの）だけです。それ以外では、パネルがまずセッションを信頼するよう求めます。

<kbd>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://serpiff.com/img/readme/storybook-dark.png">
  <img src="https://serpiff.com/img/readme/storybook-light.png" alt="Button.stories.tsxの差分（Primaryのargsが変更されている）と、その下に開いたStoriesパネル。PrimaryとSecondaryのベースとヘッドが並び、Button.tsxの変更ですべてのヘッドのボタンの見た目が変わっている">
</picture>
</kbd>

## 対応言語

次の言語のファイルは宣言（Markdownではセクション）ごとに分割され、それぞれにViewedのチェックボックスが付きます。ホバーで出るドキュメント、ピーク、Callsのツリーは表の言語サーバーが提供します。

| 言語       | 拡張子                             | 言語サーバー                | 信頼が必要 |
| ---------- | ---------------------------------- | --------------------------- | ---------- |
| C / C++    | `.c`, `.cpp`, `.cc`, `.hpp`, `.h`  | clangd                      | はい       |
| C#         | `.cs`                              | roslyn-language-server      | はい       |
| Go         | `.go`                              | gopls                       | いいえ     |
| Java       | `.java`                            | jdtls                       | はい       |
| JavaScript | `.js`, `.jsx`, `.mjs`, `.cjs`      | tsc (TypeScript 7, `--lsp`) | いいえ     |
| Kotlin     | `.kt`, `.kts`                      | kotlin-lsp                  | はい       |
| Markdown   | `.md`, `.markdown`                 | —                           | —          |
| Perl       | `.pl`, `.pm`, `.t`, `.PL`, `.psgi` | perl-lsp                    | いいえ     |
| Python     | `.py`, `.pyi`                      | ty                          | いいえ     |
| Rust       | `.rs`                              | rust-analyzer               | はい       |
| Swift      | `.swift`                           | sourcekit-lsp               | はい       |
| TypeScript | `.ts`, `.mts`, `.cts`, `.tsx`      | tsc (TypeScript 7, `--lsp`) | いいえ     |

信頼が必要な言語の言語サーバーは信頼されたセッション（自分のPull Request、ローカルのブランチ、外部のワークツリー、明示的に信頼したもの）でだけ起動します。起動するだけでPull Requestのコードが実行されることがあるためです。C#ではMSBuildのファイル、NuGetのリストア、アナライザーとソースジェネレーター、C / C++ではソースとヘッダーを読むclangのフロントエンド全体、JavaではGradleまたはMavenのビルド、KotlinではGradleのビルド、Rustではビルドスクリプトとprocマクロ、Swiftでは`Package.swift`、マクロ、ビルドプラグインが該当します。

C / C++には`compile_commands.json`（CMake、Meson、Bearなどで作れます）も必要で、ワークツリーか元のリポジトリに置きます。serpiffは作成しないので、ないときは作り方を案内します。

> [!NOTE]
> 上の画像やアニメーションは最新のバージョンと異なる場合があります。

## Claude Codeのmod

Claude Codeのターミナルのセッションで`/serpiff`を実行すると、ワークツリーやPull Requestをserpiffで開けます。プロンプトのフッターには、セッションのワークツリーのレビューがどこまで進んだかをViewedの数で表示します。進み具合の表示にはserpiff 0.1.3以降が必要です。Claude Codeで次のコマンドを実行して入れます。

```
/plugin install serpiff --marketplace serpiff/serpiff
```

marketplaceを追加するか聞かれたら`y`と答え、入れる範囲を選びます。詳しくは[`claude-code/README-ja.md`](https://github.com/serpiff/serpiff/blob/main/claude-code/README-ja.md)をご覧ください。

## Chrome拡張

GitHubのPull Requestのページで、ツールバーのボタンかヘッダーのserpiffのロゴのボタン（Pull Requestの一覧では各行の右端のロゴのボタン）から、そのPull Requestをserpiffで開けます。serpiff 0.1.4以降が必要です。`git clone --depth 1 https://github.com/serpiff/serpiff`でこのリポジトリを手元に置き、`chrome://extensions`でデベロッパーモードをオンにして、「パッケージ化されていない拡張機能を読み込む」で`chrome/`を選びます。詳しくは[`chrome/README-ja.md`](https://github.com/serpiff/serpiff/blob/main/chrome/README-ja.md)をご覧ください。

## 問い合わせ

使い方や不具合の問い合わせはsupport@serpiff.comで受け付けますが、サポートは約束しておらず（[使用許諾契約書](https://serpiff.com/legal/eula)第10条）、答えるかどうかは提供者の判断によります。解約・返金と個人情報に関する請求は、使用許諾契約書とプライバシーポリシーのとおりに扱います。

- [使用許諾契約書](https://serpiff.com/legal/eula)
- [プライバシーポリシー](https://serpiff.com/legal/privacy)
- [特定商取引法に基づく表記](https://serpiff.com/legal/tokushoho)
