import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';
import { fetchBusyness } from '@/lib/busynessCache';
import ReactMarkdown from 'react-markdown';

// Build the same STORE STATUS / BUSYNESS context the phone + SMS webhooks
// attach, so web-chat Smashie never guesses whether the store is open.
// Wrapped in [[CTX]]…[[/CTX]] and stripped before rendering the user's bubble.
async function buildStatusContext() {
  try {
    const s = await fetchBusyness();
    if (!s) return '';
    const closed = s.busyness_level === 'Closed';
    const status = closed
      ? `STORE STATUS: CLOSED${s.closure_message ? ` — ${s.closure_message}` : ''}`
      : `STORE STATUS: OPEN`;
    const busy = closed ? '' : `\nBUSYNESS: ${s.busyness_level}${s.estimated_wait ? ` (current wait ${s.estimated_wait})` : ''}`;
    return `[[CTX]]${status}${busy}[[/CTX]]\n`;
  } catch {
    return '';
  }
}

const SHAKE_KEYWORDS = /shake|milkshake|malt|\/milkshakes/i;
const TRANSFER_TOKEN = /\[\[TRANSFER\]\]/i;

const SMASHIE_HEAD = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/b05945903_smashiehead.png';

export default function SmashieChat() {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [counterPhone, setCounterPhone] = useState('');
  const messagesEndRef = useRef(null);
  const { totalItems } = useCart();
  // When the cart has food in it, the floating cart bubble sits bottom-right —
  // shift Smashie to the left so the two don't overlap.
  const side = totalItems > 0 ? 'left' : 'right';

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {scrollToBottom();}, [messages]);

  // Open the chat when the bottom tab bar (or any other UI) requests it.
  useEffect(() => {
    const handler = () => openChat();
    window.addEventListener('flavorisle:open-smashie', handler);
    return () => window.removeEventListener('flavorisle:open-smashie', handler);
  }, []);

  // Lazily fetch the counter phone number so the chat can offer a
  // "Call the Counter" button when Smashie hands off to a real person.
  useEffect(() => {
    if (counterPhone) return;
    base44.functions.invoke('getCounterPhone', {}).then(res => {
      if (res?.data?.phone) setCounterPhone(res.data.phone);
    }).catch(() => {});
  }, [counterPhone]);

  const openChat = async () => {
    setOpen(true);
    if (!conversation) {
      const conv = await base44.agents.createConversation({
        agent_name: 'smashie',
        metadata: { name: 'Smashie Chat' }
      });
      setConversation(conv);
      setMessages(conv.messages || []);
      base44.agents.subscribeToConversation(conv.id, (data) => {
        setMessages(data.messages || []);
        setSending(false);
      });
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending || !conversation) return;
    setSending(true);
    const msg = input.trim();
    setInput('');
    const ctx = await buildStatusContext();
    await base44.agents.addMessage(conversation, { role: 'user', content: `${ctx}${msg}` });
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {e.preventDefault();sendMessage();}
  };

  const isThinking = sending || messages[messages.length - 1]?.role === 'user';

  return (
    <>
      {/* Floating Button */}
      {!open &&
      <button
        onClick={openChat}
        className={`hidden md:flex fixed ${side === 'left' ? 'left-6' : 'right-6'} bottom-6 z-[80] w-16 h-16 rounded-full shadow-float-lg hover:scale-110 transition-all items-center justify-center ring-4 ring-white/90`}
        aria-label="Chat with Smashie">

          <span className="absolute inset-0 rounded-full bg-midnight-cherry/40 animate-ping opacity-70" />
          <img src={SMASHIE_HEAD} alt="Smashie" className="relative w-full h-full object-cover rounded-full ring-2 ring-midnight-cherry" />
          <span className={`absolute -bottom-1 ${side === 'left' ? '-right-1' : '-right-1'} bg-midnight-cherry text-white text-[10px] font-heading px-1.5 py-0.5 rounded-full shadow-float`}>CHAT</span>
        </button>
      }

      {/* Chat Panel */}
      {open &&
      <div className={`fixed ${side === 'left' ? 'left-4 md:left-6' : 'right-4 md:right-6'} bottom-[calc(4rem+0.75rem+env(safe-area-inset-bottom))] md:bottom-6 z-[60] w-full sm:w-96 h-[560px] bg-white rounded-3xl shadow-float-lg flex flex-col overflow-hidden border border-border animate-float-up`}>
          {/* Header */}
          <div className="bg-midnight-cherry px-5 py-4 flex items-center gap-3 flex-shrink-0">
            <img src={SMASHIE_HEAD} alt="Smashie" className="w-10 h-10 object-cover rounded-full flex-shrink-0" />
            <div className="flex-1">
              <p className="font-heading text-white text-base leading-none">Smashie AI</p>
              <p className="text-red-200 text-xs mt-0.5">Flavor Isle's Diner Assistant</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && !sending &&
          <div className="text-center py-8">
                <img src={SMASHIE_HEAD} alt="Smashie" className="w-16 h-16 object-cover rounded-full mx-auto mb-3" />
                <p className="font-heading text-obsidian-roast mb-1">Hey there, I'm Smashie!</p>
                <p className="text-sm text-muted-foreground">Ask me about the menu, place a phone order, or just say hi!</p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center text-[hsl(var(--primary))]">
                  {["What's good today?", "Build a shake 🥤", "Take my order", "What are your hours?"].map((q) =>
              <button
                key={q}
                onClick={() => {setInput(q);}}
                className="text-xs hover:bg-midnight-cherry/10 px-3 py-1.5 rounded-full transition-colors border border-border text-[hsl(var(--primary))] bg-[hsl(var(--primary))]">
                
                      {q}
                    </button>
              )}
                </div>
              </div>
          }

            {messages.map((msg, i) => {
            if (msg.role === 'system') return null;
            const isUser = msg.role === 'user';
            const wantsTransfer = !isUser && TRANSFER_TOKEN.test(msg.content);
            const cleanContent = isUser
              ? msg.content.replace(/\[\[CTX\]\][\s\S]*?\[\[\/CTX\]\]\n?/g, '').trim()
              : msg.content.replace(/\[\[TRANSFER\]\]/gi, '').trim();
            return (
              <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser &&
                <img src={SMASHIE_HEAD} alt="Smashie" className="w-7 h-7 object-cover rounded-full mr-2 flex-shrink-0 mt-1" />
                }
                  <div className="flex flex-col gap-2 max-w-[80%]">
                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                  isUser ?
                  'bg-midnight-cherry text-white rounded-br-sm' :
                  'bg-muted text-obsidian-roast rounded-bl-sm'}`
                  }>
                      {isUser ?
                    <p>{cleanContent}</p> :

                    <ReactMarkdown className="prose prose-sm max-w-none text-sm [&>p]:mb-1 [&>p:last-child]:mb-0">{cleanContent}</ReactMarkdown>
                    }
                    </div>
                    {!isUser && SHAKE_KEYWORDS.test(msg.content) &&
                  <Link
                    to="/milkshakes"
                    className="flex items-center gap-2 bg-obsidian-roast text-white text-xs font-heading px-4 py-2.5 rounded-2xl hover:bg-midnight-cherry transition-colors">
                    
                        <span className="text-base">🥤</span>
                        Build Your Shake →
                      </Link>
                  }
                  {wantsTransfer && counterPhone &&
                  <a
                    href={`tel:${counterPhone}`}
                    className="flex items-center gap-2 bg-midnight-cherry text-white text-xs font-heading px-4 py-2.5 rounded-2xl hover:bg-red-800 transition-colors">
                    <span className="text-base">📞</span>
                    Call the Counter →
                  </a>
                  }
                  </div>
                </div>);

          })}

            {isThinking && messages[messages.length - 1]?.role === 'user' &&
          <div className="flex justify-start">
                <img src={SMASHIE_HEAD} alt="Smashie" className="w-7 h-7 object-cover rounded-full mr-2 flex-shrink-0" />
                <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Smashie is thinking…</span>
                </div>
              </div>
          }

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border flex gap-2 flex-shrink-0">
            <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask Smashie anything…"
            className="flex-1 px-4 py-2.5 bg-muted rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 border border-border"
            disabled={sending} />
          
            <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            className="w-10 h-10 bg-midnight-cherry text-white rounded-full flex items-center justify-center hover:bg-red-800 transition-colors disabled:opacity-40 flex-shrink-0">
            
              <Send size={16} />
            </button>
          </div>
        </div>
      }
    </>);

}