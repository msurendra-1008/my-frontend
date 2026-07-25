import { useState, useEffect } from 'react';
import { nowIST } from '@/utils/format';

interface ISTClockProps {
  className?: string;
}

export function ISTClock({ className }: ISTClockProps) {
  const [time, setTime] = useState(nowIST);

  useEffect(() => {
    const id = setInterval(() => setTime(nowIST()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={className ?? 'text-[11px] font-mono text-muted-foreground tabular-nums'}>
      {time} IST
    </span>
  );
}
