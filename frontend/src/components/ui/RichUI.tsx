import { type FC, type ReactNode } from 'react';
import { Terminal as TerminalIcon, AlertCircle, Lightbulb, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

interface RichUIProps {
  children: ReactNode;
  className?: string;
}

export const Terminal: FC<RichUIProps & { title?: string }> = ({ children, title = "bash", className }) => (
  <div className={cn("my-6 rounded-xl overflow-hidden bg-zinc-950 border border-white/5 shadow-2xl", className)}>
    <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/50 border-b border-white/5">
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-2">{title}</span>
      </div>
      <TerminalIcon className="w-3.5 h-3.5 text-zinc-600" />
    </div>
    <div className="p-4 font-mono text-sm text-zinc-300">
      {children}
    </div>
  </div>
);

export const Alert: FC<RichUIProps & { type?: 'warning' | 'error' | 'info' }> = ({ children, type = 'info', className }) => {
  const styles = {
    warning: "bg-amber-500/5 border-amber-500/20 text-amber-200",
    error: "bg-red-500/5 border-red-500/20 text-red-200",
    info: "bg-blue-500/5 border-blue-500/20 text-blue-200"
  };

  const Icons = {
    warning: AlertCircle,
    error: AlertCircle,
    info: Info
  };

  const Icon = Icons[type];

  return (
    <div className={cn("my-4 p-4 rounded-2xl border flex gap-4", styles[type], className)}>
      <Icon className="w-6 h-6 flex-shrink-0" />
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
};

export const Tip: FC<RichUIProps> = ({ children, className }) => (
  <div className={cn("my-4 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex gap-4 shadow-lg shadow-indigo-500/5", className)}>
    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
      <Lightbulb className="w-6 h-6 text-indigo-400" />
    </div>
    <div>
      <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1">Pro Tip</h4>
      <div className="text-sm text-indigo-200/80 leading-relaxed">{children}</div>
    </div>
  </div>
);
