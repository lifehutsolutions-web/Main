/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, User, HardHat, Paperclip, X, FileText, Image, Download } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatComponentProps {
  projectId: string;
  sender: 'Contractor' | 'Client';
  messages: ChatMessage[];
  onSendMessage: (text: string, attachment?: { name: string; type: string; data: string }) => void;
}

export default function ChatComponent({ projectId, sender, messages, onSendMessage }: ChatComponentProps) {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: string; data: string } | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const filteredMessages = messages.filter(m => m.projectId === projectId);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredMessages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsReadingFile(true);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSelectedFile({
        name: file.name,
        type: file.type,
        data: result,
      });
      setIsReadingFile(false);
    };
    reader.onerror = () => {
      console.error("Failed to read file in chat");
      setIsReadingFile(false);
    };
    reader.readAsDataURL(file);
    // Reset file input so the same file can be selected again if needed
    e.target.value = '';
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    
    const hasText = !!inputText.trim();
    const hasFile = !!selectedFile;

    if (!hasText && !hasFile) return;

    let textToSend = inputText.trim();
    if (!textToSend && selectedFile) {
      textToSend = `Shared a file: ${selectedFile.name}`;
    }

    onSendMessage(textToSend, selectedFile || undefined);
    setInputText('');
    setSelectedFile(null);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-[400px] md:h-[480px] lh-panel rounded-xl overflow-hidden shadow-xs border border-slate-100" id="project-chat-container">
      {/* Chat Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--lh-surface-muted)', borderBottom: '1px solid var(--lh-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--lh-info-bg)', color: 'var(--lh-blue-dark)' }}>
            <Send className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-[12.5px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Project liaison chat</h4>
            <p className="text-[10.5px]" style={{ color: 'var(--lh-text-secondary)' }}>Contractor & client communication</p>
          </div>
        </div>
        <span className="lh-badge lh-badge-success">● Active</span>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: 'var(--lh-surface-sunken)' }}>
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6" style={{ color: 'var(--lh-text-tertiary)' }}>
            <p className="text-[12.5px] font-medium">No messages yet</p>
            <p className="text-[11px] mt-0.5">Type a message or attach a file below to start the conversation.</p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = msg.sender === sender;
            const hasAttachment = !!msg.attachmentName;
            const isImage = msg.attachmentType?.startsWith('image/');

            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[80%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                {/* Sender Tag */}
                <span className="text-[10px] font-medium mb-1 px-1 flex items-center gap-1" style={{ color: 'var(--lh-text-tertiary)' }}>
                  {msg.sender === 'Contractor' ? (
                    <HardHat className="w-3 h-3 inline" style={{ color: 'var(--lh-success-text)' }} />
                  ) : (
                    <User className="w-3 h-3 inline" style={{ color: 'var(--lh-blue)' }} />
                  )}
                  {msg.sender} {isMe && '(You)'}
                </span>

                {/* Bubble */}
                <div
                  className="px-3.5 py-2.5 rounded-xl text-[12.5px] shadow-2xs space-y-2"
                  style={isMe
                    ? { background: 'var(--lh-navy)', color: '#fff', borderBottomRightRadius: 4 }
                    : { background: 'var(--lh-surface)', color: 'var(--lh-text-primary)', border: '1px solid var(--lh-border)', borderBottomLeftRadius: 4 }}
                >
                  <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                  
                  {/* Attachment Presentation */}
                  {hasAttachment && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-slate-100/10 bg-black/5 dark:bg-white/5 p-2 max-w-full">
                      {isImage ? (
                        <div className="relative group">
                          <img 
                            src={msg.attachmentData} 
                            alt={msg.attachmentName} 
                            className="max-h-36 rounded-md object-contain border border-black/10 dark:border-white/10"
                            referrerPolicy="no-referrer"
                          />
                          <a 
                            href={msg.attachmentData} 
                            download={msg.attachmentName}
                            className="absolute bottom-2 right-2 bg-slate-900/80 text-white p-1.5 rounded-full hover:bg-slate-950 transition-colors flex items-center justify-center"
                            title="Download image"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[11.5px] font-semibold truncate text-white max-w-[140px] md:max-w-[200px]" style={!isMe ? { color: 'var(--lh-text-primary)' } : {}}>
                                {msg.attachmentName}
                              </p>
                              <p className="text-[9.5px] text-slate-300 dark:text-slate-400" style={!isMe ? { color: 'var(--lh-text-secondary)' } : {}}>
                                File attachment
                              </p>
                            </div>
                          </div>
                          <a 
                            href={msg.attachmentData} 
                            download={msg.attachmentName}
                            className="p-1.5 rounded-full bg-slate-100/10 hover:bg-slate-100/20 text-indigo-400 flex-shrink-0 flex items-center justify-center transition-colors"
                            style={!isMe ? { background: 'var(--lh-surface-muted)', border: '1px solid var(--lh-border)' } : {}}
                            title="Download file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <span className="text-[9px] mt-1 px-1" style={{ color: 'var(--lh-text-tertiary)' }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Selected File Preview Bar */}
      {selectedFile && (
        <div className="px-4 py-2 flex items-center justify-between border-t border-slate-100 bg-slate-50 dark:bg-slate-900/40 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2 min-w-0">
            {selectedFile.type.startsWith('image/') ? (
              <Image className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            )}
            <span className="truncate max-w-[200px] font-semibold">{selectedFile.name}</span>
            <span className="text-[9px] text-slate-400">(ready to send)</span>
          </div>
          <button 
            type="button" 
            onClick={handleRemoveFile} 
            className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 flex gap-2" style={{ borderTop: '1px solid var(--lh-border)', background: 'var(--lh-surface)' }}>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          id="chat-file-uploader"
        />
        
        <button
          type="button"
          onClick={triggerFileInput}
          disabled={isReadingFile}
          className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 dark:border-slate-800 flex items-center justify-center transition-colors text-slate-500 hover:text-slate-700 disabled:opacity-50"
          title="Attach files (PDF, image, drawing, etc.)"
          id="chat-attach-btn"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isReadingFile ? "Reading attachment..." : `Message as ${sender}...`}
          disabled={isReadingFile}
          className="lh-input flex-1"
        />
        
        <button
          type="submit"
          disabled={isReadingFile}
          className="lh-btn lh-btn-primary lh-btn-md flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
