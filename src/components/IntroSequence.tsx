import React, { useState, useEffect } from 'react';
import { sounds } from '../lib/soundUtils';

interface Dialogue {
  char: 'president' | 'ayatollah';
  text: string;
}

const dialogues: Dialogue[] = [
  { char: 'president', text: "Listen, we've got the best missiles. Huge missiles. Everyone says so. You're making a big mistake." },
  { char: 'ayatollah', text: "Your 'huge missiles' are but playthings compared to the resilience of our holy soil. We are an ocean, you are but a bucket." },
  { char: 'president', text: "A bucket? A bucket? I'm gonna fill that ocean with freedom. Total freedom. Fast. Very fast." },
  { char: 'ayatollah', text: "Then let the iron rain begin. Our hydra has many heads, and each fire you light only makes us stronger." },
  { char: 'president', text: "Sad! We’ll see. We’ll see. Launching now. It’s gonna be beautiful." }
];

export const IntroSequence: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [index, setIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    let i = 0;
    const text = dialogues[index].text;
    setDisplayedText('');
    setIsTyping(true);
    sounds.play('click');

    const timer = setInterval(() => {
      setDisplayedText(prev => prev + text.charAt(i));
      i++;
      if (i >= text.length) {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, 40);

    return () => clearInterval(timer);
  }, [index]);

  const handleNext = () => {
    if (isTyping) {
      setDisplayedText(dialogues[index].text);
      setIsTyping(false);
      return;
    }
    if (index < dialogues.length - 1) {
      setIndex(prev => prev + 1);
    } else {
      sounds.play('launch');
      onComplete();
    }
  };

  const currentChar = dialogues[index].char;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 font-mono overflow-hidden">
      {/* CRT Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]" />
      
      <div className="max-w-4xl w-full flex flex-col gap-12 border-4 border-primary/20 p-8 relative bg-card/40 backdrop-blur-sm">
        <div className="flex justify-between items-center gap-8">
          {/* President Side */}
          <div className={`transition-all duration-500 flex flex-col items-center gap-4 ${currentChar === 'president' ? 'scale-110 opacity-100' : 'scale-90 opacity-40 grayscale'}`}>
            <div className="w-48 h-48 border-4 border-coalition shadow-[0_0_20px_rgba(30,144,255,0.3)] bg-black overflow-hidden relative">
              <img src="/president.png" alt="President" className="w-full h-full object-cover pixelated" />
            </div>
            <span className="text-coalition font-pixel text-[10px] tracking-tighter">THE COMMANDER</span>
          </div>

          <div className="flex-1 flex flex-col items-center gap-2">
             <div className="w-1 h-24 bg-primary/20 animate-pulse" />
             <span className="text-primary font-pixel text-[12px] opacity-40">VS</span>
             <div className="w-1 h-24 bg-primary/20 animate-pulse" />
          </div>

          {/* Ayatollah Side */}
          <div className={`transition-all duration-500 flex flex-col items-center gap-4 ${currentChar === 'ayatollah' ? 'scale-110 opacity-100' : 'scale-90 opacity-40 grayscale'}`}>
            <div className="w-48 h-48 border-4 border-regime shadow-[0_0_20px_rgba(255,69,0,0.3)] bg-black overflow-hidden relative">
              <img src="/ayatollah.png" alt="Ayatollah" className="w-full h-full object-cover pixelated" />
            </div>
            <span className="text-regime font-pixel text-[10px] tracking-tighter">THE SUPREME</span>
          </div>
        </div>

        {/* Dialogue Box */}
        <div className="min-h-[120px] bg-black/80 border-2 border-primary/40 p-6 flex flex-col justify-between group cursor-pointer" onClick={handleNext}>
          <div className="text-primary text-sm leading-relaxed tracking-wide">
            <span className={currentChar === 'president' ? 'text-coalition' : 'text-regime'}>
              [{currentChar.toUpperCase()}]: 
            </span>{' '}
            {displayedText}
            {isTyping && <span className="animate-pulse">_</span>}
          </div>
          <div className="self-end mt-4 text-[10px] text-primary/40 animate-pulse font-pixel">
            [PRESS {isTyping ? 'TO SKIP TYPING' : 'TO CONTINUE'}]
          </div>
        </div>
      </div>

      <button 
        onClick={onComplete}
        className="mt-8 text-[10px] text-muted-foreground hover:text-primary transition-colors font-pixel"
      >
        SKIP INTRO
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        .pixelated { image-rendering: pixelated; }
      `}} />
    </div>
  );
};
