import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Search, ArrowUpRight } from 'lucide-react';
import {
  ChatMessage,
  Conversation,
  ConversationUserType,
  sendConversationMessage,
  subscribeConversationsByUser,
  subscribeConversationMessages,
} from '@/services/firebaseMessagingService';

interface MessagesPanelProps {
  userId: string;
  userType: ConversationUserType;
  onOpenOffer?: (conversation: Conversation, message?: ChatMessage) => void;
}

const formatTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 0) return 'U';
  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
};

const Avatar = ({ name, photoURL, size = 'md' }: { name: string; photoURL?: string; size?: 'sm' | 'md' }) => {
  const base = size === 'sm' ? 'w-8 h-8 text-[11px]' : 'w-9 h-9 text-xs';

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={name}
        className={`${base} rounded-full object-cover border border-gray-200 dark:border-gray-700`}
      />
    );
  }

  return (
    <div className={`${base} rounded-full bg-gradient-to-br from-[#08afd5] to-[#e3447c] text-white font-semibold inline-flex items-center justify-center`}>
      {getInitials(name)}
    </div>
  );
};

export function MessagesPanel({ userId, userType, onOpenOffer }: MessagesPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [query, setQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
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
    if (
      selectedConversationId &&
      conversations.length > 0 &&
      !conversations.some((conversation) => conversation.id === selectedConversationId)
    ) {
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

  /** scrollIntoView sayfayı aşağı kaydırıyordu; yalnızca mesaj sütununu kaydır */
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

  const filteredConversations = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('tr-TR');
    if (!normalized) return conversations;
    return conversations.filter((conversation) => {
      const counterpart =
        userType === 'brand' ? conversation.influencerName || '' : conversation.brandName || '';
      const campaign = conversation.campaignTitle || '';
      return (
        counterpart.toLocaleLowerCase('tr-TR').includes(normalized) ||
        campaign.toLocaleLowerCase('tr-TR').includes(normalized)
      );
    });
  }, [conversations, query, userType]);

  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) || null;

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || !selectedConversationId || sending) return;

    try {
      setSending(true);
      await sendConversationMessage({
        conversationId: selectedConversationId,
        senderId: userId,
        senderType: userType,
        text,
      });
      setNewMessage('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-73px)]">
      <div className="overflow-hidden h-full min-h-[680px] bg-transparent border-0 rounded-none shadow-none">
        <div className="grid grid-cols-1 lg:grid-cols-[350px_minmax(0,1fr)] h-full">
          <aside className="border-r border-gray-200/60 dark:border-gray-800/60 flex flex-col min-h-0">
            <div className="p-4 border-b border-gray-200/60 dark:border-gray-800/60">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Konusma ara..."
                  className="pl-9 rounded-lg"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto mac-scrollbar">
              {filteredConversations.length === 0 ? (
                <div className="h-full flex items-center justify-center p-6 text-center">
                  <div>
                    <MessageSquare size={30} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Henuz mesaj bulunmuyor.</p>
                  </div>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {filteredConversations.map((conversation) => {
                    const isActive = conversation.id === selectedConversationId;
                    const counterpart =
                      userType === 'brand'
                        ? conversation.influencerName || 'Influencer'
                        : conversation.brandName || 'Marka';
                    const counterpartPhoto =
                      userType === 'brand'
                        ? conversation.influencerPhotoURL
                        : conversation.brandPhotoURL;

                    return (
                      <button
                        key={conversation.id}
                        onClick={() => setSelectedConversationId(conversation.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          isActive
                            ? 'border-[#08afd5]/60 bg-[#08afd5]/10 dark:bg-[#08afd5]/20'
                            : 'border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar name={counterpart} photoURL={counterpartPhoto} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{counterpart}</p>
                              <span className="text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
                                {formatTime(conversation.lastMessageAt || conversation.updatedAt)}
                              </span>
                            </div>
                            <p className="text-xs text-[#08afd5] dark:text-[#6edff3] truncate mt-0.5">
                              {conversation.campaignTitle || 'Kampanya'}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">
                              {conversation.lastMessage || 'Konusma baslatildi'}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section className="flex flex-col min-h-0">
            {selectedConversation ? (
              <>
                <div className="px-5 py-4 border-b border-gray-200/60 dark:border-gray-800/60 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <Avatar
                      name={
                        userType === 'brand'
                          ? selectedConversation.influencerName || 'Influencer'
                          : selectedConversation.brandName || 'Marka'
                      }
                      photoURL={
                        userType === 'brand'
                          ? selectedConversation.influencerPhotoURL
                          : selectedConversation.brandPhotoURL
                      }
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {userType === 'brand'
                          ? selectedConversation.influencerName || 'Influencer'
                          : selectedConversation.brandName || 'Marka'}
                      </p>
                      <p className="text-xs text-[#08afd5] dark:text-[#6edff3] truncate">
                        {selectedConversation.campaignTitle || 'Kampanya'}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    Canli
                  </Badge>
                </div>

                <div
                  ref={messagesScrollRef}
                  className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gradient-to-b from-gray-50/60 to-white dark:from-gray-900 dark:to-gray-950 mac-scrollbar"
                >
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Bu konusmada henuz mesaj yok.</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      if (message.type === 'system') {
                        return (
                          <div key={message.id} className="rounded-xl border border-blue-200/70 dark:border-blue-800/40 bg-blue-50/70 dark:bg-blue-900/15 p-3">
                            <p className="text-sm text-blue-900 dark:text-blue-100">{message.text}</p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-[11px] text-blue-700/80 dark:text-blue-300/80">
                                {formatTime(message.createdAt)}
                              </span>
                              {onOpenOffer && message.metadata?.offerId && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs rounded-lg"
                                  onClick={() => onOpenOffer(selectedConversation, message)}
                                >
                                  Teklifi Ac
                                  <ArrowUpRight size={12} className="ml-1" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      }

                      const isMine = message.senderId === userId;
                      const senderName =
                        message.senderType === 'brand'
                          ? selectedConversation.brandName || 'Marka'
                          : selectedConversation.influencerName || 'Influencer';
                      const senderPhoto =
                        message.senderType === 'brand'
                          ? selectedConversation.brandPhotoURL
                          : selectedConversation.influencerPhotoURL;

                      return (
                        <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          {!isMine && (
                            <div className="mr-2 mt-1 shrink-0">
                              <Avatar name={senderName} photoURL={senderPhoto} size="sm" />
                            </div>
                          )}
                          <div
                            className={`max-w-[78%] rounded-2xl px-3 py-2 border ${
                              isMine
                                ? 'bg-[#08afd5] text-white border-[#08afd5]'
                                : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800'
                            }`}
                          >
                            {!isMine && <div className="mb-1 text-[11px] opacity-80">{senderName}</div>}
                            <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                            <p className={`mt-1 text-[10px] ${isMine ? 'text-cyan-100' : 'text-gray-500 dark:text-gray-400'}`}>
                              {formatTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-4 border-t border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900">
                  <div className="flex items-center gap-2">
                    <Input
                      value={newMessage}
                      onChange={(event) => setNewMessage(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Mesaj yaz..."
                      className="rounded-lg"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={sending || !newMessage.trim()}
                      className="rounded-lg brand-btn-primary text-white"
                    >
                      <Send size={14} className="mr-1.5" />
                      Gonder
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center p-8">
                <div className="text-center">
                  <MessageSquare size={34} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Konusma secin.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
