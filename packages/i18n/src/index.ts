/**
 * Citizen message catalogue for SMS / WhatsApp / PWA notifications.
 *
 * Bengali and Hindi strings are first drafts and must be reviewed by
 * native speakers before any real drill. TODO(review-bn) TODO(review-hi)
 */
import type { Hazard, Lang } from "@hope/shared";

export type MessageKey = keyof typeof MESSAGES;
type Catalogue = Record<Lang, string>;

export const MESSAGES = {
  menu: {
    en: "{p} Menu: 1 Book shelter, 2 Need rescue, STATUS your booking, 9 Cancel, BN/EN/HI language, STOP opt out.",
    bn: "{p} মেনু: 1 আশ্রয় বুক, 2 উদ্ধার, STATUS বুকিং দেখুন, 9 বাতিল, BN/EN/HI ভাষা, STOP বন্ধ।",
    hi: "{p} मेनू: 1 आश्रय बुक, 2 बचाव, STATUS बुकिंग देखें, 9 रद्द, BN/EN/HI भाषा, STOP बंद।",
  },
  not_registered: {
    en: "{p} This number is not registered for disaster alerts. Ask a local volunteer or visit the HOPE website to register.",
    bn: "{p} এই নম্বর দুর্যোগ সতর্কতার জন্য নথিভুক্ত নয়। স্থানীয় স্বেচ্ছাসেবকের সাহায্যে বা HOPE ওয়েবসাইটে নথিভুক্ত করুন।",
    hi: "{p} यह नंबर आपदा अलर्ट के लिए पंजीकृत नहीं है। स्वयंसेवक से या HOPE वेबसाइट पर पंजीकरण करें।",
  },
  alert: {
    en: "{p} {hazard} {level} (source: {source}). Your area: {area}. Reply 1 to book shelter, 2 if you need rescue.",
    bn: "{p} {hazard} {level} (সূত্র: {source})। এলাকা: {area}। আশ্রয় চাইলে 1, উদ্ধার চাইলে 2 পাঠান।",
    hi: "{p} {hazard} {level} (स्रोत: {source})। क्षेत्र: {area}। आश्रय के लिए 1, बचाव के लिए 2 भेजें।",
  },
  all_clear: {
    en: "{p} All clear for {area} (source: {source}). Follow local officials before returning home.",
    bn: "{p} {area} এলাকায় বিপদ কেটে গেছে (সূত্র: {source})। বাড়ি ফেরার আগে স্থানীয় প্রশাসনের নির্দেশ মানুন।",
    hi: "{p} {area} में खतरा टल गया (स्रोत: {source})। घर लौटने से पहले स्थानीय प्रशासन की सलाह मानें।",
  },
  update: {
    en: "{p} Update (source: {source}): {text}",
    bn: "{p} আপডেট (সূত্র: {source}): {text}",
    hi: "{p} अपडेट (स्रोत: {source}): {text}",
  },
  no_active_incident: {
    en: "{p} There is no active warning for your area right now. Stay safe.",
    bn: "{p} এখন আপনার এলাকায় কোনো সতর্কতা নেই। নিরাপদে থাকুন।",
    hi: "{p} अभी आपके क्षेत्र में कोई चेतावनी नहीं है। सुरक्षित रहें।",
  },
  book_people_confirm: {
    en: "Book for {n} people? Reply 1 for yes, or reply the number of people.",
    bn: "{n} জনের জন্য বুক করবেন? হ্যাঁ হলে 1, নাহলে মোট লোকসংখ্যা লিখুন।",
    hi: "{n} लोगों के लिए बुक करें? हाँ के लिए 1, या लोगों की संख्या लिखें।",
  },
  book_people_ask: {
    en: "How many people need shelter? Reply a number, e.g. 4",
    bn: "কতজনের আশ্রয় দরকার? একটি সংখ্যা লিখুন, যেমন 4",
    hi: "कितने लोगों को आश्रय चाहिए? संख्या लिखें, जैसे 4",
  },
  book_needs: {
    en: "Is anyone elderly, disabled or unable to walk far? 1 Yes  2 No",
    bn: "কেউ কি বয়স্ক, প্রতিবন্ধী বা বেশি হাঁটতে অক্ষম? 1 হ্যাঁ  2 না",
    hi: "क्या कोई बुज़ुर्ग, दिव्यांग या ज़्यादा चल नहीं सकता? 1 हाँ  2 नहीं",
  },
  booked: {
    en: "{p} Booked: {shelter}, {n} people. Code {code}. Reach by {time}. Reply 9 to cancel.",
    bn: "{p} বুকিং হয়েছে: {shelter}, {n} জন। কোড {code}। {time} এর মধ্যে পৌঁছান। বাতিল করতে 9।",
    hi: "{p} बुकिंग हो गई: {shelter}, {n} लोग। कोड {code}। {time} तक पहुँचें। रद्द करने के लिए 9।",
  },
  book_none: {
    en: "{p} Sorry, no suitable shelter has space right now. Reply 2 to ask for rescue, or try again in 15 minutes.",
    bn: "{p} দুঃখিত, এখন কোনো উপযুক্ত আশ্রয়ে জায়গা নেই। উদ্ধারের জন্য 2 পাঠান, বা 15 মিনিট পরে আবার চেষ্টা করুন।",
    hi: "{p} क्षमा करें, अभी किसी उपयुक्त आश्रय में जगह नहीं है। बचाव के लिए 2 भेजें, या 15 मिनट बाद फिर कोशिश करें।",
  },
  already_booked: {
    en: "{p} You already have a booking: {shelter}, code {code}, until {time}. Reply 9 to cancel it.",
    bn: "{p} আপনার বুকিং আছে: {shelter}, কোড {code}, {time} পর্যন্ত। বাতিল করতে 9।",
    hi: "{p} आपकी बुकिंग पहले से है: {shelter}, कोड {code}, {time} तक। रद्द करने के लिए 9।",
  },
  hold_reminder: {
    en: "{p} Your place at {shelter} is held until {time}. Code {code}. Please leave now.",
    bn: "{p} {shelter}-এ আপনার জায়গা {time} পর্যন্ত রাখা আছে। কোড {code}। এখনই রওনা দিন।",
    hi: "{p} {shelter} में आपकी जगह {time} तक रखी है। कोड {code}। अभी निकलें।",
  },
  expired: {
    en: "{p} Your booking {code} expired. Reply 1 to book again.",
    bn: "{p} আপনার বুকিং {code} বাতিল হয়ে গেছে। আবার বুক করতে 1 পাঠান।",
    hi: "{p} आपकी बुकिंग {code} समाप्त हो गई। फिर से बुक करने के लिए 1 भेजें।",
  },
  cancelled: {
    en: "{p} Booking {code} cancelled. Reply 1 to book again.",
    bn: "{p} বুকিং {code} বাতিল করা হয়েছে। আবার বুক করতে 1 পাঠান।",
    hi: "{p} बुकिंग {code} रद्द कर दी गई। फिर से बुक करने के लिए 1 भेजें।",
  },
  nothing_to_cancel: {
    en: "You have no active booking.",
    bn: "আপনার কোনো সক্রিয় বুকিং নেই।",
    hi: "आपकी कोई सक्रिय बुकिंग नहीं है।",
  },
  checked_in: {
    en: "{p} Welcome to {shelter}. You are checked in. Stay safe.",
    bn: "{p} {shelter}-এ স্বাগত। আপনার আগমন নথিভুক্ত হয়েছে। নিরাপদে থাকুন।",
    hi: "{p} {shelter} में स्वागत है। आपका आगमन दर्ज हो गया। सुरक्षित रहें।",
  },
  rescue_people: {
    en: "How many people need rescue? Reply a number.",
    bn: "কতজনের উদ্ধার দরকার? একটি সংখ্যা লিখুন।",
    hi: "कितने लोगों को बचाव चाहिए? संख्या लिखें।",
  },
  rescue_landmark: {
    en: "Reply a nearby landmark (temple, school, shop), or 1 to use your registered address.",
    bn: "কাছের কোনো চিহ্ন লিখুন (মন্দির, স্কুল, দোকান), বা নথিভুক্ত ঠিকানার জন্য 1।",
    hi: "पास की कोई पहचान लिखें (मंदिर, स्कूल, दुकान), या पंजीकृत पते के लिए 1।",
  },
  rescue_received: {
    en: "{p} Rescue request received ({ref}). Stay on high ground. We will update you here.",
    bn: "{p} উদ্ধারের অনুরোধ পাওয়া গেছে ({ref})। উঁচু জায়গায় থাকুন। এখানেই খবর দেওয়া হবে।",
    hi: "{p} बचाव अनुरोध मिला ({ref})। ऊँची जगह पर रहें। यहीं जानकारी देंगे।",
  },
  rescue_assigned: {
    en: "{p} A rescue team ({team}) is on the way to you. Keep your phone on.",
    bn: "{p} উদ্ধারকারী দল ({team}) আপনার কাছে আসছে। ফোন চালু রাখুন।",
    hi: "{p} बचाव दल ({team}) आपकी ओर आ रहा है। फ़ोन चालू रखें।",
  },
  rescue_done: {
    en: "{p} Your rescue request {ref} is marked as rescued. Stay safe.",
    bn: "{p} আপনার উদ্ধার অনুরোধ {ref} সম্পন্ন হয়েছে। নিরাপদে থাকুন।",
    hi: "{p} आपका बचाव अनुरोध {ref} पूरा हुआ। सुरक्षित रहें।",
  },
  rescue_open: {
    en: "{p} Your rescue request {ref} is {status}. Stay on high ground.",
    bn: "{p} আপনার উদ্ধার অনুরোধ {ref}: {status}। উঁচু জায়গায় থাকুন।",
    hi: "{p} आपका बचाव अनुरोध {ref}: {status}। ऊँची जगह पर रहें।",
  },
  status_none: {
    en: "{p} You have no booking or rescue request right now.",
    bn: "{p} এখন আপনার কোনো বুকিং বা উদ্ধার অনুরোধ নেই।",
    hi: "{p} अभी आपकी कोई बुकिंग या बचाव अनुरोध नहीं है।",
  },
  unknown: {
    en: "Sorry, we did not understand. Reply 0 for the menu.",
    bn: "দুঃখিত, বুঝতে পারিনি। মেনুর জন্য 0 পাঠান।",
    hi: "क्षमा करें, समझ नहीं आया। मेनू के लिए 0 भेजें।",
  },
  invalid_number: {
    en: "Please reply a number between 1 and 30.",
    bn: "1 থেকে 30-এর মধ্যে একটি সংখ্যা লিখুন।",
    hi: "1 से 30 के बीच कोई संख्या लिखें।",
  },
  lang_changed: {
    en: "{p} Language set to English.",
    bn: "{p} ভাষা বাংলা করা হয়েছে।",
    hi: "{p} भाषा हिन्दी कर दी गई है।",
  },
  opted_out: {
    en: "{p} You will no longer receive messages. Reply START to receive alerts again.",
    bn: "{p} আপনি আর বার্তা পাবেন না। আবার সতর্কতা পেতে START পাঠান।",
    hi: "{p} अब आपको संदेश नहीं मिलेंगे। फिर से अलर्ट के लिए START भेजें।",
  },
  opted_in: {
    en: "{p} You will receive official disaster alerts again.",
    bn: "{p} আপনি আবার সরকারি দুর্যোগ সতর্কতা পাবেন।",
    hi: "{p} आपको फिर से आधिकारिक आपदा अलर्ट मिलेंगे।",
  },
  otp: {
    en: "{p} Your login code is {otp}. It expires in 5 minutes. Do not share it.",
    bn: "{p} আপনার লগইন কোড {otp}। ৫ মিনিটে মেয়াদ শেষ। কাউকে বলবেন না।",
    hi: "{p} आपका लॉगिन कोड {otp} है। 5 मिनट में समाप्त। किसी को न बताएँ।",
  },
} as const satisfies Record<string, Catalogue>;

