import React, { useState, useEffect } from 'react';

export interface TutorialStep {
  targetId: string;
  title: string;
  content: React.ReactNode;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    targetId: 'tutorial-role-select',
    title: 'THEATRE COMMAND',
    content: 'Welcome Commander. Start by selecting who to control. Play as the COALITION, the REGIME, or BOTH. You can also watch the AI fight itself as OBSERVER.',
    position: 'bottom',
  },
  {
    targetId: 'tutorial-coalition-side',
    title: 'THE COALITION: UNLIMITED POWER',
    content: 'The Coalition starts with maximum Economy and Public Support. They have "unlimited" debt to buy Strikes, Fighters, and Interceptors. But if the economy crashes and HAND FREE drops to 0, it is GAME OVER.',
    position: 'right',
  },
  {
    targetId: 'tutorial-regime-side',
    title: 'THE REGIME: ASYMMETRIC SURVIVAL',
    content: 'The Regime starts weak with a tiny budget. But by building bases, shipping oil, and launching cheap drones, they snowball into an industrial menace. If all bases are destroyed, they lose.',
    position: 'left',
  },
  {
    targetId: 'tutorial-resilience',
    title: 'THE NUCLEAR THREAT',
    content: 'If the Regime survives long enough and its RESILIENCE reaches 100%, they unlock the Nuclear Protocol. Once the countdown finishes, the Regime wins instantly.',
    position: 'left',
  },
  {
    targetId: 'tutorial-doctrines',
    title: 'RESEARCH & DOCTRINE',
    content: 'Don\'t forget to research Upgrades! Both sides have powerful tech trees. The Coalition must balance the budget, while the Regime must spend cash to unlock terrifying new weapons.',
    position: 'top',
  },
  {
    targetId: 'tutorial-battlefield',
    title: 'THE BATTLEFIELD',
    content: 'Watch the war unfold here. Use Scans to find hidden bases, and manage your interceptors. The war is an economy... play it to avoid it. Good luck!',
    position: 'bottom',
  }
];

interface TutorialOverlayProps {
  onComplete: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = TUTORIAL_STEPS[currentStep];

  useEffect(() => {
    const updatePosition = () => {
      const el = document.querySelector(`[data-tutorial="${step.targetId}"]`);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    // Slight delay to handle React rendering
    const timer = setTimeout(updatePosition, 100);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      clearTimeout(timer);
    };
  }, [step]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] pointer-events-auto">
      {/* Dimmed Background with a "hole" */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-500"
        style={targetRect ? {
          clipPath: `polygon(
            0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
            ${targetRect.left - 4}px ${targetRect.top - 4}px,
            ${targetRect.left - 4}px ${targetRect.bottom + 4}px,
            ${targetRect.right + 4}px ${targetRect.bottom + 4}px,
            ${targetRect.right + 4}px ${targetRect.top - 4}px,
            ${targetRect.left - 4}px ${targetRect.top - 4}px
          )`
        } : {}}
      />

      {/* Target Highlight Border */}
      {targetRect && (
        <div 
          className="absolute border-2 border-primary animate-pulse pointer-events-none transition-all duration-500"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      {/* Tooltip Popup */}
      {targetRect && (
        <div 
          className="absolute flex flex-col font-mono transition-all duration-500"
          style={(() => {
            const W = window.innerWidth;
            const H = window.innerHeight;
            const TW = 400;
            const TH = 240; // estimated tooltip height

            let top: number | undefined;
            let left: number | undefined;
            let right: number | undefined;

            if (step.position === 'bottom') {
              top = Math.min(targetRect.bottom + 20, H - TH - 10);
              left = Math.max(10, Math.min(targetRect.left + targetRect.width / 2 - TW / 2, W - TW - 10));
            } else if (step.position === 'top') {
              top = Math.max(10, targetRect.top - TH - 20);
              left = Math.max(10, Math.min(targetRect.left + targetRect.width / 2 - TW / 2, W - TW - 10));
            } else if (step.position === 'right') {
              top = Math.max(10, Math.min(targetRect.top + targetRect.height / 2 - TH / 2, H - TH - 10));
              left = Math.min(targetRect.right + 20, W - TW - 10);
            } else {
              top = Math.max(10, Math.min(targetRect.top + targetRect.height / 2 - TH / 2, H - TH - 10));
              right = W - Math.max(targetRect.left - 20, TW + 10);
            }

            return { top, left, right, width: TW, maxWidth: '90vw' };
          })()}
        >
          {/* Pixel Art Arrow */}
          <div className={`text-primary text-4xl mb-2 drop-shadow-[0_0_10px_rgba(255,191,0,0.8)] flex ${
            step.position === 'bottom' ? 'justify-center -mt-6' : 
            step.position === 'top' ? 'justify-center rotate-180 -mb-6' : 
            step.position === 'right' ? '-ml-8 mt-10 -rotate-90' : 
            'justify-end -mr-8 mt-10 rotate-90'
          }`}>
            <span style={{ imageRendering: 'pixelated' }}>▲</span>
          </div>

          <div className="bg-black/90 border-2 border-primary p-4 shadow-[0_0_20px_rgba(255,191,0,0.3)] pointer-events-auto">
            <h3 className="text-primary font-display text-lg tracking-widest mb-2 border-b border-primary/30 pb-2">
              {step.title}
            </h3>
            <p className="text-foreground text-xs leading-relaxed mb-6">
              {step.content}
            </p>
            
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-muted-foreground font-pixel">
                STEP {currentStep + 1}/{TUTORIAL_STEPS.length}
              </span>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <button onClick={handlePrev} className="px-3 py-1 border border-primary/40 text-primary hover:bg-primary/20">
                    PREV
                  </button>
                )}
                <button onClick={handleNext} className="px-3 py-1 border border-primary bg-primary/10 text-primary font-bold hover:bg-primary hover:text-black transition-all">
                  {currentStep === TUTORIAL_STEPS.length - 1 ? 'FINISH' : 'NEXT'}
                </button>
                <button onClick={onComplete} className="px-3 py-1 text-muted-foreground hover:text-white underline">
                  SKIP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Fallback if target is missing */}
      {!targetRect && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/90 border border-primary p-4 text-center">
            <p className="text-primary mb-4 font-mono text-xs">Locating target...</p>
            <button onClick={handleNext} className="px-4 py-2 border border-primary text-primary text-xs">Skip Step</button>
          </div>
        </div>
      )}
    </div>
  );
};
