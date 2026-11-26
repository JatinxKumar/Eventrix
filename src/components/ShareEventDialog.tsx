import { Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { Copy, ExternalLink, Mail, MessageCircle, Share2, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ShareEventDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  slug: string;
  coverImage?: string | null;
}

export function ShareEventDialog({
  open,
  onClose,
  title,
  slug,
  coverImage,
}: ShareEventDialogProps) {
  if (!open) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const publicUrl = `${origin}/events/${slug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Public registration link copied!");
    } catch {
      toast.error("Could not copy link. Please copy it manually.");
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Register for ${title} on EVENTRIX`,
          url: publicUrl,
        });
      } catch {
        // User cancelled share
      }
    }
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `Register for ${title} on EVENTRIX: ${publicUrl}`,
  )}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(
    `Invitation: ${title}`,
  )}&body=${encodeURIComponent(`You're invited to register for ${title}:\n\n${publicUrl}`)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white text-[#14141B] shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close share dialog"
          className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-zinc-700 hover:bg-zinc-100"
        >
          <X className="h-4 w-4" />
        </button>

        {coverImage && <img src={coverImage} alt={title} className="h-36 w-full object-cover" />}

        <div className="p-6 space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#7C3AED]">
              Share Event
            </p>
            <h3 className="mt-1 text-xl font-extrabold">{title}</h3>
          </div>

          {isLocalhost && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                You are running on <strong>localhost</strong>. Other devices cannot open localhost
                links until the app is hosted on a public URL.
              </span>
            </div>
          )}

          {/* URL Copy */}
          <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-[#FAF8F4] p-2 pl-3.5">
            <input
              type="text"
              readOnly
              value={publicUrl}
              className="flex-1 bg-transparent text-xs font-medium text-zinc-700 outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#7C3AED] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#6D28D9]"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Link
            </button>
          </div>

          {/* QR + Share Actions */}
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <div className="rounded-2xl border border-zinc-200 bg-white p-3">
              <QRCodeSVG value={publicUrl} size={112} level="M" />
            </div>
            <div className="flex flex-1 flex-col gap-2.5 w-full">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" />
                Share via WhatsApp
              </a>
              <a
                href={emailUrl}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-800 hover:bg-zinc-50"
              >
                <Mail className="h-4 w-4" />
                Share via Email
              </a>
              {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-800 hover:bg-zinc-50"
                >
                  <Share2 className="h-4 w-4" />
                  Share via Device
                </button>
              )}
              <Link
                to="/events/$slug"
                params={{ slug }}
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0D0D12] px-4 py-2.5 text-xs font-bold text-white hover:bg-zinc-800"
              >
                <ExternalLink className="h-4 w-4" />
                Preview Public Page
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