export const HAZARD_NAMES: Record<Hazard, Catalogue> = {
  cyclone: { en: "Cyclone", bn: "ঘূর্ণিঝড়", hi: "चक्रवात" },
  flood: { en: "Flood", bn: "বন্যা", hi: "बाढ़" },
  landslide: { en: "Landslide", bn: "ভূমিধস", hi: "भूस्खलन" },
  lightning: { en: "Lightning", bn: "বজ্রপাত", hi: "आकाशीय बिजली" },
  heatwave: { en: "Heatwave", bn: "তাপপ্রবাহ", hi: "लू" },
  other: { en: "Disaster", bn: "দুর্যোগ", hi: "आपदा" },
};

export const LEVEL_NAMES: Record<"watch" | "warning" | "evacuate", Catalogue> = {
  watch: { en: "watch", bn: "সতর্কবার্তা", hi: "निगरानी" },
  warning: { en: "warning", bn: "সতর্কতা", hi: "चेतावनी" },
  evacuate: { en: "EVACUATE NOW", bn: "এখনই সরে যান", hi: "तुरंत निकलें" },
};

export const RESCUE_STATUS_NAMES: Record<string, Catalogue> = {
  new: { en: "received", bn: "গৃহীত", hi: "प्राप्त" },
  triaged: { en: "being reviewed", bn: "পর্যালোচনায়", hi: "समीक्षा में" },
  assigned: { en: "assigned to a team", bn: "দলকে দেওয়া হয়েছে", hi: "दल को सौंपा गया" },
  rescued: { en: "completed", bn: "সম্পন্ন", hi: "पूरा" },
  closed: { en: "closed", bn: "বন্ধ", hi: "बंद" },
};

