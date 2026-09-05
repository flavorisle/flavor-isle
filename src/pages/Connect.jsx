import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, ArrowRight, Sparkles, MessageSquare, MousePointerClick, Code, Bot } from 'lucide-react';
import Navbar from '@/components/Navbar';

const TABS = [
  { id: 'claude', label: 'Claude', Icon: Sparkles },
  { id: 'chatgpt', label: 'ChatGPT', Icon: MessageSquare },
  { id: 'cursor', label: 'Cursor', Icon: MousePointerClick },
  { id: 'custom', label: 'Custom', Icon: Code },
];

export default function Connect() {
  const [activeTab, setActiveTab] = useState('claude');
  const [copied, setCopied] = useState(false);

  const serverUrl = useMemo(
    () => new URL('/api/mcp', window.location.origin).toString(),
    []
  );

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(serverUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Navbar />
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="font-heading text-midnight-cherry text-sm tracking-[0.3em] mb-2">FLAVOR ISLE</p>
          <h1 className="font-heading text-4xl sm:text-5xl text-obsidian-roast leading-tight">Connect an AI Assistant</h1>
          <p className="text-muted-foreground mt-3 text-base max-w-xl mx-auto">
            Plug Flavor Isle into your favorite AI tool so it can look up our menu, hours, and live kitchen status for you. Copy the address below and follow the steps for your app.
          </p>
        </div>

        {/* Server URL card */}
        <div className="card-diner p-5 mb-8">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your MCP server address</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2.5 bg-muted rounded-xl text-sm text-obsidian-roast font-mono break-all select-all">
              {serverUrl}
            </code>
            <button
              onClick={copyUrl}
              className="btn-mint chrome-hover px-4 py-2.5 text-sm font-heading flex items-center gap-1.5 flex-shrink-0"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            This is a public, read-only connection — the assistant can browse our menu and store info, but can't place orders or change anything.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-heading text-sm transition-all whitespace-nowrap ${
                activeTab === id
                  ? 'bg-midnight-cherry text-white shadow-float'
                  : 'bg-white text-obsidian-roast border border-border hover:border-midnight-cherry/40'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="card-diner p-6 mb-8">
          {activeTab === 'claude' && (
            <Steps
              title="Claude (Desktop & Web)"
              steps={[
                { title: 'Open Connectors', body: 'In Claude, click your profile menu (top-right) → Settings → Connectors.' },
                { title: 'Add a custom connector', body: 'Click "Add custom connector".' },
                { title: 'Name it', body: 'Give it a name like "Flavor Isle".' },
                { title: 'Paste the address', body: 'Paste the MCP server address you copied above into the URL field.' },
                { title: 'Add it', body: 'Click Add. Claude will confirm the connection is live.' },
              ]}
            />
          )}
          {activeTab === 'chatgpt' && (
            <Steps
              title="ChatGPT (Desktop & Web)"
              steps={[
                { title: 'Enable Developer mode', body: 'Go to Apps (or Settings) and turn on Developer mode. ChatGPT will show a risk notice — confirm to continue. You may need to re-enable this occasionally.' },
                { title: 'Create an app', body: 'Click "Create app".' },
                { title: 'Name it', body: 'Name it something like "Flavor Isle".' },
                { title: 'Paste the address', body: 'Paste the MCP server address you copied above into the URL field.' },
                { title: 'Create & enable', body: 'Click Create, then enable the app from the chat composer before you prompt it.' },
              ]}
            />
          )}
          {activeTab === 'cursor' && (
            <Steps
              title="Cursor"
              steps={[
                { title: 'Open Tools & Integrations', body: 'In Cursor, go to Settings → Tools & Integrations.' },
                { title: 'New MCP Server', body: 'Click "New MCP Server". This opens your mcp.json file.' },
                { title: 'Add the entry', body: 'Add an entry whose "url" is the MCP server address you copied above. For example:' },
                { title: 'Save & toggle on', body: 'Save the file and toggle the new server on. Cursor will pick it up on reload.' },
              ]}
              codeExample={`{
  "mcpServers": {
    "flavor-isle": {
      "url": "${serverUrl}"
    }
  }
}`}
            />
          )}
          {activeTab === 'custom' && (
            <Steps
              title="Any other MCP-compatible client"
              steps={[
                { title: 'Copy the address', body: 'Grab the MCP server address from the box above.' },
                { title: 'Add a streamable HTTP server', body: 'In your client, add a new MCP server of type "streamable HTTP". A name and the URL are all most clients need.' },
                { title: 'Reload the client', body: 'Reload or restart the client so it picks up the new server and its tools.' },
              ]}
            />
          )}
        </div>

        {/* Refresh note */}
        <div className="card-diner p-5 mb-8 bg-midnight-cherry/5 border border-midnight-cherry/15">
          <div className="flex items-start gap-3">
            <Bot size={20} className="text-midnight-cherry flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-heading text-base text-obsidian-roast mb-1">Refresh after we ship changes</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AI assistants cache the tool list. If we add new menu items or capabilities and your assistant isn't seeing them, refresh or re-add the connector so it pulls the latest tools.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <Link
          to="/menu"
          className="btn-cherry chrome-hover w-full py-4 font-heading text-sm flex items-center justify-center gap-2"
        >
          Back to Menu <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

function Steps({ title, steps, codeExample }) {
  return (
    <div>
      <h2 className="font-heading text-xl text-obsidian-roast mb-4">{title}</h2>
      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-midnight-cherry text-white font-heading text-sm flex items-center justify-center">
              {i + 1}
            </span>
            <div className="flex-1 pt-0.5">
              <p className="font-heading text-sm text-obsidian-roast">{step.title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{step.body}</p>
              {codeExample && i === 2 && (
                <pre className="mt-2 p-3 bg-muted rounded-xl text-xs font-mono text-obsidian-roast overflow-x-auto whitespace-pre-wrap break-all">
                  {codeExample}
                </pre>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}