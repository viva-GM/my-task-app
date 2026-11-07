import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Draft, Priority } from '../../types';
import { 
  X, 
  Tag as TagIcon, 
  Send, 
  Sparkles, 
  Trash2, 
  ArrowRight, 
  FolderPlus, 
  CheckCircle2, 
  XCircle,
  Paperclip,
  Upload,
  AlertCircle,
  Loader2,
  Camera
} from 'lucide-react';
import { compressImage } from '../../utils/imageCompressor';
import { CameraCaptureModal } from '../CameraCaptureModal';

interface Props {
  draft?: Draft | null;
  onClose: () => void;
  onSelectForEvaluation?: (taskIdOrProjId: string, type: 'task' | 'project') => void;
}

export const DraftModal: React.FC<Props> = ({ draft, onClose, onSelectForEvaluation }) => {
  const { 
    currentUser, 
    drafts,
    createDraft, 
    updateDraft, 
    deleteDraft, 
    addDraftComment, 
    convertDraftToTask, 
    convertDraftToProject, 
    rejectDraft,
    users,
    canManageBoard
  } = useApp();

  const currentDraft = drafts.find(d => d.id === draft?.id) || draft;

  const [title, setTitle] = useState(currentDraft?.title || '');
  const [description, setDescription] = useState(currentDraft?.description || '');
  const [priority, setPriority] = useState<Priority>(currentDraft?.priority || 'medium');
  const [tags, setTags] = useState<string[]>(currentDraft?.tags || ['Стратегия']);
  const [tagInput, setTagInput] = useState('');
  const [images, setImages] = useState<string[]>(currentDraft?.images || []);
  const [newComment, setNewComment] = useState('');
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [isCommentCameraOpen, setIsCommentCameraOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [pasteNotice, setPasteNotice] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Clipboard paste listener: handles Ctrl+V image insertion with compression
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      const items = clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            compressImage(blob)
              .then(compressedDataUrl => {
                setImages(prev => [...prev, compressedDataUrl]);
                setPasteNotice(true);
                setTimeout(() => setPasteNotice(false), 3000);
              })
              .catch(err => {
                console.warn('Image paste compression failed:', err);
              });
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        compressImage(file)
          .then(compressedDataUrl => {
            setImages(prev => [...prev, compressedDataUrl]);
          })
          .catch(err => {
            console.warn('Image upload compression failed:', err);
          });
      }
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSave = () => {
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    setTitleError(false);
    setIsProcessing(true);

    try {
      if (draft) {
        updateDraft({
          ...draft,
          title: title.trim(),
          description: description.trim(),
          priority,
          tags,
          images
        });
      } else {
        createDraft({
          title: title.trim(),
          description: description.trim(),
          priority,
          tags,
          images,
          createdBy: currentUser.id
        });
      }
      onClose();
    } catch (e) {
      console.error('Failed to save draft:', e);
      setIsProcessing(false);
    }
  };

  const handleAddComment = () => {
    if (!currentDraft || (!newComment.trim() && !commentImage)) return;
    addDraftComment(currentDraft.id, newComment.trim(), commentImage || undefined);
    setNewComment('');
    setCommentImage(null);
  };

  // Convert to Single Task (works for both existing draft and new draft creation!)
  const handleConvertToTask = () => {
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    setTitleError(false);
    setIsProcessing(true);

    try {
      let targetDraftId = draft?.id;
      if (!draft) {
        // Create draft first
        const newD = createDraft({
          title: title.trim(),
          description: description.trim(),
          priority,
          tags,
          images,
          createdBy: currentUser.id
        });
        targetDraftId = newD.id;
      }

      if (targetDraftId) {
        const createdTask = convertDraftToTask(targetDraftId, {
          title: title.trim(),
          description: description.trim(),
          priority,
          tags,
          images
        });
        onClose();
        if (onSelectForEvaluation) {
          onSelectForEvaluation(createdTask.id, 'task');
        }
      }
    } catch (e) {
      console.error('Failed to convert to task:', e);
      setIsProcessing(false);
    }
  };

  // Convert to Complex Project (works for both existing draft and new draft creation!)
  const handleConvertToProject = () => {
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    setTitleError(false);
    setIsProcessing(true);

    try {
      let targetDraftId = draft?.id;
      if (!draft) {
        const newD = createDraft({
          title: title.trim(),
          description: description.trim(),
          priority,
          tags,
          images,
          createdBy: currentUser.id
        });
        targetDraftId = newD.id;
      }

      if (targetDraftId) {
        const createdProject = convertDraftToProject(targetDraftId, {
          title: title.trim(),
          description: description.trim(),
          priority,
          tags
        });
        onClose();
        if (onSelectForEvaluation) {
          onSelectForEvaluation(createdProject.id, 'project');
        }
      }
    } catch (e) {
      console.error('Failed to convert to project:', e);
      setIsProcessing(false);
    }
  };

  const handleConfirmReject = () => {
    if (!draft) return;
    rejectDraft(draft.id, rejectReason);
    setIsRejecting(false);
    onClose();
  };

  const priorityLabels: Record<Priority, { label: string; color: string }> = {
    low: { label: 'Low', color: 'bg-slate-100 text-slate-700' },
    medium: { label: 'Medium', color: 'bg-blue-100 text-blue-800' },
    high: { label: 'High', color: 'bg-amber-100 text-amber-800' },
    urgent: { label: 'Urgent', color: 'bg-rose-100 text-rose-800' }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget && !isProcessing) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {draft ? 'Board Strategic Idea / Draft' : 'Create New Idea (Draft)'}
              </h2>
              <p className="text-xs text-slate-500">
                Strategic discussion, Board evaluation, and conversion into a Task or Project
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Notification when image was pasted from clipboard */}
          {pasteNotice && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2 animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Image successfully pasted from clipboard (Ctrl+V) and optimized!</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Initiative / Idea Title <span className="text-rose-500">*</span></span>
              {titleError && (
                <span className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Please enter a title
                </span>
              )}
            </label>
            <input
              type="text"
              value={title}
              onChange={e => {
                setTitle(e.target.value);
                if (titleError && e.target.value.trim()) setTitleError(false);
              }}
              placeholder="e.g. Enterprise B2B Customer Portal with Real-Time Materials Analytics..."
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition-colors ${
                titleError
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
                  : 'border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
              }`}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Description & Implementation Scope
              </label>
              <span className="text-[11px] text-slate-400">
                Hint: paste screenshots or diagrams with Ctrl+V
              </span>
            </div>
            <textarea
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe goals, anticipated deliverables, material requirements, and criteria for success..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-slate-800 placeholder:text-slate-400 outline-none leading-relaxed"
            />
          </div>

          {/* Image Attachments (From File or Clipboard) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                <span>Images & Mockups (from file or clipboard)</span>
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload from File</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Images grid or drop zone */}
            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 h-28 bg-slate-100">
                    <img
                      src={img}
                      alt={`Attachment ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1.5 right-1.5 p-1 bg-slate-900/70 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-28 rounded-lg border-2 border-dashed border-slate-200 hover:border-indigo-400 flex flex-col items-center justify-center text-xs text-slate-500 hover:text-indigo-600 gap-1 transition-colors cursor-pointer"
                >
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span>Add Photo</span>
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="p-4 border-2 border-dashed border-slate-200 rounded-lg text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/20 transition-all"
              >
                <div className="flex flex-col items-center justify-center text-xs text-slate-500 gap-1">
                  <Upload className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="font-semibold text-slate-700">
                    Click to browse files or paste image from clipboard (Ctrl+V)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Supports PNG, JPG, WebP, architecture charts & wireframes
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Row: Priority & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            
            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Initiative Priority
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['low', 'medium', 'high', 'urgent'] as Priority[]).map(p => {
                  const isSelected = priority === p;
                  const meta = priorityLabels[p];
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-1.5 text-xs font-semibold rounded-md border transition-all text-center cursor-pointer ${
                        isSelected
                          ? `${meta.color} ring-2 ring-indigo-500 border-transparent shadow-xs`
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <TagIcon className="w-3.5 h-3.5" />
                <span>Classification Tags</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Add a tag..."
                  className="flex-1 px-3 py-1.5 rounded-md border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold cursor-pointer"
                >
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(tags || []).map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-xs font-medium"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-slate-400 hover:text-slate-600 ml-0.5 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Comments & Discussion for Board members */}
          {currentDraft && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Board Discussion & Review ({currentDraft.comments?.length || 0})
              </h3>
              
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {!currentDraft.comments || currentDraft.comments.length === 0 ? (
                  <div className="text-xs text-slate-400 italic py-2 text-center bg-slate-50 rounded-lg">
                    No comments yet. Start the strategic discussion below.
                  </div>
                ) : (
                  currentDraft.comments.map(c => {
                    const author = users.find(u => u.id === c.authorId);
                    return (
                      <div key={c.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <img
                              src={author?.avatar}
                              alt={author?.name}
                              referrerPolicy="no-referrer"
                              className="w-5 h-5 rounded-full object-cover"
                            />
                            <span className="font-semibold text-slate-900">{author?.name || 'User'}</span>
                            <span className="text-[10px] text-slate-400 font-medium">({author?.title})</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{c.createdAt}</span>
                        </div>
                        {c.content && (
                          <p className="text-xs text-slate-700 leading-relaxed pl-7">
                            {c.content}
                          </p>
                        )}
                        {c.attachmentUrl && (
                          <div className="pl-7 pt-1">
                            <img
                              src={c.attachmentUrl}
                              alt="Comment attachment"
                              className="max-h-36 rounded-lg border border-slate-200 object-cover shadow-2xs"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Comment image preview chip */}
              {commentImage && (
                <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between max-w-sm">
                  <div className="flex items-center gap-2">
                    <img
                      src={commentImage}
                      alt="Attachment"
                      className="w-10 h-10 rounded object-cover border border-slate-200"
                    />
                    <span className="text-[11px] text-indigo-900 font-semibold">
                      Image attached to comment
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCommentImage(null)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Add comment input */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddComment())}
                    placeholder="Write a comment (supports Ctrl+V for images)..."
                    className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500"
                  />

                  {/* File Upload Button */}
                  <button
                    type="button"
                    onClick={() => commentFileInputRef.current?.click()}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                    title="Attach image from file"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <input
                    ref={commentFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        compressImage(f).then(res => setCommentImage(res));
                      }
                      e.target.value = '';
                    }}
                    className="hidden"
                  />

                  {/* Camera Button */}
                  <button
                    type="button"
                    onClick={() => setIsCommentCameraOpen(true)}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                    title="Take photo from camera"
                  >
                    <Camera className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleAddComment}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rejection block if confirming reject */}
          {isRejecting && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg space-y-2">
              <h4 className="text-xs font-bold text-rose-800">
                Reason for Rejecting Initiative
              </h4>
              <textarea
                rows={2}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Does not align with Q4 strategic objectives or requires further research..."
                className="w-full px-3 py-2 rounded-md border border-rose-300 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-rose-500"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsRejecting(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  className="px-3.5 py-1.5 bg-rose-600 text-white rounded-md text-xs font-semibold hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer with Required Workflow Conversion Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">
            {draft && canManageBoard() && draft.status === 'draft' && !isRejecting && (
              <button
                type="button"
                onClick={() => setIsRejecting(true)}
                className="px-3 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            )}

            {draft && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Delete this draft permanently?')) {
                    deleteDraft(draft.id);
                    onClose();
                  }
                }}
                className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Delete draft"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleSave}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Draft</span>
            </button>

            {canManageBoard() && (!draft || draft.status === 'draft') && (
              <>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConvertToTask}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                  title="Promote draft data into a task and send to Assessment"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Create Task (to Assessment)</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConvertToProject}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                  title="Promote into a cross-department complex project and send to Assessment"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Create Project (to Assessment)</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Comment Camera Capture Modal */}
      {isCommentCameraOpen && (
        <CameraCaptureModal
          onCapture={(dataUrl) => setCommentImage(dataUrl)}
          onClose={() => setIsCommentCameraOpen(false)}
        />
      )}
    </div>
  );
};
