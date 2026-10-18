import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, FileText, Image as ImageIcon, Film, Music, AlertCircle, Loader2 } from 'lucide-react';
import { uploadFileApi } from '../services/api.js';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileCategory(file) {
  if (!file) return 'document';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'document';
}

export function MessageInput({
  onSendMessage,
  onTypingKeystroke,
  onMessageSent,
  roomId = '',
  roomPassword = '',
  disabled = false,
  stagedFile = null,
  onClearStagedFile = null,
}) {
  const [text, setText] = useState('');
  const [localFile, setLocalFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  const fileInputRef = useRef(null);

  // Active file is either local or dragged from parent
  const activeFile = localFile || stagedFile;

  // React to dragged/staged files from parent
  useEffect(() => {
    if (stagedFile) {
      setLocalFile(null);
      if (stagedFile.size > 15 * 1024 * 1024) {
        setUploadError('File is too large (Maximum size is 15 MB)');
      } else {
        setUploadError('');
      }
      if (stagedFile.type?.startsWith('image/')) {
        const url = URL.createObjectURL(stagedFile);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
      } else {
        setPreviewUrl(null);
      }
    }
  }, [stagedFile]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File is too large (Maximum size is 15 MB)');
      return;
    }

    setUploadError('');
    setLocalFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setLocalFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    setUploadError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClearStagedFile?.();
  };

  const handleChange = (e) => {
    setText(e.target.value);
    onTypingKeystroke?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!text.trim() && !activeFile) || disabled || isUploading) return;

    let uploadedMetadata = null;

    if (activeFile) {
      setIsUploading(true);
      setUploadProgress(10);
      setUploadError('');

      try {
        const res = await uploadFileApi(
          roomId,
          activeFile,
          roomPassword,
          (pct) => setUploadProgress(Math.max(10, pct))
        );

        if (!res.ok || !res.data?.file) {
          setUploadError(res.error || 'Failed to upload file');
          setIsUploading(false);
          return;
        }

        uploadedMetadata = res.data.file;
      } catch (err) {
        setUploadError(err.message || 'Upload error');
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    onSendMessage(text.trim(), uploadedMetadata);
    onMessageSent?.();
    setText('');
    handleRemoveFile();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const category = activeFile ? getFileCategory(activeFile) : null;

  return (
    <div className="bg-slate-950/80 border-t border-white/[0.06] p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0 z-10 backdrop-blur">
      <div className="max-w-3xl mx-auto w-full space-y-2">
        {/* Staged File Preview Tray */}
        {activeFile && (
          <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-white/[0.1] flex items-center justify-between gap-3 animate-fade-in shadow-lg">
            <div className="flex items-center gap-2.5 min-w-0">
              {category === 'image' && previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-12 h-12 rounded-xl object-cover border border-white/[0.1] shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  {category === 'video' ? (
                    <Film className="w-5 h-5" />
                  ) : category === 'audio' ? (
                    <Music className="w-5 h-5" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-md">
                  {activeFile.name}
                </div>
                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                  <span>{formatBytes(activeFile.size)}</span>
                  <span>•</span>
                  <span className="uppercase text-[10px] text-slate-500 font-bold">
                    {category}
                  </span>
                  {isUploading && (
                    <span className="text-blue-400 font-semibold flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {uploadProgress}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {uploadError && (
                <span className="text-[11px] text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {uploadError}
                </span>
              )}
              <button
                type="button"
                onClick={handleRemoveFile}
                disabled={isUploading}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50"
                title="Remove attachment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Input Form & Buttons */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          {/* Hidden native file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.csv"
          />

          {/* Paperclip Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            aria-label="Attach File"
            className={`h-11 w-11 rounded-2xl border transition flex items-center justify-center shrink-0 active:scale-95 ${
              activeFile
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-400 shadow-sm'
                : 'bg-slate-900/80 hover:bg-slate-800 border-white/[0.08] text-slate-400 hover:text-white'
            }`}
            title="Attach Image, Video, PDF, or Document"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Message Text Input */}
          <div className="flex-1 flex items-center bg-slate-900/80 border border-white/[0.08] hover:border-white/[0.14] focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/15 rounded-2xl px-4 py-1 transition shadow-sm">
            <input
              type="text"
              placeholder={activeFile ? 'Add a caption (optional)...' : 'Type a message (Enter to send)...'}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              disabled={disabled || isUploading}
              className="w-full bg-transparent py-2.5 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none disabled:opacity-50 font-normal"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!text.trim() && !activeFile) || disabled || isUploading}
            aria-label="Send Message"
            className="h-11 w-11 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-600 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-semibold transition flex items-center justify-center shadow shrink-0 active:scale-95"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-4 h-4 -ml-0.5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
