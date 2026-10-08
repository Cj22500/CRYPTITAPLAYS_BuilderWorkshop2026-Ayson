import { useState, type CSSProperties, type PointerEvent } from 'react';
import '../styles/workshop-bugs.css';

type WorkshopBugsProps = {
  motionLocked: boolean;
};

// Challenge 1: these guests deliberately return. Remove this component's
// integration in ProfileCard to evict them permanently; spinning only scares them.
export function WorkshopBugs({ motionLocked }: WorkshopBugsProps) {
  const [positions, setPositions] = useState<Record<number, { x: number; y: number }>>({});

  return (
    <div className={`workshop-bugs${motionLocked ? ' is-scattered' : ''}`} aria-hidden="true">
      {[0, 1, 2].map((bug) => (
        <span
          className="workshop-bugs__flight"
          key={bug}
          onPointerEnter={(event: PointerEvent<HTMLSpanElement>) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            const dx = bounds.left + bounds.width / 2 - event.clientX;
            const dy = bounds.top + bounds.height / 2 - event.clientY;
            const distance = Math.hypot(dx, dy) || 1;
            setPositions((previous) => ({
              ...previous,
              [bug]: {
                x: Math.max(-48, Math.min(48, (previous[bug]?.x ?? 0) + (dx / distance) * 18)),
                y: Math.max(-48, Math.min(48, (previous[bug]?.y ?? 0) + (dy / distance) * 18)),
              },
            }));
          }}
          style={{
            translate: `${positions[bug]?.x ?? 0}px ${positions[bug]?.y ?? 0}px`,
          } as CSSProperties}
        >
          <svg className="workshop-bugs__insect" viewBox="0 0 64 64" focusable="false">
            <g fill="none" stroke="#18222b" strokeWidth="3" strokeLinecap="round">
              <path d="M26 28 14 21M25 35 11 35M27 42 16 51M38 28 50 21M39 35 53 35M37 42 48 51" />
              <path d="M28 18 24 10M36 18 40 10" />
            </g>
            <g className="workshop-bugs__wings" fill="#d8f6ff" fillOpacity=".85" stroke="#8cc3d0" strokeWidth="1.5">
              <ellipse cx="23" cy="31" rx="10" ry="16" transform="rotate(-32 23 31)" />
              <ellipse cx="41" cy="31" rx="10" ry="16" transform="rotate(32 41 31)" />
            </g>
            <g className="workshop-bugs__body">
              <ellipse cx="32" cy="37" rx="9" ry="15" fill="#24333d" />
              <path d="M25 35h14M26 42h12" stroke="#f4bf50" strokeWidth="4" />
              <circle cx="32" cy="22" r="8" fill="#24333d" />
              <g className="workshop-bugs__eyes">
                <circle cx="28" cy="21" r="2.5" fill="#effcff" />
                <circle cx="36" cy="21" r="2.5" fill="#effcff" />
              </g>
            </g>
          </svg>
        </span>
      ))}
    </div>
  );
}
