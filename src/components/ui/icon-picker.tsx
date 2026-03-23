import { useState, forwardRef, useMemo } from 'react';
import { Check, Search, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

// Complete Apple-style emoji library organized by category
export const EMOJI_CATEGORIES = {
  'Frequentes': ['⭐', '✅', '🎯', '📁', '🔥', '💪', '📅', '⏰', '📝', '💡', '🚀', '❤️'],
  
  'Expressões': [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗',
    '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶',
    '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
    '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️',
    '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞',
    '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺',
    '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'
  ],
  
  'Gestos': [
    '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
    '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️',
    '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀',
    '👁️', '👅', '👄'
  ],
  
  'Pessoas': [
    '👶', '👧', '🧒', '👦', '👩', '🧑', '👨', '👩‍🦱', '🧑‍🦱', '👨‍🦱', '👩‍🦰', '🧑‍🦰', '👨‍🦰', '👱‍♀️', '👱', '👱‍♂️',
    '👩‍🦳', '🧑‍🦳', '👨‍🦳', '👩‍🦲', '🧑‍🦲', '👨‍🦲', '🧔‍♀️', '🧔', '🧔‍♂️', '👵', '🧓', '👴', '👲', '👳‍♀️', '👳', '👳‍♂️',
    '🧕', '👮‍♀️', '👮', '👮‍♂️', '👷‍♀️', '👷', '👷‍♂️', '💂‍♀️', '💂', '💂‍♂️', '🕵️‍♀️', '🕵️', '🕵️‍♂️', '👩‍⚕️', '🧑‍⚕️', '👨‍⚕️',
    '👩‍🌾', '🧑‍🌾', '👨‍🌾', '👩‍🍳', '🧑‍🍳', '👨‍🍳', '👩‍🎓', '🧑‍🎓', '👨‍🎓', '👩‍🎤', '🧑‍🎤', '👨‍🎤', '👩‍🏫', '🧑‍🏫', '👨‍🏫', '👩‍🏭',
    '🧑‍🏭', '👨‍🏭', '👩‍💻', '🧑‍💻', '👨‍💻', '👩‍💼', '🧑‍💼', '👨‍💼', '👩‍🔧', '🧑‍🔧', '👨‍🔧', '👩‍🔬', '🧑‍🔬', '👨‍🔬', '👩‍🎨', '🧑‍🎨',
    '👨‍🎨', '👩‍🚀', '🧑‍🚀', '👨‍🚀', '🧘‍♀️', '🧘', '🧘‍♂️', '🏃‍♀️', '🏃', '🏃‍♂️', '🚶‍♀️', '🚶', '🚶‍♂️', '💃', '🕺', '🕴️'
  ],
  
  'Animais': [
    '🐶', '🐕', '🦮', '🐕‍🦺', '🐩', '🐺', '🦊', '🦝', '🐱', '🐈', '🐈‍⬛', '🦁', '🐯', '🐅', '🐆', '🐴',
    '🐎', '🦄', '🦓', '🦌', '🦬', '🐮', '🐂', '🐃', '🐄', '🐷', '🐖', '🐗', '🐽', '🐏', '🐑', '🐐',
    '🐪', '🐫', '🦙', '🦒', '🐘', '🦣', '🦏', '🦛', '🐭', '🐁', '🐀', '🐹', '🐰', '🐇', '🐿️', '🦫',
    '🦔', '🦇', '🐻', '🐻‍❄️', '🐨', '🐼', '🦥', '🦦', '🦨', '🦘', '🦡', '🐾', '🦃', '🐔', '🐓', '🐣',
    '🐤', '🐥', '🐦', '🐧', '🕊️', '🦅', '🦆', '🦢', '🦉', '🦤', '🪶', '🦩', '🦚', '🦜', '🐸', '🐊',
    '🐢', '🦎', '🐍', '🐲', '🐉', '🦕', '🦖', '🐳', '🐋', '🐬', '🦭', '🐟', '🐠', '🐡', '🦈', '🐙',
    '🐚', '🐌', '🦋', '🐛', '🐜', '🐝', '🪲', '🐞', '🦗', '🪳', '🕷️', '🦂', '🦟', '🪰', '🪱', '🦠'
  ],
  
  'Natureza': [
    '💐', '🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🪴', '🌲', '🌳', '🌴', '🌵',
    '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🪹', '🪺', '🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍',
    '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🫐', '🥝', '🍅', '🫒', '🥥', '🥑', '🍆', '🥔', '🥕',
    '🌽', '🌶️', '🫑', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🫘', '🌰'
  ],
  
  'Comida': [
    '🍞', '🥐', '🥖', '🫓', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕',
    '🌭', '🥪', '🌮', '🌯', '🫔', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🫕', '🥣', '🥗', '🍿', '🧈',
    '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡',
    '🥟', '🥠', '🥡', '🦀', '🦞', '🦐', '🦑', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁',
    '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🫖', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹',
    '🍺', '🍻', '🥂', '🥃', '🫗', '🥤', '🧋', '🧃', '🧉', '🧊'
  ],
  
  'Atividades': [
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍',
    '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌',
    '🎿', '⛷️', '🏂', '🪂', '🏋️‍♀️', '🏋️', '🏋️‍♂️', '🤼‍♀️', '🤼', '🤼‍♂️', '🤸‍♀️', '🤸', '🤸‍♂️', '⛹️‍♀️', '⛹️', '⛹️‍♂️',
    '🤺', '🤾‍♀️', '🤾', '🤾‍♂️', '🏌️‍♀️', '🏌️', '🏌️‍♂️', '🏇', '🧘‍♀️', '🧘', '🧘‍♂️', '🏄‍♀️', '🏄', '🏄‍♂️', '🏊‍♀️', '🏊',
    '🏊‍♂️', '🤽‍♀️', '🤽', '🤽‍♂️', '🚣‍♀️', '🚣', '🚣‍♂️', '🧗‍♀️', '🧗', '🧗‍♂️', '🚵‍♀️', '🚵', '🚵‍♂️', '🚴‍♀️', '🚴', '🚴‍♂️',
    '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧',
    '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🪗', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰',
    '🧩'
  ],
  
  'Viagem': [
    '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🦯', '🦽',
    '🦼', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋',
    '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️',
    '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '🪝', '⛽', '🚧', '🚦', '🚥',
    '🚏', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️',
    '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🛖', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣',
    '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🕍', '🛕', '🕋', '⛩️', '🛤️',
    '🛣️', '🗾', '🎑', '🏞️', '🌅', '🌄', '🌠', '🎇', '🎆', '🌇', '🌆', '🏙️', '🌃', '🌌', '🌉', '🌁'
  ],
  
  'Objetos': [
    '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼',
    '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭',
    '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸',
    '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️', '🛠️',
    '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️',
    '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊',
    '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🪠', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀',
    '🧼', '🪥', '🪒', '🧽', '🪣', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🪆',
    '🖼️', '🪞', '🪟', '🛍️', '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🎊', '🎉', '🎎', '🏮', '🎐',
    '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷️', '🪧', '📪', '📫', '📬', '📭', '📮',
    '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅', '🗑️', '📇', '🗃️',
    '🗳️', '🗄️', '📋', '📁', '📂', '🗂️', '🗞️', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚',
    '📖', '🔖', '🧷', '🔗', '📎', '🖇️', '📐', '📏', '🧮', '📌', '📍', '✂️', '🖊️', '🖋️', '✒️', '🖌️',
    '🖍️', '📝', '✏️', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓'
  ],
  
  'Símbolos': [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓',
    '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
    '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️',
    '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵',
    '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢',
    '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆',
    '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️',
    '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🛗', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼',
    '⚧️', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕',
    '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️',
    '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️',
    '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄',
    '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '🟰', '♾️', '💲', '💱', '™️', '©️', '®️', '👁️‍🗨️', '🔚',
    '🔙', '🔛', '🔝', '🔜', '〰️', '➰', '➿', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣',
    '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️',
    '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕',
    '📣', '📢', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐', '🕑', '🕒', '🕓',
    '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣',
    '🕤', '🕥', '🕦', '🕧'
  ],
  
  'Bandeiras': [
    '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', '🇧🇷', '🇺🇸', '🇬🇧', '🇪🇸', '🇫🇷', '🇩🇪', '🇮🇹', '🇵🇹',
    '🇯🇵', '🇰🇷', '🇨🇳', '🇮🇳', '🇷🇺', '🇦🇷', '🇲🇽', '🇨🇦', '🇦🇺'
  ],
} as const;

// Flat list of all emojis for search
export const ALL_EMOJIS = Object.values(EMOJI_CATEGORIES).flat();

// Legacy ICONS object for backwards compatibility
export const ICONS: Record<string, string> = {
  target: '🎯', check: '✅', calendar: '📅', clock: '⏰', notebook: '📓', pencil: '✏️',
  file: '📄', folder: '📁', bookmark: '🔖', clipboard: '📋', memo: '📝', pushpin: '📌',
  star: '⭐', rocket: '🚀', crown: '👑', thumbup: '👍', fire: '🔥', bulb: '💡',
  chart: '📊', trophy: '🏆', medal: '🏅', gem: '💎', sparkles: '✨', hundred: '💯',
  heart: '❤️', leaf: '🌿', apple: '🍎', running: '🏃', muscle: '💪', yoga: '🧘',
  brain: '🧠', sleeping: '😴', water: '💧', salad: '🥗', meditation: '🧘‍♀️',
  dollar: '💵', wallet: '👛', bag: '🛍️', money: '💰', creditcard: '💳', piggy: '🐷',
  bank: '🏦', receipt: '🧾', bell: '🔔', megaphone: '📢', chat: '💬', email: '📧',
  phone: '📞', envelope: '✉️', speech: '💭', computer: '💻', mobile: '📱', settings: '⚙️',
  shield: '🛡️', keyboard: '⌨️', mouse: '🖱️', printer: '🖨️', lightbulb: '💡', battery: '🔋',
  book: '📚', graduation: '🎓', school: '🏫', pencilbook: '📖', science: '🔬', math: '🧮',
  globe: '🌍', language: '🗣️', gift: '🎁', music: '🎵', play: '▶️', gamepad: '🎮',
  movie: '🎬', camera: '📷', art: '🎨', party: '🎉', balloon: '🎈', sun: '☀️',
  moon: '🌙', rainbow: '🌈', flower: '🌸', tree: '🌳', mountain: '⛰️', beach: '🏖️',
  rain: '🌧️', snow: '❄️', coffee: '☕', pizza: '🍕', burger: '🍔', cake: '🎂',
  icecream: '🍦', fruits: '🍇', cooking: '🍳', wine: '🍷', house: '🏠', car: '🚗',
  plane: '✈️', train: '🚆', bike: '🚴', ship: '🚢', camping: '🏕️', world: '🗺️',
  soccer: '⚽', basketball: '🏀', tennis: '🎾', golf: '⛳', swimming: '🏊', skiing: '⛷️',
  fishing: '🎣', hiking: '🥾', dog: '🐕', cat: '🐈', bird: '🐦', fish: '🐟',
  butterfly: '🦋', bee: '🐝', love: '💕', peace: '☮️', luck: '🍀', magic: '🪄',
  infinity: '♾️', yin: '☯️', pin: '📍', key: '🔑', lock: '🔒', tools: '🛠️',
  package: '📦', tag: '🏷️', link: '🔗', hourglass: '⏳',
};

export type IconKey = keyof typeof ICONS;

// Portuguese translations for emoji search
const EMOJI_TRANSLATIONS: Record<string, string[]> = {
  // Productivity
  '🎯': ['alvo', 'meta', 'objetivo', 'foco', 'target'],
  '✅': ['verificar', 'concluido', 'pronto', 'feito', 'ok', 'certo', 'check'],
  '📅': ['calendario', 'data', 'agenda', 'dia', 'calendar'],
  '⏰': ['relogio', 'hora', 'tempo', 'alarme', 'clock'],
  '📝': ['nota', 'escrever', 'memo', 'lembrete', 'anotacao'],
  '📁': ['pasta', 'arquivo', 'folder', 'diretorio'],
  '📋': ['lista', 'clipboard', 'tarefas', 'checklist'],
  '📌': ['fixar', 'pin', 'importante', 'marcar'],
  
  // Success
  '⭐': ['estrela', 'favorito', 'destaque', 'star'],
  '🚀': ['foguete', 'lancamento', 'rapido', 'rocket'],
  '👑': ['coroa', 'rei', 'rainha', 'crown', 'vip'],
  '🔥': ['fogo', 'quente', 'popular', 'fire', 'streak'],
  '💡': ['lampada', 'ideia', 'luz', 'bulb'],
  '🏆': ['trofeu', 'premio', 'vitoria', 'trophy'],
  '💎': ['diamante', 'joia', 'precioso', 'gem'],
  '✨': ['brilho', 'magia', 'sparkles', 'especial'],
  '💯': ['cem', 'perfeito', 'hundred', '100'],
  
  // Health
  '❤️': ['coracao', 'amor', 'heart', 'saude'],
  '💪': ['musculo', 'forca', 'treino', 'academia', 'muscle'],
  '🧠': ['cerebro', 'mente', 'brain', 'pensar'],
  '😴': ['dormir', 'sono', 'descanso', 'sleep'],
  '💧': ['agua', 'hidratacao', 'water'],
  '🥗': ['salada', 'saudavel', 'dieta', 'vegetais'],
  '🧘': ['yoga', 'meditacao', 'relaxar', 'paz'],
  '🏃': ['correr', 'corrida', 'exercicio', 'running'],
  
  // Finance
  '💵': ['dinheiro', 'dollar', 'grana', 'money'],
  '💰': ['rico', 'dinheiro', 'money', 'tesouro'],
  '💳': ['cartao', 'credito', 'pagamento', 'card'],
  '🏦': ['banco', 'bank', 'financeiro'],
  '🛍️': ['compras', 'shopping', 'loja', 'sacola'],
  
  // Communication
  '🔔': ['sino', 'notificacao', 'alerta', 'bell'],
  '💬': ['conversa', 'chat', 'mensagem'],
  '📧': ['email', 'correio', 'mail'],
  '📞': ['telefone', 'ligar', 'phone'],
  
  // Tech
  '💻': ['computador', 'laptop', 'notebook', 'computer'],
  '📱': ['celular', 'smartphone', 'mobile', 'phone'],
  '⚙️': ['configuracao', 'settings', 'opcoes'],
  '🛡️': ['escudo', 'shield', 'protecao', 'seguranca'],
  
  // Education
  '📚': ['livros', 'estudar', 'books', 'leitura'],
  '🎓': ['formatura', 'diploma', 'graduation'],
  '🔬': ['ciencia', 'pesquisa', 'science'],
  
  // Entertainment
  '🎁': ['presente', 'gift', 'surpresa'],
  '🎵': ['musica', 'music', 'som'],
  '🎮': ['jogo', 'game', 'videogame'],
  '🎬': ['filme', 'cinema', 'movie'],
  '🎨': ['arte', 'pintura', 'art', 'criativo'],
  '🎉': ['festa', 'party', 'celebracao'],
  
  // Nature
  '☀️': ['sol', 'dia', 'sun', 'verao'],
  '🌙': ['lua', 'noite', 'moon'],
  '🌸': ['flor', 'sakura', 'flower', 'primavera'],
  '🌳': ['arvore', 'tree', 'natureza'],
  '🏖️': ['praia', 'beach', 'ferias'],
  '⛰️': ['montanha', 'mountain', 'pico'],
  
  // Food
  '☕': ['cafe', 'coffee', 'manha'],
  '🍕': ['pizza', 'comida', 'italiana'],
  '🍔': ['hamburguer', 'burger', 'lanche'],
  '🎂': ['bolo', 'aniversario', 'cake'],
  
  // Travel
  '🏠': ['casa', 'lar', 'home', 'house'],
  '🚗': ['carro', 'automovel', 'car'],
  '✈️': ['aviao', 'viagem', 'plane', 'voo'],
  '🚆': ['trem', 'metro', 'train'],
  
  // Sports
  '⚽': ['futebol', 'bola', 'soccer'],
  '🏀': ['basquete', 'basketball'],
  '🏊': ['natacao', 'nadar', 'swimming'],
  
  // Animals
  '🐕': ['cachorro', 'cao', 'dog', 'pet'],
  '🐈': ['gato', 'cat', 'felino'],
  '🐦': ['passaro', 'bird', 'ave'],
  '🦋': ['borboleta', 'butterfly'],
  
  // Symbols
  '💕': ['amor', 'love', 'coracoes'],
  '☮️': ['paz', 'peace'],
  '🍀': ['sorte', 'trevo', 'luck'],
  '🪄': ['magia', 'varinha', 'magic'],
  '♾️': ['infinito', 'infinity', 'eterno'],
  '🔑': ['chave', 'key', 'acesso'],
  '🔒': ['cadeado', 'lock', 'privado'],
  '📦': ['pacote', 'caixa', 'package', 'entrega'],
  '🔗': ['link', 'conexao', 'url'],
  '⏳': ['ampulheta', 'tempo', 'hourglass'],
};

// Helper function to check if a string contains an emoji
export function isEmoji(str: string): boolean {
  if (!str) return false;
  const chars = [...str];
  if (chars.length > 4) return false;
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{2705}]|[\u{270F}]|[\u{2708}]|[\u{2615}]|[\u{2764}]/u;
  return emojiRegex.test(str);
}