export type Vars = Record<string, string | number>;

export function render(key: MessageKey, lang: Lang, vars: Vars = {}, prefix = "[HOPE]"): string {
  const template: string = MESSAGES[key][lang] ?? MESSAGES[key].en;
  return template
    .replace(/\{(\w+)\}/g, (_, name: string) => (name === "p" ? prefix : String(vars[name] ?? `{${name}}`)))
    .trim();
}

// ── SMS segment counting ────────────────────────────────────────────────────

const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXT = "^{}\\[~]|€";

export interface SegmentInfo {
  encoding: "GSM-7" | "UCS-2";
  length: number;
  segments: number;
}

/** How many SMS segments a message uses (what the operator bills for). */
export function smsSegments(text: string): SegmentInfo {
  let gsmLength = 0;
  let isGsm = true;
  for (const ch of text) {
    if (GSM7.includes(ch)) gsmLength += 1;
    else if (GSM7_EXT.includes(ch)) gsmLength += 2;
    else {
      isGsm = false;
      break;
    }
  }
  if (isGsm) {
    return { encoding: "GSM-7", length: gsmLength, segments: gsmLength <= 160 ? 1 : Math.ceil(gsmLength / 153) };
  }
  const length = text.length; // UTF-16 code units
  return { encoding: "UCS-2", length, segments: length <= 70 ? 1 : Math.ceil(length / 67) };
}

// ── Reply parsing helpers ───────────────────────────────────────────────────

const DIGIT_MAP: Record<string, string> = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
};

/** Converts Bengali and Devanagari digits to ASCII and trims the reply. */
export function normalizeReply(input: string): string {
  return input
    .replace(/[০-৯०-९]/g, (d) => DIGIT_MAP[d] ?? d)
    .trim()
    .replace(/\s+/g, " ");
}

const YES = ["1", "yes", "y", "ha", "haa", "han", "hya", "হ্যাঁ", "হা", "হ্যা", "हाँ", "हां", "हा"];
const NO = ["2", "no", "n", "na", "nahi", "না", "नहीं", "नही", "ना"];

export function parseYesNo(input: string): boolean | null {
  const v = normalizeReply(input).toLowerCase();
  if (YES.includes(v)) return true;
  if (NO.includes(v)) return false;
  return null;
}

export function parseCount(input: string, max = 30): number | null {
  const m = normalizeReply(input).match(/^\d{1,3}$/);
  if (!m) return null;
  const n = Number(m[0]);
  return n >= 1 && n <= max ? n : null;
}
