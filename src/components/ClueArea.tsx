import AvatarIcon from './AvatarIcon'

interface ClueAreaProps {
  /** input = คนใบ้กำลังพิมพ์คำใบ้ · show = แสดงคำใบ้ที่ส่งแล้ว/รออยู่ */
  mode: 'input' | 'show'
  psychicAvatar: string
  clue: string
  draft: string
  onDraft: (s: string) => void
  onSubmit: () => void
}

export default function ClueArea({ mode, psychicAvatar, clue, draft, onDraft, onSubmit }: ClueAreaProps) {
  if (mode === 'input') {
    return (
      <div className="cluerow">
        <form
          className="clue-input"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <div className="clue-line">
            <span className="clue-av" aria-hidden>
              <AvatarIcon avatar={psychicAvatar} />
            </span>
            <input
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              maxLength={40}
              placeholder="พิมพ์คำใบ้ของคุณเช่น “ผู้หญิงบอกว่าไม่ได้เป็นไร”"
              aria-label="ช่องพิมพ์คำใบ้"
              autoFocus
            />
          </div>
          <button type="submit" className="btn teal" disabled={!draft.trim()}>
            ส่งคำใบ้ ➜
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="cluerow">
      <span className="clue-av" aria-hidden>
        <AvatarIcon avatar={psychicAvatar} />
      </span>
      <div className="bubble">
        <span className="lab">คำใบ้:</span>
        {clue ? <span className="word">“{clue}”</span> : <span className="word waiting">รอคำใบ้…</span>}
      </div>
    </div>
  )
}
