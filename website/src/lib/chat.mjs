/* ─────────────────────────────────────────────────────────────
   TradeAura AI — chat widget markup.

   Static HTML only. Every message bubble is created by chat.js at
   runtime; nothing here is templated from user input, so there is
   no injection surface in the build output.

   The welcome text is duplicated from the API's prompt.js so the
   panel renders instantly without an API round-trip on open.
   ───────────────────────────────────────────────────────────── */
import { esc } from './components.mjs';
import { icon } from './icons.mjs';

const WELCOME =
  "Hi \u{1F44B} Main Aura hoon \u2014 TradeAura ki AI Sales Assistant.\n\n" +
  "Aapka business kya hai, aur abhi kaun sa kaam sabse zyada time le raha hai?\n\n" +
  "English, Hindi ya Hinglish \u2014 jis bhi bhaasha me comfortable ho, likh dijiye.";

export const ChatWidget = ({ apiBase, quickActions = [], whatsapp = '' }) => `
<div class="ta-chat" data-ta-chat data-open="false" data-typing="false"
     data-api="${esc(apiBase)}"${whatsapp ? ` data-wa="${esc(whatsapp)}"` : ''}>

  <button class="ta-chat__launcher" type="button" data-ta-chat-open
          aria-label="Open Aura, the TradeAura AI Sales Assistant" aria-expanded="false" aria-controls="ta-chat-panel">
    ${icon('chat')}
    <span class="ta-chat__launcher-label">Chat with AI</span>
    <span class="ta-chat__ping" aria-hidden="true"></span>
  </button>

  <div class="ta-chat__panel" id="ta-chat-panel" role="dialog" aria-modal="false"
       aria-label="Aura — TradeAura AI Sales Assistant">

    <div class="ta-chat__head">
      <span class="ta-chat__avatar" aria-hidden="true">TA</span>
      <span class="ta-chat__id">
        <strong class="ta-chat__title">Aura</strong>
        <span class="ta-chat__status">
          <span class="ta-chat__dot" aria-hidden="true"></span>TradeAura AI Sales Assistant
        </span>
      </span>
      <button class="ta-chat__close" type="button" data-ta-chat-close aria-label="Close chat">
        ${icon('close')}
      </button>
    </div>

    <div class="ta-chat__log" data-ta-chat-log role="log" aria-live="polite" aria-atomic="false">
      <div class="ta-chat__msg ta-chat__msg--ai">
        <div class="ta-chat__bubble">${esc(WELCOME)}</div>
      </div>
      <div class="ta-chat__typing" aria-hidden="true"><span></span><span></span><span></span></div>
    </div>

    <div class="ta-chat__quick" data-ta-chat-quick>
      ${quickActions.map((q) => `<button class="ta-chat__chip" type="button" data-ta-chat-chip="${esc(q)}">${esc(q)}</button>`).join('\n      ')}
    </div>

    <form class="ta-chat__form" data-ta-chat-form>
      <label class="ta-visually-hidden" for="ta-chat-input">Your message</label>
      <textarea class="ta-chat__input" id="ta-chat-input" data-ta-chat-input rows="1"
                placeholder="Type your message…" maxlength="1000"
                autocomplete="off" spellcheck="true"></textarea>
      <button class="ta-chat__send" type="submit" data-ta-chat-send aria-label="Send message">
        ${icon('send')}
      </button>
    </form>

    <p class="ta-chat__foot">Aura is TradeAura\u2019s AI Sales Assistant. It can help understand your requirements and connect you with our team.</p>
  </div>
</div>`;

export { WELCOME };