// Normalize string for search (remove accents)
function normalizeSearch(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  size?: 'sm' | 'md' | 'lg';
  allowEmpty?: boolean;
}

// Trigger button with forwardRef for Popover compatibility
const IconPickerTrigger = forwardRef<HTMLButtonElement, { 
  selectedEmoji: string | null; 
  sizeClass: string;
  onClick?: () => void;
}>(({ selectedEmoji, sizeClass, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      sizeClass,
      'rounded-xl bg-muted hover:bg-muted/80 transition-all flex items-center justify-center border-2 border-transparent hover:border-primary/20'
    )}
    title="Escolher ícone"
    {...props}
  >
    {selectedEmoji ? (
      <span>{selectedEmoji}</span>
    ) : (
      <span className="text-muted-foreground text-sm">Nenhum</span>
    )}
  </button>
));
IconPickerTrigger.displayName = 'IconPickerTrigger';

export function IconPicker({ value, onChange, size = 'md', allowEmpty = true }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-xl',
    lg: 'w-12 h-12 text-2xl',
  };
  
  const gridSizeClasses = {
    sm: 'w-7 h-7 text-base',
    md: 'w-8 h-8 text-lg',
    lg: 'w-9 h-9 text-xl',
  };

  // Get the emoji to display - support empty/null values
  const selectedEmoji = useMemo(() => {
    if (!value || value === 'none' || value === '') return null;
    if (ICONS[value as IconKey]) return ICONS[value as IconKey];
    if (isEmoji(value)) return value;
    return '⭐'; // Fallback
  }, [value]);
  
  // Filter emojis based on search
  const filteredResults = useMemo(() => {
    if (!search.trim()) return null; // Show categories when no search
    
    const searchNormalized = normalizeSearch(search);
    const results: string[] = [];
    
    // Search through all emojis
    ALL_EMOJIS.forEach(emoji => {
      // Check translations
      const translations = EMOJI_TRANSLATIONS[emoji];
      if (translations) {
        const matches = translations.some(t => 
          normalizeSearch(t).includes(searchNormalized)
        );
        if (matches) {
          results.push(emoji);
          return;
        }
      }
      // Also match the emoji itself
      if (emoji.includes(search)) {
        results.push(emoji);
      }
    });
    
    return results;
  }, [search]);

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setOpen(false);
    setSearch('');
    setActiveCategory(null);
  };

  const handleClearIcon = () => {
    onChange('');
    setOpen(false);
    setSearch('');
    setActiveCategory(null);
  };
  
  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setSearch('');
        setActiveCategory(null);
      }
    }}>
      <PopoverTrigger asChild>
        <IconPickerTrigger 
          selectedEmoji={selectedEmoji} 
          sizeClass={sizeClasses[size]} 
        />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        {/* Search input */}
        <div className="p-3 border-b border-border space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar emoji..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          
          {/* No icon option */}
          {allowEmpty && !search && (
            <button
              type="button"
              onClick={handleClearIcon}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                !selectedEmoji 
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              <X className="h-4 w-4" />
              <span>Sem ícone</span>
              {!selectedEmoji && <Check className="h-4 w-4 ml-auto" />}
            </button>
          )}
        </div>
        
        {/* Content area */}
        <div 
          className="h-72 overflow-y-auto overscroll-contain touch-pan-y"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y'
          }}
          onWheel={(e) => {
            e.stopPropagation();
            const target = e.currentTarget;
            target.scrollTop += e.deltaY;
          }}
        >
          <div className="p-3">
            {filteredResults !== null ? (
              // Search results
              filteredResults.length > 0 ? (
                <div className="grid grid-cols-8 gap-1">
                  {filteredResults.map((emoji, idx) => (
                    <button
                      key={`${emoji}-${idx}`}
                      type="button"
                      onClick={() => handleSelect(emoji)}
                      className={cn(
                        gridSizeClasses[size],
                        'rounded-lg transition-all flex items-center justify-center relative hover:scale-110',
                        value === emoji 
                          ? 'bg-primary/20 ring-2 ring-primary' 
                          : 'hover:bg-muted'
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Nenhum emoji encontrado
                </div>
              )
            ) : activeCategory ? (
              // Category view
              <div>
                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
                >
                  ← Voltar
                </button>
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, idx) => (
                    <button
                      key={`${emoji}-${idx}`}
                      type="button"
                      onClick={() => handleSelect(emoji)}
                      className={cn(
                        gridSizeClasses[size],
                        'rounded-lg transition-all flex items-center justify-center relative hover:scale-110',
                        value === emoji 
                          ? 'bg-primary/20 ring-2 ring-primary' 
                          : 'hover:bg-muted'
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Categories list
              <div className="space-y-4">
                {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                  <div key={category}>
                    <button
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 hover:text-foreground transition-colors"
                    >
                      <span>{category}</span>
                      <span className="text-[10px] normal-case">Ver todos →</span>
                    </button>
                    <div className="grid grid-cols-8 gap-1">
                      {emojis.slice(0, 8).map((emoji, idx) => (
                        <button
                          key={`${emoji}-${idx}`}
                          type="button"
                          onClick={() => handleSelect(emoji)}
                          className={cn(
                            gridSizeClasses[size],
                            'rounded-lg transition-all flex items-center justify-center relative hover:scale-110',
                            value === emoji 
                              ? 'bg-primary/20 ring-2 ring-primary' 
                              : 'hover:bg-muted'
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Results count */}
        <div className="px-3 py-2 border-t border-border text-xs text-muted-foreground">
          {filteredResults !== null 
            ? `${filteredResults.length} resultado${filteredResults.length !== 1 ? 's' : ''}`
            : `${ALL_EMOJIS.length} emojis disponíveis`
          }
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Helper component to display an icon by key
interface IconDisplayProps {
  icon: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallback?: string;
}

export function Icon3D({ icon, size = 'md', className, fallback }: IconDisplayProps) {
  const sizeClasses = {
    xs: 'text-sm',
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  // Handle empty/none icon
  if (!icon || icon === 'none' || icon === '') {
    if (fallback) {
      return <span className={cn(sizeClasses[size], className)}>{fallback}</span>;
    }
    return null;
  }

  // If the icon key exists in ICONS, use the emoji
  // Otherwise check if it's an emoji directly
  const emoji = ICONS[icon as IconKey] || (isEmoji(icon) ? icon : null);
  
  if (!emoji) {
    if (fallback) {
      return <span className={cn(sizeClasses[size], className)}>{fallback}</span>;
    }
    return null;
  }
  
  return (
    <span className={cn(sizeClasses[size], className)}>
      {emoji}
    </span>
  );
}

// Get default icon for a category
export function getDefaultIcon(category: 'task' | 'project' | 'goal' | 'habit'): IconKey {
  const defaults: Record<string, IconKey> = {
    task: 'check',
    project: 'folder',
    goal: 'target',
    habit: 'fire',
  };
  return defaults[category] || 'star';
}
