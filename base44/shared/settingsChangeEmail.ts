import { fieldLabel } from './settingsChanges.ts';

// The owner-facing change notice. Sent inline from notifySettingsChanged rather
// than as a designed template, because the body is a table whose row count changes
// with every edit. Styled with the app's brand tokens and email-safe fallbacks.

const OWNER_EMAIL = 'wesleyrbooker1@gmail.com';
const STORE_SETTINGS_URL = 'https://flavor-isle.com/admin/store-settings';
const COMMS_URL = 'https://flavor-isle.com/admin/communications';

function escapeHtml(text) {
  return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function tableRows(changes) {
  return changes.map((c) => `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #E7E1D2;vertical-align:top;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#003366;">${escapeHtml(fieldLabel(c.field))}</div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#3e5974;margin-top:2px;">${escapeHtml(c.reach || 'Store settings')}</div>
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #E7E1D2;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#8a6d3b;vertical-align:top;">${escapeHtml(c.old)}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #E7E1D2;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#003366;font-weight:bold;vertical-align:top;">${escapeHtml(c.new)}</td>
          </tr>`).join('');
}

export async function sendSettingsChangeEmail(base44, { entityName, changes, affected }) {
  const where = entityName === 'MenuSetting' ? 'Store Settings' : 'Smashie / Communications';
  const pageUrl = entityName === 'MenuSetting' ? STORE_SETTINGS_URL : COMMS_URL;
  const reach = affected === 'both'
    ? 'Both the website and the phone line'
    : affected === 'phone' ? 'The phone line' : 'The website';
  const switchWord = changes.length === 1 ? 'switch' : 'switches';

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#FDF6E3;font-family:Arial,Helvetica,sans-serif;color:#003366;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.08);">
      <div style="background:#f5a623;padding:20px 28px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;letter-spacing:1px;color:#000000;">FLAVOR ISLE: SETTINGS CHANGED</div>
      </div>
      <div style="padding:28px;">
        <p style="font-size:15px;line-height:1.6;margin:0 0 6px;">${changes.length} ${switchWord} changed in <strong>${escapeHtml(where)}</strong>.</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 18px;">Reaches: <strong>${escapeHtml(reach)}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;border-top:1px solid #E7E1D2;">
          <thead>
            <tr>
              <th align="left" style="padding:8px 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#3e5974;">Setting</th>
              <th align="left" style="padding:8px 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#3e5974;">Was</th>
              <th align="left" style="padding:8px 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#3e5974;">Now</th>
            </tr>
          </thead>
          <tbody>${tableRows(changes)}
          </tbody>
        </table>
        <p style="font-size:14px;line-height:1.6;margin:20px 0 0;">
          <a href="${pageUrl}" style="color:#CC3300;">Open ${escapeHtml(where)}</a>
        </p>
      </div>
    </div></body></html>`;

  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: OWNER_EMAIL,
      subject: `Flavor Isle settings changed: ${changes.length} ${switchWord} in ${where}`,
      body: html,
    });
    return 'sent';
  } catch (error) {
    console.error('Settings change notice failed:', error.message);
    return `failed (${error.message})`;
  }
}