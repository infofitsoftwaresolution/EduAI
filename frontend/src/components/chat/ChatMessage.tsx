import { useState, type FC } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Message } from '../../store/useChatStore';
import { cn } from '../../lib/utils';
import { 
  Copy, 
  Check, 
  RefreshCcw, 
  ThumbsUp, 
  ThumbsDown,
  User,
  Zap,
  Terminal as TerminalIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Tip } from '../ui/RichUI';


interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

const ChatMessage: FC<ChatMessageProps> = ({ message, isStreaming }) => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const isAI = message.role === 'assistant';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "flex w-full mb-8 group",
        isAI ? "justify-start" : "justify-end"
      )}
    >
      <div className={cn(
        "flex max-w-[85%] gap-4",
        isAI ? "flex-row" : "flex-row-reverse"
      )}>
        {/* Avatar */}
        <div className={cn(
          "w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center border shadow-xl transition-transform duration-300 group-hover:scale-105",
          isAI 
            ? "bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border-indigo-500/30 text-indigo-500" 
            : "bg-gradient-to-br from-zinc-700 to-zinc-900 border-zinc-600/50 text-white"
        )}>
          {isAI ? <Zap className="w-5 h-5" /> : <User className="w-5 h-5" />}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-2">
          <div className={cn(
            "p-5 rounded-[2rem] shadow-2xl relative overflow-hidden",
            isAI 
              ? "bg-card/40 backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-tl-none" 
              : "bg-primary text-primary-foreground rounded-tr-none"
          )}>
            {/* Background Glow for AI */}
            {isAI && (
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/5 blur-[80px] pointer-events-none" />
            )}

            <div className="prose prose-zinc dark:prose-invert max-w-none text-[15px] leading-relaxed">
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const code = String(children).replace(/\n$/, '');
                    
                    if (!inline && match) {
                      return (
                        <div className="relative my-4 group/code">
                          <div className="absolute right-3 top-3 z-20 opacity-0 group-hover/code:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleCopy(code)}
                              className="p-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all"
                            >
                              {copied === code ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white" />}
                            </button>
                          </div>
                          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 border-b border-white/5 rounded-t-xl">
                            <TerminalIcon className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{match[1]}</span>
                          </div>
                          <SyntaxHighlighter
                            style={atomDark}
                            language={match[1]}
                            PreTag="div"
                            className="!mt-0 !rounded-t-none !rounded-b-xl !bg-zinc-900/80 !p-4 !border-none"
                            {...props}
                          >
                            {code}
                          </SyntaxHighlighter>
                        </div>
                      );
                    }
                    return (
                      <code className={cn("px-1.5 py-0.5 rounded bg-zinc-800/50 text-indigo-300 font-mono text-sm", className)} {...props}>
                        {children}
                      </code>
                    );
                  },
                  blockquote({ children }) {
                    return <Tip>{children}</Tip>;
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-indigo-500 animate-pulse ml-1 align-middle" />
              )}
            </div>
          </div>

          {/* Actions for AI */}
          {isAI && (
            <div className="flex items-center gap-3 ml-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button className="p-2 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-indigo-400">
                <RefreshCcw className="w-3.5 h-3.5" />
              </button>
              <button className="p-2 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-indigo-400">
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button className="p-2 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-indigo-400">
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-muted-foreground/50 ml-auto mr-2 uppercase tracking-widest font-bold">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatMessage;
