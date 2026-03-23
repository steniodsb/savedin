import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0"));

export function TimePicker({
  value,
  onChange,
  disabled = false,
  placeholder = "--:--",
  className,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  
  const [selectedHour, selectedMinute] = React.useMemo(() => {
    if (!value) return ["", ""];
    const [h, m] = value.split(":");
    return [h || "", m || ""];
  }, [value]);

  const handleHourSelect = (hour: string) => {
    const newMinute = selectedMinute || "00";
    onChange(`${hour}:${newMinute}`);
  };

  const handleMinuteSelect = (minute: string) => {
    const newHour = selectedHour || "00";
    onChange(`${newHour}:${minute}`);
  };

  const handleClear = () => {
    onChange("");
    setOpen(false);
  };

  const displayValue = value || placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal",
            !value && "text-muted-foreground",
            disabled && "opacity-50",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 z-[9999] pointer-events-auto mx-4" 
        align="center"
        sideOffset={8}
      >
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-medium">Selecionar horário</span>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleClear}
              >
                Limpar
              </Button>
            )}
          </div>
          
          {/* Time selectors */}
          <div className="flex p-4 gap-2 justify-center">
            {/* Hours */}
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground text-center mb-2">Hora</span>
              <ScrollArea className="h-[180px] w-16 rounded-lg border border-border/50 bg-muted/30">
                <div className="p-1.5">
                  {hours.map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => handleHourSelect(hour)}
                      className={cn(
                        "w-full px-2 py-2 text-sm rounded-md transition-colors text-center font-medium",
                        selectedHour === hour
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      {hour}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Separator */}
            <div className="flex items-center justify-center px-2 pt-6">
              <span className="text-2xl font-bold text-muted-foreground">:</span>
            </div>

            {/* Minutes */}
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground text-center mb-2">Min</span>
              <ScrollArea className="h-[180px] w-16 rounded-lg border border-border/50 bg-muted/30">
                <div className="p-1.5">
                  {minutes.map((minute) => (
                    <button
                      key={minute}
                      type="button"
                      onClick={() => handleMinuteSelect(minute)}
                      className={cn(
                        "w-full px-2 py-2 text-sm rounded-md transition-colors text-center font-medium",
                        selectedMinute === minute
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      {minute}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Confirm button */}
          <div className="px-4 pb-4">
            <Button
              type="button"
              className="w-full"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={!value}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
