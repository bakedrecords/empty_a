import { useEffect, useRef } from 'react';
import {
  Renderer,
  Stave,
  StaveNote,
  Beam,
  Tuplet,
  Formatter,
  Voice,
  Annotation,
  Articulation,
} from 'vexflow';
import { Pattern, patternBeats } from '../data/patterns';

interface Props {
  pattern: Pattern;
  showSticking: boolean;
}

const DURATION: Record<number, string> = {
  2: '8',
  3: '8',
  4: '16',
  6: '16',
};

/** VexFlow による1段譜の描画（パーカッション単線譜） */
export function Notation({ pattern, showSticking }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = '';

    const beats = patternBeats(pattern);
    const containerWidth = host.clientWidth || 800;
    const width = Math.max(containerWidth - 4, 120 + pattern.notes.length * 34);
    const height = 170;

    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(width, height);
    const ctx = renderer.getContext();

    const stave = new Stave(8, 30, width - 16);
    stave.setNumLines(1);
    stave.addClef('percussion');
    stave.setContext(ctx).draw();

    const duration = DURATION[pattern.subdivision] ?? '16';

    const notes = pattern.notes.map((n) => {
      const sn = new StaveNote({ keys: ['b/4'], duration, stem_direction: 1 });
      if (n.accent) {
        sn.addModifier(new Articulation('a>').setPosition(3), 0);
      }
      if (showSticking) {
        const ann = new Annotation(n.hand)
          .setVerticalJustification(Annotation.VerticalJustify.BOTTOM);
        ann.setFont('Arial', 13, n.hand === 'R' ? 'bold' : 'normal');
        sn.addModifier(ann, 0);
      }
      return sn;
    });

    // 拍ごとにビーム（とタプレット）でまとめる
    const sub = pattern.subdivision;
    const beams: Beam[] = [];
    const tuplets: Tuplet[] = [];
    for (let i = 0; i < notes.length; i += sub) {
      const group = notes.slice(i, i + sub);
      if (group.length > 1) {
        beams.push(new Beam(group));
      }
      if (sub === 3 || sub === 6) {
        tuplets.push(
          new Tuplet(group, {
            num_notes: sub,
            notes_occupied: sub === 3 ? 2 : 4,
          }),
        );
      }
    }

    const voice = new Voice({ num_beats: beats, beat_value: 4 }).setStrict(false);
    voice.addTickables(notes);
    new Formatter().joinVoices([voice]).format([voice], width - 90);

    voice.draw(ctx, stave);
    beams.forEach((b) => b.setContext(ctx).draw());
    tuplets.forEach((t) => t.setContext(ctx).draw());
  }, [pattern, showSticking]);

  return <div className="notation" ref={hostRef} />;
}
