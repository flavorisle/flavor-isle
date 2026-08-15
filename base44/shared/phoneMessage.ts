const MESSAGE_INTENT = /\b(leave|send|pass|take)\b.{0,30}\bmessage\b|\bmessage\b.{0,30}\b(management|manager|owner|staff|team)\b/i;

export async function processPhoneMessageTurn(base44, record, speech, callerPhone, callSid, conversationId) {
  if (!record?.message_mode && !MESSAGE_INTENT.test(speech)) return null;

  const priorCallerWords = (record.transcript || [])
    .filter(entry => entry.role === 'user')
    .map(entry => entry.content)
    .join('\n');
  const extracted = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Extract management-message details from this phone-call text. Never invent a missing value. The actual message is what the caller wants relayed, not their request to leave a message.\nEarlier caller words:\n${priorCallerWords}\nNewest caller words:\n${speech}`,
    response_json_schema: {
      type: 'object',
      properties: {
        caller_name: { type: 'string' },
        recipient: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['caller_name', 'recipient', 'message'],
    },
  });
  const draft = {
    caller_name: extracted.caller_name?.trim() || record.message_draft?.caller_name || '',
    recipient: extracted.recipient?.trim() || record.message_draft?.recipient || '',
    message: extracted.message?.trim() || record.message_draft?.message || '',
  };

  if (draft.caller_name && draft.recipient && draft.message) {
    await base44.asServiceRole.entities.PhoneMessage.create({
      ...draft,
      caller_phone: callerPhone,
      conversation_id: conversationId,
      call_sid: callSid,
      channel: 'voice',
      status: 'new',
    });
    await base44.asServiceRole.entities.SmsConversation.update(record.id, { message_mode: false, message_draft: {} });
    return { reply: `Got it, ${draft.caller_name}. I'll make sure ${draft.recipient} gets your message.` };
  }

  await base44.asServiceRole.entities.SmsConversation.update(record.id, { message_mode: true, message_draft: draft });
  if (!draft.caller_name) return { reply: "For sure — what's your name?" };
  if (!draft.recipient) return { reply: 'Who should I send the message to?' };
  return { reply: `What would you like me to tell ${draft.recipient}?` };
}