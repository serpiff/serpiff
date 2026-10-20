# serpiff for Claude Code

[English](README.md) | 日本語

Claude Codeのセッションからローカルで動くコードレビューツールの[serpiff](https://github.com/serpiff/serpiff)を使えるようにする、Claude Codeのmod（関数フックのプラグイン）です。

> Claude CodeのmodのAPIはアーリーアクセスで、リリースごとに変わることがあります。

## できること

- `/serpiff [<target>]`は`serp session add <target> --open`を実行して、serpiffでレビューのセッションを開きます。
  - 引数がない（または空白だけ）ときは`<target>`はセッションの作業ディレクトリになり、今のワークツリーを開きます。
  - 引数があるときは前後の空白を除いて1つの値として渡します。PR（`#12`）、ブランチ名、`<base>...<head>`が使えます。
- コマンドは`serp`をシェルを通さずに実行するので、引数がコマンドとして解釈されることはありません。
- `serp`の出力（stdout、続いてstderr）はセッションに表示します。モデルには何も送りません。serpiffがアプリとして動いているときはアプリが要求を受け付けた時点で`serp`が戻ります（`Opening in serpiff…`）。ブランチが存在しないなど、アプリが見つけたお知らせや失敗はアプリに表示されます。`serp`が出力なしで成功したときは`Opened in serpiff.`と表示します。`serp`が0以外のコードで終了したときの出力は`serp exited with <code>`と、そのstderr（stderrが空ならstdout）です。`serp`を起動できないとき、または60秒たっても動いているときの出力は`Could not run serp: <reason>`です。
- プロンプトのフッターのモードの欄（右端の薄い文字で、`focus`などの隣）にセッションのワークツリーのレビューがどこまで進んだかを表示します。`serp session status <cwd> --json`の結果を使います（タイムアウトは10秒、`<cwd>`は毎回読み直します）。
  - `<label> · <files_viewed>/<files_total> (<viewed>/<total>) viewed`（例: `PR #42 · 12/30 (76/88) viewed`は30ファイル中12ファイル、宣言などの88単位中76単位）。すべてViewedのときも同じ形（`PR #42 · 30/30 (88/88) viewed`）で、変更がないときは`<label> · no changes`です。`<label>`はPull Requestのセッションでは`PR #<n>`、ブランチのセッションではブランチ名です。ほかのモードの後ろに（` & `でつないで）足すので、行は増えず、警告の印も付きません。ラベルと`no changes`はほかのモードと同じく薄い色で、進み具合（`12/30 (76/88) viewed`）はテーマの`suggestion`の色（青）、すべてViewedのときは`success`の色（緑）なので、ライトとダークのテーマに従います。描画するのはターミナルとデスクトップの画面だけで、フッターはテキストが変わったときだけ描き直します。
  - 更新のタイミングはセッションの開始時、30秒ごと、メインのループのターン（サブエージェントのターンは含みません）の終わり、`/serpiff`の直後とその5秒後です（アプリでは`serp session add --open`が戻った直後にセッションができます）。更新は何も待たせません。セッションの開始、ターンの終わり、`/serpiff`の出力は`serp`を待ちません。
  - 同時に動く`serp session status`は1つだけです。実行中に来た要求は終わった後の1回の実行にまとめます。
  - serpiffが動いていない、ワークツリーのセッションがない、または`serp`が失敗するかタイムアウトしたときはモードを足しません。modはこのためにserpiffを起動せず（`serp session status`も起動しません）、セッションができたときにモードが出るよう、問い合わせを続けます。

- modの文（フッターの`viewed` / `no changes`、`/serpiff`の説明、`Opened in serpiff.`、`serp exited with <code>`、`Could not run serp: <reason>`）はserpiffの表示の言語（英語または日本語）に従います。言語は同じ`serp session status <cwd> --json`の出力の`language`から読みます（未知の値は英語）。そのため、アプリの言語の設定を変えると30秒以内（またはターンの終わり）に追いつき、言語が変わると`/serpiff`も新しい言語の説明で登録し直します。読めないとき（serpiffが動いていない、`serp`が失敗する、このフィールドのない古い`serp`）はOSの言語を使います（`defaults read -g AppleLanguages`の先頭の要素の言語の部分が`ja`（`ja-JP`など）なら日本語で、modを読み込むたびに1回だけ問い合わせます）。ラベル（`PR #<n>`またはブランチ名）、引数のヒント、`serp`自身の出力は訳しません。

## 必要なもの

- Claude Codeのセッションの`PATH`にある`serp`。serpiffが動いていなければ起動します。
- Claude Code 2.1.296（このmodで確かめたバージョン）。
- `/serpiff`にはserp 0.1.0以降、進み具合のモードにはserp 0.1.3以降（`serp session status`が入った最初のリリース）が必要です。古い`serp`ではモードを表示せず、`/serpiff`はこれまでどおり動きます。
- 文言をserpiffの言語に合わせる（フッターも`/serpiff`も）には、`session status --json`が`language`を出す`serp`が必要です。古い`serp`ではOSの言語を使います。
- CLIのセッション（modは`$.process.run`で`serp`を実行しますが、これはCLIでだけ使えます）。

## インストール

Claude Codeのターミナルのセッションで、次を実行します。

```
/plugin install serpiff --marketplace serpiff/serpiff
```

marketplaceを追加するか聞かれたら`y`と答え、範囲を選びます（既定はuserです）。

## 開発

チェックアウトからmodを1回だけ読み込むには次を実行します。

```sh
claude --plugin-dir <path-to-this-folder>
```

すべてのセッションで読み込むには`~/.claude/settings.json`の`env`に`CLAUDE_CODE_PLUGIN_DIRS`を設定します（値は絶対パスで`~`も使えます。複数はOSのパスの区切り（macOSとLinuxでは`:`）でつなぎます）。

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "<path-to-this-folder>"
  }
}
```

対話のセッションが`--plugin-dir`でmodを読み込むと、エンジンは`.claude-plugin/types/`に型定義を書き出し、modに`tsconfig.json`がないので、それを継承する`tsconfig.json`も書き出します。どちらも生成されるファイルで、このフォルダーの`.gitignore`に載っています。`-p`の実行や`claude plugin validate` / `claude plugin test`は何も書き出しません。

## 検査

```sh
claude plugin validate <path-to-this-folder>
claude plugin test <path-to-this-folder>
```

`tests/serpiff.test.ts`は`serp`をテスト用のフックに差し替えてエンジンに対して実行します。対話のセッションが`--plugin-dir`でmodを読み込んだ後（型定義が書き出されます）なら、`tsc -p <path-to-this-folder>`で型を検査することもできます。

## ライセンス

MIT。[`LICENSE`](LICENSE)をご覧ください。
