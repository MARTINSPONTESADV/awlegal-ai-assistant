import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import type { PresetKey } from "@/hooks/useMarketingData";

interface Props {
  preset: PresetKey;
  onPreset: (key: PresetKey) => void;
  onCustomRange: (from: Date, to: Date) => void;
}

const presets: { key: PresetKey; label: string }[] = [
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
  { key: "all", label: "Tudo" },
];

export default function MarketingDateFilter({ preset, onPreset, onCustomRange }: Props) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<{ from?: Date; to?: Date }>({});

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {presets.map((p) => (
        <Button
          key={p.key}
          size="sm"
          variant={preset === p.key ? "default" : "outline"}
          onClick={() => onPreset(p.key)}
          className="text-xs h-8"
        >
          {p.label}
        </Button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> Personalizado
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={range as any}
            onSelect={(r: any) => {
              setRange(r || {});
              if (r?.from && r?.to) {
                onCustomRange(r.from, r.to);
                setOpen(false);
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
