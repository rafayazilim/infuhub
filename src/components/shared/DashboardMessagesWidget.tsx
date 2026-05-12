import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ChatMessage,
  Conversation,
  ConversationUserType,
  sendConversationMessage,
  subscribeConversationsByUser,
  subscribeConversationMessages,
} from '@/services/firebaseMessagingService';

interface DashboardMessagesWidgetProps {
  userId?: string | null;
  userType: ConversationUserType;
  onExpand?: () => void;
  className?: string;
}

const avatarInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).slice(0, 2);
  if (!parts.length) return 'U';
  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
};

const TinyAvatar = ({ name, photoURL }: { name: string; photoURL?: string }) => {
  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={name}
        className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#08afd5] to-[#e3447c] text-white text-[10px] font-semibold inline-flex items-center justify-center">
      {avatarInitials(name)}
    </div>
  );
};

export function DashboardMessagesWidget({
  userId,
  userType,
  onExpand,
  className = '',
}: DashboardMessagesWidgetProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeConversationsByUser(userId, userType, setConversations);
    return () => unsubscribe();
  }, [userId, userType]);

  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }
    const unsubscribe = subscribeConversationMessages(selectedConversationId, setMessages);
    return () => unsubscribe();
  }, [selectedConversationId]);

  /** scrollIntoView kullanma: sayfa (window) aşağı kayıyordu; sadece iç scroll alanı güncellenir */
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const run = () => {
      el.scrollTop = el.scrollHeight;
    };
    run();
    const id = requestAnimationFrame(run);
    return () => cancelAnimationFrame(id);
  }, [messages.length, selectedConversationId]);

  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) || null;
  const counterpartName = selectedConversation
    ? userType === 'brand'
      ? selectedConversation.influencerName || 'Influencer'
      : selectedConversation.brandName || 'Marka'
    : 'Kisi sec';
  const counterpartPhoto = selectedConversation
    ? userType === 'brand'
      ? selectedConversation.influencerPhotoURL
      : selectedConversation.brandPhotoURL
    : '';

  const visibleMessages = useMemo(() => messages, [messages]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !selectedConversationId || !userId || sending) return;
    try {
      setSending(true);
      await sendConversationMessage({
        conversationId: selectedConversationId,
        senderId: userId,
        senderType: userType,
        text,
      });
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={`mac-surface p-3 overflow-hidden flex flex-col ${className || 'h-[360px] xl:h-[420px]'}`}
    >
      {onExpand && (
        <div className="flex items-center justify-end mb-2">
          <button
            type="button"
            onClick={onExpand}
            className="h-8 w-8 rounded-xl border border-gray-200 dark:border-gray-700 inline-flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Mesajları Aç"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800/70 p-2 bg-gray-50/80 dark:bg-gray-900/50 flex-1 min-h-0">
        <div className="grid grid-cols-[52px_minmax(0,1fr)] gap-2 h-full min-h-0">
          <div className="space-y-2 h-full overflow-y-auto mac-scrollbar pr-1">
            {conversations.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 p-2">Mesaj yok.</p>
            ) : (
              conversations.map((conversation) => {
                const isActive = conversation.id === selectedConversationId;
                const name =
                  userType === 'brand'
                    ? conversation.influencerName || 'Influencer'
                    : conversation.brandName || 'Marka';
                const photo =
                  userType === 'brand'
                    ? conversation.influencerPhotoURL
                    : conversation.brandPhotoURL;

                return (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversationId(conversation.id)}
                    className={`w-10 h-10 rounded-full border inline-flex items-center justify-center transition-all ${
                      isActive
                        ? 'border-[#08afd5]/60 bg-[#08afd5]/10 dark:bg-[#08afd5]/20'
                        : 'border-gray-300/80 dark:border-gray-700 bg-white dark:bg-gray-900'
                    }`}
                    title={name}
                  >
                    <TinyAvatar name={name} photoURL={photo} />
                  </button>
                );
              })
            )}
          </div>

          <div className="rounded-2xl border border-gray-300/80 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-900 flex flex-col min-h-0 overflow-hidden">
            <div className="rounded-full border border-gray-300/80 dark:border-gray-700 px-2 py-1 inline-flex items-center gap-2 self-start max-w-full">
              <TinyAvatar name={counterpartName} photoURL={counterpartPhoto} />
              <span className="text-xs text-gray-900 dark:text-gray-100 truncate max-w-[94px]">{counterpartName}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#08afd5] shrink-0" />
            </div>

            <div
              ref={messagesScrollRef}
              className="mt-2 space-y-1.5 overflow-y-auto mac-scrollbar pr-1 min-h-0 flex-1"
            >
              {visibleMessages.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">Konusma secin.</p>
              ) : (
                visibleMessages.map((message) => (
                  <div
                    key={message.id}
                    title={message.text}
                    className={`max-w-[96%] px-2 py-1.5 rounded-lg text-xs leading-5 border ${
                      message.senderId === userId
                        ? 'ml-auto bg-[#08afd5] text-white border-[#08afd5]'
                        : message.type === 'system'
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border-blue-200 dark:border-blue-800/40'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <p className="line-clamp-2 break-words">{message.text}</p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-2 rounded-full border border-gray-300/80 dark:border-gray-700 px-1 py-1 bg-gray-50 dark:bg-gray-800 flex items-center gap-1 min-w-0">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="mesajinizi giriniz..."
                className="flex-1 min-w-0 bg-transparent border-0 outline-none text-xs px-2 text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
              />
              <Button
                size="sm"
                type="button"
                onClick={handleSend}
                disabled={sending || !draft.trim() || !selectedConversationId}
                className="h-8 w-8 p-0 rounded-full brand-btn-primary text-white shrink-0"
              >
                <Send size={12} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
