import React, { useState } from 'react';
import { Phone, MessageSquare, MessagesSquare, Bot } from 'lucide-react';
import Navbar from '@/components/Navbar';
import AdminNav from '@/components/admin/AdminNav';
import ConversationLog from '@/components/admin/ConversationLog';
import ManagementMessageLog from '@/components/admin/ManagementMessageLog';
import SmashieSettingsPanel from '@/components/admin/SmashieSettingsPanel';
import SmsBroadcastPanel from '@/components/admin/SmsBroadcastPanel';
import SmsSubscribersList from '@/components/admin/SmsSubscribersList';
import SmsQrCode from '@/components/SmsQrCode';
import OrderSmsLog from '@/components/admin/OrderSmsLog';
import BlockedContactsPanel from '@/components/admin/BlockedContactsPanel';
import CounterPassThroughPanel from '@/components/admin/CounterPassThroughPanel';
import { Send, Users, ShieldOff, PhoneForwarded } from 'lucide-react';

const TABS = [
  { key: 'phone', label: 'Phone Log', Icon: Phone },
  { key: 'sms', label: 'SMS Log', Icon: MessageSquare },
  { key: 'broadcast', label: 'Send Text', Icon: Send },
  { key: 'subscribers', label: 'Subscribers', Icon: Users },
  { key: 'messages', label: 'Message Log', Icon: MessagesSquare },
  { key: 'blocked', label: 'Blocked', Icon: ShieldOff },
  { key: 'passthrough', label: 'Pass-Through', Icon: PhoneForwarded },
  { key: 'settings', label: 'Smashie Settings', Icon: Bot },
];

export default function AdminCommunications() {
  const [tab, setTab] = useState('phone');

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <AdminNav />

      <div className="bg-obsidian-roast py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-1">Admin</p>
          <h1 className="font-heading text-3xl text-white">Communications</h1>
          <p className="text-gray-300 mt-1 text-sm">Phone calls, SMS threads, Smashie conversations, and AI settings.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-heading whitespace-nowrap border-b-2 transition-all ${
                tab === key
                  ? 'border-midnight-cherry text-midnight-cherry'
                  : 'border-transparent text-muted-foreground hover:text-obsidian-roast'
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {tab === 'phone' && <ConversationLog channel="voice" />}
        {tab === 'sms' && <><OrderSmsLog /><ConversationLog channel="sms" /></>}
        {tab === 'broadcast' && <SmsBroadcastPanel />}
        {tab === 'subscribers' && (
          <>
            <SmsSubscribersList />
            <SmsQrCode />
          </>
        )}
        {tab === 'messages' && <ManagementMessageLog />}
        {tab === 'blocked' && <BlockedContactsPanel />}
        {tab === 'passthrough' && <CounterPassThroughPanel />}
        {tab === 'settings' && <SmashieSettingsPanel />}
      </div>
    </div>
  );
}