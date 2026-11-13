'use client';

export default function SpeakButton({ word }: { word: string }) {
  function handleClick() {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(word));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Pronounce ${word}`}
      className="rounded border px-2 py-1 text-sm"
    >
      🔊
    </button>
  );
}
