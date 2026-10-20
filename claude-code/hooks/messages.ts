// The mod's own texts in the two languages serpiff shows (design.md §35 "文言の言語").
// The mod does not read anything outside this folder, so the dictionary lives here.

export type Language = 'en' | 'ja'

const messages = {
  en: {
    'footer.progress': '{filesViewed}/{filesTotal} ({viewed}/{total}) viewed',
    'footer.none': 'no changes',
    'command.description': 'Open this worktree (or a PR / branch) as a review session in serpiff',
    'run.opened': 'Opened in serpiff.',
    'run.exited': 'serp exited with {code}',
    'run.failed': 'Could not run serp: {reason}',
  },
  ja: {
    'footer.progress': '{filesViewed}/{filesTotal} ({viewed}/{total})がViewed',
    'footer.none': '変更なし',
    'command.description': 'このワークツリー（またはPR / ブランチ）をserpiffのレビューセッションとして開く',
    'run.opened': 'serpiffで開きました。',
    'run.exited': 'serpが終了コード{code}で終了しました',
    'run.failed': 'serpを実行できませんでした（{reason}）',
  },
} as const satisfies Record<Language, Record<string, string>>

export type MessageKey = keyof (typeof messages)['en']

export const dictionary: Record<Language, Record<MessageKey, string>> = messages

// One scan over the template: a `{name}` inside an inserted value is never looked at again,
// and a name without a value stays as written.
export const t = (
  language: Language,
  key: MessageKey,
  values: Record<string, string | number> = {},
): string =>
  dictionary[language][key].replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : whole,
  )

// `ja` is Japanese; any other value, known or not, is English.
export const fromCode = (code: string): Language => (code === 'ja' ? 'ja' : 'en')

// The first element of `defaults read -g AppleLanguages` output, e.g. `(\n    "ja-JP"\n)`.
// Like the server's `Lang::from_locale`: the part before the first `-` `_` `.` `@`, compared
// without regard to case, is `ja` for Japanese; anything else is English.
export const fromAppleLanguages = (stdout: string): Language => {
  const first = /^\s*\(\s*"?([^",\s)]+)/.exec(stdout)?.[1] ?? ''
  return first.split(/[-_.@]/)[0].toLowerCase() === 'ja' ? 'ja' : 'en'
}
