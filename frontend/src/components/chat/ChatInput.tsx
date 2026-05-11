import { useState, useRef, useEffect, type FC } from 'react';
import { 
  Mic, 
  Paperclip, 
  Sparkles, 
  ArrowUp,
  Brain,
  Code,
  HelpCircle,
  Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

const ChatInput: FC<ChatInputProps> = ({ onSend, isLoading }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const actionChips = [
    { label: "Explain Like Beginner", icon: Brain, color: "hover:text-pink-400" },
    { label: "Show Code Example", icon: Code, color: "hover:text-blue-400" },
    { label: "Generate Quiz", icon: Zap, color: "hover:text-amber-400" },
    { label: "Help with Homework", icon: HelpCircle, color: "hover:text-emerald-400" },
  ];

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSend(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 pb-8 space-y-4">
      {/* Action Chips */}
      <div className="flex flex-wrap gap-2 justify-center">
        {actionChips.map((chip) => (
          <motion.button
            key={chip.label}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setInput(chip.label)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-2xl glass-card text-xs font-medium transition-all group",
              chip.color
            )}
          >
            <chip.icon className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            <span>{chip.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Input Box */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-[2.5rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
        
        <div className={cn(
          "relative flex items-end gap-2 p-4 rounded-[2rem] glass-card shadow-2xl transition-all border-white/10 dark:border-white/5",
          isLoading && "opacity-80"
        )}>
          <button className="p-3 rounded-2xl hover:bg-muted/50 transition-colors text-muted-foreground flex-shrink-0">
            <Paperclip className="w-5 h-5" />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about IT..."
            disabled={isLoading}
            className="w-full bg-transparent border-none focus:ring-0 resize-none py-3 px-2 text-[15px] max-h-[200px] scrollbar-hide placeholder:text-muted-foreground/50"
          />

          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="p-3 rounded-2xl hover:bg-muted/50 transition-colors text-muted-foreground">
              <Mic className="w-5 h-5" />
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={cn(
                "p-3 rounded-2xl transition-all ai-glow flex items-center justify-center",
                input.trim() && !isLoading
                  ? "bg-primary text-primary-foreground scale-100"
                  : "bg-muted text-muted-foreground scale-90 opacity-50"
              )}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <ArrowUp className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Shortcuts Info */}
        <div className="flex items-center justify-between px-6 mt-3">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5 opacity-40">
              <div className="px-1.5 py-0.5 rounded-md border border-white/20 bg-white/5 text-[10px] font-bold">Shift</div>
              <span className="text-[10px]">+</span>
              <div className="px-1.5 py-0.5 rounded-md border border-white/20 bg-white/5 text-[10px] font-bold">Enter</div>
              <span className="text-[10px] ml-1">New Line</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 opacity-40">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span className="text-[10px] font-medium italic">Powered by EduAI v2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
