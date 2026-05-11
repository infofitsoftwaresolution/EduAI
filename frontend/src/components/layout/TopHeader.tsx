import { useChatStore } from '../../store/useChatStore';
import { 
  Bell, 
  Moon, 
  Sun, 
  User,
  Share2,
  Zap
} from 'lucide-react';


const TopHeader = () => {
  const { currentTopic } = useChatStore();

  return (
    <header className="h-20 glass border-b px-8 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full animate-pulse" />
          </div>
          <div>
            <h2 className="font-bold text-sm leading-none">Learning Assistant</h2>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-500" />
              Online & Ready
            </p>
          </div>
        </div>

        <div className="h-8 w-px bg-white/10 mx-2" />

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-white/5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Topic:</span>
          <span className="text-sm font-medium">{currentTopic}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center gap-1 mr-4">
          <button className="p-2 rounded-xl hover:bg-muted/50 transition-colors relative">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full" />
          </button>
          <button className="p-2 rounded-xl hover:bg-muted/50 transition-colors">
            <Share2 className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex items-center gap-2 p-1 rounded-2xl bg-muted/30 border border-white/5">
          <button className="p-2 rounded-xl bg-background shadow-lg transition-all">
            <Moon className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-all">
            <Sun className="w-4 h-4" />
          </button>
        </div>

        <button className="flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 transition-all ai-glow ml-2">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium">Profile</span>
        </button>
      </div>
    </header>
  );
};

export default TopHeader;
