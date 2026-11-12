import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ui } from '../components/ui.js'
import { readTextFile } from '../lib/decodeFile.js'
import { errorMessage } from '../lib/errors.js'
import { useCreateText, useImportText, useRemoveText, useRenameText, useTexts } from '../queries/texts.js'

const SAMPLE = `今日は朝早く起きて、駅まで歩きました。
電車の中で日本語の本を読んでいます。
新しい言葉を覚えるのは楽しいです。`

const KIND_LABEL = { paste: 'Text', srt: 'SRT', vtt: 'VTT', ass: 'ASS', lyrics: 'Lyrics', article: 'Article' }
const ACCEPT = '.srt,.vtt,.ass,.ssa,.txt'

export default function Library() {
  const navigate = useNavigate()
  const texts = useTexts()
  const create = useCreateText()
  const importText = useImportText()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [dragging, setDragging] = useState(false)
  const [importError, setImportError] = useState(null)
  const fileInput = useRef(null)
  const open = (t) => navigate(`/reader/${t.id}`)

  const importFile = async (file) => {
    setImportError(null)
    if (!file) return
    if (file.size > 5_000_000) return setImportError('That file is too large (max 5 MB).')
    try {
      const text = await readTextFile(file)
      importText.mutate({ name: file.name, content: text }, { onSuccess: open })
    } catch (err) {
      setImportError(errorMessage(err))
    }
  }

  const error = create.error ?? importText.error
  return (
    <div className={ui.page}>
      <h1 className={ui.h1}>Reader</h1>
      <p className={ui.sub}>Paste Japanese text (lyrics, an article) or open a subtitle file (.srt, .vtt, .ass).</p>

      <form
        className={`mt-4 rounded-xl border-2 border-dashed p-4 ${dragging ? 'border-accent bg-accent-soft' : 'border-transparent'}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          importFile(e.dataTransfer.files[0])
        }}
        onSubmit={(e) => {
          e.preventDefault()
          create.mutate({ title, content }, { onSuccess: open })
        }}
      >
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className={`${ui.input} w-full`} />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          placeholder="ここに日本語のテキストを貼り付けてください (or drop a subtitle file here)"
          className={`${ui.input} mt-2 w-full text-lg leading-relaxed`}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="submit" className={ui.primary} disabled={!content.trim() || create.isPending}>
            Read
          </button>
          <button type="button" className={ui.secondary} onClick={() => fileInput.current.click()} disabled={importText.isPending}>
            {importText.isPending ? 'Importing…' : 'Open file…'}
          </button>
          <button type="button" className={ui.ghost} onClick={() => setContent(SAMPLE)}>
            Use sample text
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            className="hidden"
            data-testid="file-input"
            onChange={(e) => {
              importFile(e.target.files[0])
              e.target.value = ''
            }}
          />
        </div>
        {(error || importError) && <p className="mt-2 text-sm text-red-600">{importError ?? errorMessage(error)}</p>}
      </form>

      <h2 className="mt-8 font-bold">Your texts</h2>
      {texts.data?.length === 0 && <p className="mt-2 text-sm text-muted">Nothing here yet. Texts you read are kept here so you can come back to them.</p>}
      <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-panel empty:hidden">
        {texts.data?.map((t) => <TextRow key={t.id} text={t} />)}
      </ul>
    </div>
  )
}

function TextRow({ text }) {
  const rename = useRenameText()
  const remove = useRemoveText()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(text.title)
  const opened = text.lastOpenedAt ?? text.createdAt

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="w-12 shrink-0 rounded bg-paper px-1.5 py-0.5 text-center text-xs text-muted">{KIND_LABEL[text.kind] ?? text.kind}</span>
      {editing ? (
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            rename.mutate({ id: text.id, title }, { onSuccess: () => setEditing(false) })
          }}
        >
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className={`${ui.input} flex-1 py-1`} aria-label="New title" />
          <button className={ui.secondary}>Save</button>
          <button type="button" className={ui.ghost} onClick={() => setEditing(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <Link to={`/reader/${text.id}`} className="min-w-0 flex-1 truncate font-medium hover:text-accent">
          {text.title}
        </Link>
      )}
      <span className="shrink-0 text-xs text-muted tabular-nums">{text.length.toLocaleString()} chars</span>
      <span className="hidden shrink-0 text-xs text-muted md:inline">{new Date(opened).toLocaleDateString()}</span>
      {!editing && (
        <>
          <button className={ui.ghost} onClick={() => setEditing(true)}>
            Rename
          </button>
          <button
            className={ui.danger}
            onClick={() => {
              if (window.confirm(`Delete "${text.title}"? Saved words and their sentences are kept.`)) remove.mutate(text.id)
            }}
          >
            Delete
          </button>
        </>
      )}
    </li>
  )
}
