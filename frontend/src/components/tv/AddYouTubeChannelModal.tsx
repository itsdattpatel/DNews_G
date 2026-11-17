/**
 * frontend/src/components/tv/AddYouTubeChannelModal.tsx
 * Broadsheet modal for previewing and adding custom YouTube live streams / channels (PRD A Category 6).
 */
import React, { useState } from 'react';
import { X, Youtube, Eye, CheckCircle2, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import type { TvChannel } from '../../types';

interface AddYouTubeChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChannelAdded: (channel: TvChannel) => void;
}

export const AddYouTubeChannelModal: React.FC<AddYouTubeChannelModalProps> = ({
  isOpen,
  onClose,
  onChannelAdded,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Form fields
  const [channelName, setChannelName] = useState('');
  const [country, setCountry] = useState('Global');
  const [category, setCategory] = useState('News');
  const [canonicalChannelId, setCanonicalChannelId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handlePreview = async () => {
    let cleanInput = urlInput.trim();
    const iframeMatch = cleanInput.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (iframeMatch && iframeMatch[1]) {
      cleanInput = iframeMatch[1].trim();
    }

    if (!cleanInput) {
      setPreviewError('Please enter a YouTube video URL, embed code, or @handle.');
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);

    try {
      const res = await fetch('/api/tv/preview-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanInput }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setPreviewError(data.error || 'Failed to inspect YouTube source.');
      } else {
        setPreviewData(data);
        setChannelName(data.title || data.author_name || '');
        if (data.youtube_channel_id) {
          setCanonicalChannelId(data.youtube_channel_id);
        }
      }
    } catch (err: any) {
      setPreviewError(`Network error resolving preview: ${err.message}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) {
      toast.error('Channel name is required.');
      return;
    }

    if (previewData?.requires_channel_id && !canonicalChannelId.trim()) {
      toast.error('Please provide the canonical YouTube Channel ID (starting with UC) to embed this handle.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: channelName.trim(),
        country,
        category,
        website: previewData?.author_url || urlInput.trim(),
        logo_url: previewData?.thumbnail_url || null,
        evidence: `Custom added YouTube broadcast: ${urlInput.trim()}`,
      };

      if (previewData?.type === 'video' && previewData?.youtube_video_id) {
        payload.youtube_video_id = previewData.youtube_video_id;
        payload.youtube_live_url = previewData.embed_url;
        payload.stream_url = previewData.embed_url;
      } else if (canonicalChannelId.trim()) {
        payload.youtube_channel_id = canonicalChannelId.trim();
        payload.youtube_live_url = `https://www.youtube.com/embed/live_stream?channel=${canonicalChannelId.trim()}&autoplay=1&enablejsapi=1`;
        payload.stream_url = payload.youtube_live_url;
      } else if (previewData?.embed_url) {
        payload.youtube_live_url = previewData.embed_url;
        payload.stream_url = previewData.embed_url;
      }

      const res = await fetch('/api/tv/custom-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create channel');
      }

      const newChannel: TvChannel = await res.json();
      toast.success(`Channel "${newChannel.name}" successfully added to broadcast wire.`);
      onChannelAdded(newChannel);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error saving custom channel');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="modal-add-youtube-stream"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-add-youtube-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-xs select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-paper text-ink border-2 border-ink rounded-xs shadow-overlay flex flex-col overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="p-4 border-b-2 border-ink bg-paper-alt flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Youtube size={18} className="text-accent" />
            <h2
              id="modal-add-youtube-heading"
              className="font-headline text-lg font-bold tracking-tight text-ink"
            >
              Add YouTube Live Broadcast
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 border border-paper-border hover:border-ink rounded-xs text-ink-secondary hover:text-ink transition-colors"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </header>

        {/* Content */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto">
          {/* Step 1: Input URL */}
          <div className="space-y-1.5">
            <label
              htmlFor="input-youtube-url"
              className="font-ui text-xs font-bold uppercase tracking-wider text-ink-secondary block"
            >
              YouTube Link, Embed Code, or @Handle
            </label>
            <div className="flex gap-2">
              <input
                id="input-youtube-url"
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="e.g. https://www.youtube.com/watch?v=..., <iframe ...>, or @handle"
                className="flex-1 px-3 py-1.5 bg-paper-alt border border-paper-border focus:border-ink rounded-xs font-mono text-xs text-ink placeholder:text-ink-muted focus:outline-none"
              />
              <button
                type="button"
                id="btn-preview-youtube"
                onClick={handlePreview}
                disabled={previewLoading || !urlInput.trim()}
                className="px-3 py-1.5 border border-ink bg-paper-alt hover:bg-paper font-ui font-bold text-xs uppercase tracking-wider text-ink rounded-xs inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Eye size={13} className={previewLoading ? 'animate-spin' : ''} />
                <span>{previewLoading ? 'Checking...' : 'Preview'}</span>
              </button>
            </div>
            <p className="font-ui text-[0.6875rem] text-ink-muted">
              Accepts video links, full &lt;iframe&gt; embed snippets, channel URLs, or official @handles.
            </p>
          </div>

          {/* Preview Error */}
          {previewError && (
            <div className="p-3 border border-negative/50 bg-negative/10 text-negative rounded-xs font-ui text-xs flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{previewError}</span>
            </div>
          )}

          {/* Preview Card */}
          {previewData && (
            <div className="p-3 border border-paper-border bg-paper-alt rounded-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-paper-border pb-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-positive flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  <span>Preview Verified ({previewData.type.toUpperCase()})</span>
                </span>
                {previewData.author_url && (
                  <a
                    href={previewData.author_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-ui text-[11px] text-ink-secondary hover:text-ink inline-flex items-center gap-1"
                  >
                    <span>View Channel</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>

              <div className="flex gap-3">
                {previewData.thumbnail_url && (
                  <img
                    src={previewData.thumbnail_url}
                    alt={previewData.title}
                    className="w-24 h-16 object-cover rounded-xs border border-paper-border shrink-0"
                  />
                )}
                <div className="min-w-0 space-y-0.5">
                  <h4 className="font-headline text-xs font-bold text-ink line-clamp-2">
                    {previewData.title}
                  </h4>
                  <p className="font-ui text-[11px] text-ink-secondary truncate">
                    {previewData.author_name}
                  </p>
                </div>
              </div>

              {/* Handle Resolution Instruction Guide (PRD A §6.2) */}
              {previewData.requires_channel_id && (
                <div className="mt-2 p-2.5 border border-amber-600/40 bg-amber-500/10 rounded-xs space-y-2">
                  <div className="flex items-start gap-1.5 text-amber-800 dark:text-amber-300 font-ui text-xs font-semibold">
                    <Info size={14} className="shrink-0 mt-0.5" />
                    <span>Channel ID Required for Handle Live Streams</span>
                  </div>
                  <p className="font-ui text-[11px] text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                    {previewData.guide}
                  </p>
                  <div>
                    <label
                      htmlFor="input-canonical-channel-id"
                      className="font-ui text-[10px] font-bold uppercase tracking-wider text-ink-secondary block mb-1"
                    >
                      Canonical Channel ID (starts with UC...)
                    </label>
                    <input
                      id="input-canonical-channel-id"
                      type="text"
                      value={canonicalChannelId}
                      onChange={(e) => setCanonicalChannelId(e.target.value.trim())}
                      placeholder="e.g. UCZFMm1mMw0F81Z37aaSuT_Q"
                      className="w-full px-2.5 py-1 bg-paper border border-paper-border focus:border-ink rounded-xs font-mono text-xs text-ink placeholder:text-ink-muted focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Channel Metadata */}
          <div className="space-y-3 pt-1 border-t border-paper-border">
            <div className="space-y-1">
              <label
                htmlFor="input-channel-name"
                className="font-ui text-xs font-bold uppercase tracking-wider text-ink-secondary block"
              >
                Channel Name
              </label>
              <input
                id="input-channel-name"
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="e.g. NDTV 24x7 Live"
                className="w-full px-3 py-1.5 bg-paper-alt border border-paper-border focus:border-ink rounded-xs font-headline text-xs font-bold text-ink placeholder:text-ink-muted focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="select-channel-country"
                  className="font-ui text-xs font-bold uppercase tracking-wider text-ink-secondary block"
                >
                  Country / Region
                </label>
                <select
                  id="select-channel-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-paper-alt border border-paper-border focus:border-ink rounded-xs font-ui text-xs text-ink focus:outline-none"
                >
                  <option value="Global">Global</option>
                  <option value="India">India</option>
                  <option value="USA">USA</option>
                  <option value="China">China</option>
                  <option value="Japan">Japan</option>
                  <option value="Australia">Australia</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Europe">Europe</option>
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="select-channel-category"
                  className="font-ui text-xs font-bold uppercase tracking-wider text-ink-secondary block"
                >
                  Category
                </label>
                <select
                  id="select-channel-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-paper-alt border border-paper-border focus:border-ink rounded-xs font-ui text-xs text-ink focus:outline-none"
                >
                  <option value="News">News</option>
                  <option value="Politics">Politics</option>
                  <option value="Business">Business</option>
                  <option value="Tech">Tech</option>
                  <option value="Wildlife">Wildlife & Nature</option>
                  <option value="Documentary">Documentary</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-paper-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 border border-paper-border hover:border-ink bg-paper text-ink font-ui font-semibold text-xs rounded-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-save-custom-channel"
              disabled={isSubmitting || !channelName.trim()}
              className="px-4 py-1.5 border border-accent bg-accent text-paper font-ui font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Channel...' : 'Save to Broadcast Wire'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default AddYouTubeChannelModal;

