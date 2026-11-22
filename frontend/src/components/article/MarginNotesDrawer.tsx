/**
 * frontend/src/components/article/MarginNotesDrawer.tsx
 * Broadsheet Margin Notes & Highlighting Drawer (PRD Master Expansion #13).
 * Enables marginalia and note annotations on articles with local persistence.
 */
import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { triggerHaptic } from '../../lib/haptics';
import { Edit3, Trash2, X, Plus } from 'lucide-react';

const NOTE_COLORS = [
  { id: 'ochre', name: 'Ochre Ink', border: 'border-amber-500', bg: 'bg-amber-100/70 text-amber-950' },
  { id: 'crimson', name: 'Crimson Stamp', border: 'border-red-600', bg: 'bg-red-100/70 text-red-950' },
  { id: 'sepia', name: 'Sepia Press', border: 'border-stone-500', bg: 'bg-stone-200/70 text-stone-900' },
  { id: 'sage', name: 'Sage Leaf', border: 'border-emerald-600', bg: 'bg-emerald-100/70 text-emerald-950' },
];

export const MarginNotesDrawer: React.FC = () => {
  const isOpen = useAppStore((s) => s.isMarginNotesOpen);
  const setIsOpen = useAppStore((s) => s.setIsMarginNotesOpen);
  const selectedArticle = useAppStore((s) => s.selectedArticle);
  const articleNotes = useAppStore((s) => s.articleNotes);
  const addArticleNote = useAppStore((s) => s.addArticleNote);
  const deleteArticleNote = useAppStore((s) => s.deleteArticleNote);

  const [noteText, setNoteText] = useState('');
  const [selectedColor, setSelectedColor] = useState('ochre');

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen || !selectedArticle) return null;

  const currentNotes = articleNotes[selectedArticle.id] || [];

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    triggerHaptic('snap');
    addArticleNote(selectedArticle.id, {
      text: noteText.trim(),
      color: selectedColor,
    });
    setNoteText('');
  };

  return (
    <div
      id="margin-notes-backdrop"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
    >
      <div
        id="margin-notes-drawer"
        className="w-full max-w-sm h-full bg-paper border-l-2 border-ink shadow-2xl p-5 flex flex-col justify-between text-ink animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-paper-border mb-4">
            <div className="flex items-center gap-2">
              <Edit3 size={16} className="text-accent" />
              <h2 className="font-masthead text-sm font-bold uppercase tracking-wider text-ink">
                Editorial Marginalia
              </h2>
            </div>
            <button
              onClick={() => {
                triggerHaptic('light');
                setIsOpen(false);
              }}
              className="p-1 rounded-xs hover:bg-paper-alt text-ink-secondary hover:text-ink cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="text-xs font-serif italic text-ink-secondary mb-4 line-clamp-1 border-b border-paper-border pb-2">
            Ref: {selectedArticle.title_english}
          </div>

          {/* New Note Input Form */}
          <form onSubmit={handleAddNote} className="mb-5 space-y-2.5">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Inscribe editorial margin note or citation..."
              rows={3}
              className="w-full p-2.5 bg-paper-alt border border-paper-border focus:border-ink rounded-xs font-serif text-xs text-ink placeholder:text-ink-muted outline-none resize-none"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c.id)}
                    className={`w-5 h-5 rounded-full border-2 transition-all ${c.bg} ${
                      selectedColor === c.id ? `${c.border} scale-110 shadow-xs ring-1 ring-ink` : 'border-transparent opacity-60'
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
              <button
                type="submit"
                disabled={!noteText.trim()}
                className="inline-flex items-center gap-1 px-3 py-1 bg-ink text-paper text-xs font-mono font-bold uppercase tracking-wider rounded-xs hover:bg-accent transition-colors disabled:opacity-40 cursor-pointer"
              >
                <Plus size={12} />
                <span>Inscribe</span>
              </button>
            </div>
          </form>

          {/* Existing Notes List */}
          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
            {currentNotes.length === 0 ? (
              <div className="text-center py-10 font-serif italic text-ink-muted text-xs border border-dashed border-paper-border rounded-xs">
                No marginalia inscribed for this dispatch yet.
              </div>
            ) : (
              currentNotes.map((note) => {
                const colorDef = NOTE_COLORS.find((c) => c.id === note.color) || NOTE_COLORS[0];
                return (
                  <div
                    key={note.id}
                    className={`p-3 rounded-xs border-l-4 border shadow-2xs relative group ${colorDef.border} ${colorDef.bg}`}
                  >
                    <p className="font-serif text-xs leading-relaxed pr-6">{note.text}</p>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-black/10 font-mono text-[9px] text-ink-muted">
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                      <button
                        onClick={() => {
                          triggerHaptic('light');
                          deleteArticleNote(selectedArticle.id, note.id);
                        }}
                        className="text-ink-muted hover:text-red-700 transition-colors p-0.5"
                        title="Delete note"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-paper-border text-center font-mono text-[10px] text-ink-muted">
          Broadsheet Ink Notes • Preserved Locally
        </div>
      </div>
    </div>
  );
};
