import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatBot, ChatMessage } from '@/hooks/useChatBot';
import { useGradientColors } from '@/hooks/useGradientColors';

function MessageBubble({ message, onButtonClick }: { message: ChatMessage; onButtonClick: (value: string) => void }) {
  const isBot = message.role === 'bot';

  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-3`}>
      <div className={`max-w-[85%] ${isBot ? 'order-2' : ''}`}>
        {isBot && (
          <div className="flex items-center gap-1.5 mb-1">
            <div className="h-5 w-5 rounded-full gradient-bg flex items-center justify-center">
              <Bot className="h-3 w-3 text-white" />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">SaveDin</span>
          </div>
        )}
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
            isBot
              ? 'bg-muted/50 text-foreground rounded-tl-md'
              : 'gradient-bg text-white rounded-tr-md'
          }`}
        >
          {message.text}
        </div>

        {/* Buttons */}
        {message.buttons && message.buttons.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.buttons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => onButtonClick(btn.value)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all hover:scale-105 ${
                  btn.value === 'cancel'
                    ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
                    : 'border-border hover:border-primary hover:bg-primary/10 hover:text-primary'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}

        <p className={`text-[9px] text-muted-foreground mt-1 ${isBot ? '' : 'text-right'}`}>
          {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, sendMessage, handleButtonClick } = useChatBot();
  const { contrastColor } = useGradientColors();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTextColor = contrastColor === 'white' ? 'text-white' : 'text-black';

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50 w-[340px] sm:w-[380px] h-[500px] max-h-[80vh] bg-background border border-border/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="gradient-bg px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className={`h-4 w-4 ${activeTextColor}`} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${activeTextColor}`}>SaveDin Assistant</p>
                  <p className={`text-[10px] ${activeTextColor} opacity-70`}>Sempre online</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className={`h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors ${activeTextColor}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-3 py-3" ref={scrollRef}>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onButtonClick={handleButtonClick}
                />
              ))}
            </ScrollArea>

            {/* Input */}
            <div className="border-t border-border/50 p-3 flex-shrink-0">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ex: gastei 50 no uber..."
                  className="flex-1 h-10 rounded-xl bg-muted/30 border-border/30"
                />
                <Button
                  onClick={handleSend}
                  size="icon"
                  disabled={!input.trim()}
                  className="h-10 w-10 rounded-xl"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[9px] text-muted-foreground text-center mt-1.5">
                "ajuda" para ver comandos
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50 h-14 w-14 rounded-full gradient-bg shadow-lg flex items-center justify-center hover:scale-110 transition-transform ${isOpen ? 'hidden' : ''}`}
        whileTap={{ scale: 0.95 }}
      >
        <MessageCircle className={`h-6 w-6 ${activeTextColor}`} />
      </motion.button>
    </>
  );
}
