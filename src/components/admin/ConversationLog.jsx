import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Phone, MessageSquare, ChevronDown, RefreshCw, User, Bot, Clock, PhoneIncoming, UserCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const STATUS_STYLE = {
  'completed': 'bg-gray-100 text-gray-600',
  'in-progress': 'bg-green-100 text-green-700',
  'ringing': 'bg-blue-100 text-blue-700',
  'queued': 'bg-muted text-muted-foreground',
  'failed': 'bg-red-100 text-red-700',
  'busy': 'bg-red-100 text-red-700',
  'no-answer': 'bg-amber-100 text-amber-700',
  'canceled': 'bg-gray-100 text-gray-500',
};

const fmtDur = (s) => {
  if (s == null) return null;
  const n = Number(s) || 0;
  const m = Math.floor(n / 60);
  const r = n % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
};

// Shared list for the Phone Log (channel="voice") and SMS Log (channel="sms").
// Each row is a SmsConversation record; expanding it pulls the full Smashie
// message history from the agent conversation. Voice rows also show the
// resolved Square customer name, call status, duration, and direction.
export default function ConversationLog({ channel }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [messages, setMessages] = useState({});
  const [loadingMsgs, setLoadingMsgs] = useState({});
  const [resolving, setResolving] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.SmsConversation.list('-last_message_at', 100);
      // Existing records created before the `channel` field default to "sms".
      const filtered = (all || []).filter(c => (c.channel || 'sms') === channel);
      setConversations(filtered);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [channel]);

  const resolveName = async (c) => {
    if (resolving[c.id]) return;
    setResolving(prev => ({ ...prev, [c.id]: true }));
    try {
      const res = await base44.functions.invoke('lookupCaller', { conversation_id: c.id, phone: c.phone_number });
      if (res.data?.name) {
        setConversations(prev => prev.map(x => x.id === c.id ? { ...x, customer_name: res.data.name } : x));
      }
    } catch (e) { console.error(e); }
    setResolving(prev => ({ ...prev, [c.id]: false }));
  };

  const toggle = async (c) => {
    const id = c.id;
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!messages[id]) {
      setLoadingMsgs(prev => ({ ...prev, [id]: true }));
      if (c.transcript?.length) {
        setMessages(prev => ({ ...prev, [id]: c.transcript }));
      } else {
        try {
          const conv = await base44.agents.getConversation(c.conversation_id);
          setMessages(prev => ({ ...prev, [id]: conv.messages || [] }));
        } catch (e) { console.error(e); }
      }
      setLoadingMsgs(prev => ({ ...prev, [id]: false }));
    }
    // Lazy-resolve the caller's Square name for older voice records.
    if (channel === 'voice' && !c.customer_name) {
      resolveName(c);
    }
  };

  const Icon = channel === 'voice' ? Phone : MessageSquare;
  const emptyText = channel === 'voice' ? 'No phone calls yet' : 'No SMS conversations yet';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {conversations.length} {channel === 'voice' ? 'call' : 'SMS'}{conversations.length !== 1 ? 's' : ''}
        </p>
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
          <Icon size={40} strokeWidth={1} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-heading text-obsidian-roast">{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map(c => {
            const isOpen = expanded === c.id;
            const hasName = !!c.customer_name;
            return (
              <div key={c.id} className="card-diner overflow-hidden">
                <button
                  onClick={() => toggle(c)}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/40 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${channel === 'voice' ? 'bg-patina-mint/10 text-patina-mint' : 'bg-midnight-cherry/10 text-midnight-cherry'}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {hasName && <UserCheck size={13} className="text-patina-mint flex-shrink-0" />}
                      <p className="font-heading text-sm text-obsidian-roast truncate">
                        {hasName ? c.customer_name : c.phone_number}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {hasName && <span className="text-obsidian-roast/70">{c.phone_number} · </span>}
                      {c.last_message_at ? new Date(c.last_message_at).toLocaleString() : '—'}
                      {c.call_duration != null && <> · {fmtDur(c.call_duration)}</>}
                      {channel === 'voice' && !hasName && resolving[c.id] && <> · looking up…</>}
                      <> · {c.message_count || 0} msgs</>
                    </p>
                  </div>
                  {channel === 'voice' && c.call_status && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[c.call_status] || 'bg-muted text-muted-foreground'}`}>
                      {c.call_status}
                    </span>
                  )}
                  {channel !== 'voice' && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.status}
                    </span>
                  )}
                  <ChevronDown size={16} className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="border-t border-border bg-muted/30 p-4 space-y-3 max-h-96 overflow-y-auto">
                    {/* Call details (voice only) */}
                    {channel === 'voice' && (c.call_status || c.call_duration != null || c.call_direction || c.call_started_at) && (
                      <div className="flex flex-wrap gap-2 text-xs pb-3 mb-1 border-b border-border">
                        {c.call_status && (
                          <span className={`px-2 py-1 rounded-full font-semibold ${STATUS_STYLE[c.call_status] || 'bg-muted text-muted-foreground'}`}>
                            {c.call_status}
                          </span>
                        )}
                        {c.call_direction && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground capitalize">
                            <PhoneIncoming size={11} /> {c.call_direction}
                          </span>
                        )}
                        {c.call_duration != null && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground">
                            <Clock size={11} /> {fmtDur(c.call_duration)}
                          </span>
                        )}
                        {c.call_started_at && (
                          <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                            Started {new Date(c.call_started_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    )}

                    {loadingMsgs[c.id] ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Loading transcript…</p>
                    ) : (messages[c.id] || []).length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No transcript captured.</p>
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