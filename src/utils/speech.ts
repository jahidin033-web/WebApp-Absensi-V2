/**
 * Voice feedback menggunakan Web Speech API dengan aksen Bahasa Indonesia
 */
export function speakIndonesian(text: string, enabled = true): void {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  try {
    window.speechSynthesis.cancel(); // batalkan suara yang sedang berjalan
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.pitch = 1.15; // nada ramah natural
    utterance.rate = 1.0;

    // Cari suara id-ID jika tersedia di sistem
    const voices = window.speechSynthesis.getVoices();
    const indonesianVoice = voices.find(
      (v) => v.lang.startsWith('id') || v.lang.includes('ID')
    );

    if (indonesianVoice) {
      utterance.voice = indonesianVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}
