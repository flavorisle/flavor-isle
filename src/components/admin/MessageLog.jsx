import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MessageSquare, ChevronDown, RefreshCw, User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Full Smashie conversation history across every channel (web chat, SMS, voice).
// Lists all agent conversations and expands any one to show its full messages.
export default function MessageLog() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [messages, setMessages] = useState({});
  const [loadingMsgs, setLoadingMsgs] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const all = await base44.agents.listConversations({ agent_name: 'smashie' });
      const sorted = (all || []).sort((a, b) =>
        new Date(b.updated_date || b.created_date || 0) - new Date(a.updated_date || a.created_date || 0)
      );
      setConversations(sorted);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!messages[id]) {
      setLoadingMsgs(prev => ({ ...prev, [id]: true }));
      try {
        const conv = await base44.agents.getConversation(id);
        setMessages(prev => ({ ...prev, [id]: conv.messages || [] }));
      } catch (e) { console.error(e); }
      setLoadingMsgs(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{conversations.length} conversations</p>
        <button onClick={load} className="flex items-center gap-1.5 text-xs font-heading text-patina-mint hover:text-midnight-cherry transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-midnight-cherry rounded-full animate-spin" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare size={40} strokeWidth={1} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-heading text-obsidian-roast">No conversations yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map(c => {
            const isOpen = expanded === c.id;
            const name = c.metadata?.name || 'Smashie Conversation';
            const channel = c.metadata?.channel;
            return (
              <div key={c.id} className="card-diner overflow-hidden">
                <button onClick={() => toggle(c.id)} className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/40 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-midnight-cherry/10 text-midnight-cherry flex items-center justify-center flex-shrink-0">
                    <Bot size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm text-obsidian-roast truncate">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.created_date ? new Date(c.created_date).toLocaleString() : '—'}
                      {channel && <span className="ml-2 px-1.5 py-0.5 rounded bg-muted text-[10px] uppercase font-semibold">{channel}</span>}
                    </p>
                  </div>
                  <ChevronDown size={16} className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="border-t border-border bg-muted/30 p-4 space-y-3 max-h-80 overflow-y-auto">
                    {loadingMsgs[c.id] ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Loading messages…</p>
                    ) : (messages[c.id] || []).length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No messages found.</p>
                    ) : (
                      messages[c.id].filter(m => m.role !== 'system').map((m, i) => {
                        const isUser = m.role === 'user';
                        return (
                          <div key={i} className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                            {!isUser && <div className="w-6 h-6 rounded-full bg-midnight-cherry text-white flex items-center justify-center flex-shrink-0"><Bot size={12} /></div>}
                            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${isUser ? 'bg-patina-mint text-white rounded-br-sm' : 'bg-white text-obsidian-roast rounded-bl-sm'}`}>
                              {isUser ? <p>{m.content}</p> : <ReactMarkdown className="text-sm [&>p]:mb-0">{m.content}</ReactMarkdown>}
                            </div>
                            {isUser && <div className="w-6 h-6 rounded-full bg-patina-mint text-white flex items-center justify-center flex-shrink-0"><User size={12} /></div>}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}