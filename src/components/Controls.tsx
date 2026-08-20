import type { Phase, View } from '../types'

interface ControlsProps {
  view: View
  onView: (v: View) => void
  phase: Phase
  onReveal: () => void
  onNext: () => void
  onRedeal: () => void
}

export default function Controls({ view, onView, phase, onReveal, onNext, onRedeal }: ControlsProps) {
  return (
    <div className="controls">
      <div className="viewtoggle" role="tablist" aria-label="สลับมุมมอง">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'guess'}
          className={view === 'guess' ? 'on' : ''}
          onClick={() => onView('guess')}
        >
          🕵 มุมคนทาย
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'psy'}
          className={view === 'psy' ? 'on' : ''}
          onClick={() => onView('psy')}
        >
          🔮 มุมคนใบ้
        </button>
      </div>

      {phase === 'revealed' ? (
        <button type="button" className="btn primary" onClick={onNext}>
          🎲 เล่นรอบต่อไป
        </button>
      ) : (
        <>
          {phase === 'guessing' && (
            <button type="button" className="btn primary" onClick={onReveal}>
              🎉 เฉลย!
            </button>
          )}
          <button type="button" className="btn gold" onClick={onRedeal}>
            🎲 เปลี่ยนโจทย์
          </button>
        </>
      )}
    </div>
  )
}
