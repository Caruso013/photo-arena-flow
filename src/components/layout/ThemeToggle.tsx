import { Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  return (
    <Button variant="ghost" size="icon" className="h-9 w-9" disabled title="Tema claro fixo">
      <Sun className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">Tema claro fixo</span>
    </Button>
  );
}
