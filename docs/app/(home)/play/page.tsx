'use client';

import VectorGlobe from '../../../../dist/index.es';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader } from '@/components/ui/loader';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckIcon, CopyIcon, KeyboardIcon, SettingsIcon } from 'lucide-react';
import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsFloat,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from 'nuqs';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

export default function PlayPage() {
  const mainRef = useRef(null);
  const simulationRef = useRef<VectorGlobe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  useEffect(() => {
    if (mainRef.current) {
      simulationRef.current = new VectorGlobe(mainRef.current);
      simulationRef.current.start();
      setIsLoading(false);

      return () => {
        if (simulationRef.current) {
          simulationRef.current.stop();
          simulationRef.current = null;
        }
      };
    }
  }, []);

  return (
    <main
      className='relative -mt-14 flex size-full items-center justify-center bg-white dark:bg-black'
      ref={mainRef}
    >
      {isLoading ? (
        <div className='absolute flex size-full items-center justify-center'>
          <Loader size='lg' />
        </div>
      ) : (
        <div className='pointer-events-none absolute size-full max-w-7xl'>
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button
                className='pointer-events-auto absolute left-2 top-16 z-10'
                variant='outline'
                size='icon'
                aria-label='Configuration Menu'
              >
                <SettingsIcon aria-hidden='true' />
              </Button>
            </DialogTrigger>
            <DialogContent className='!size-[91.666667%] max-w-7xl overflow-auto'>
              <DialogHeader className='flex flex-row items-center justify-start gap-3'>
                <DialogTitle>Configuration</DialogTitle>
                <Button
                  className='size-6'
                  size='icon'
                  variant='ghost'
                  aria-label='Copy Config'
                  // onClick={handleCopy}
                >
                  {isCopied ? (
                    <CheckIcon className='size-4' aria-hidden='true' />
                  ) : (
                    <CopyIcon className='size-4' aria-hidden='true' />
                  )}
                </Button>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                className='pointer-events-auto absolute left-14 top-16 z-10'
                variant='outline'
                size='icon'
                aria-label='Configuration Menu'
              >
                <KeyboardIcon aria-hidden='true' />
              </Button>
            </DialogTrigger>
            <DialogContent className='overflow-auto'>
              <DialogHeader className='mb-6'>
                <DialogTitle>Keybinds</DialogTitle>
              </DialogHeader>
              <div className='bg-popover mb-4 flex h-20 flex-col rounded-md p-4'>
                <div className='mb-2 flex items-center'>
                  <kbd className='bg-muted mr-2 rounded px-2 py-1'>space</kbd>
                  <span>: multipleSplats</span>
                </div>
                <p className='text-muted-foreground text-sm'>
                  Is set to splat 5 splats
                </p>
              </div>
              <div className='bg-popover mb-4 flex h-20 flex-col rounded-md p-4'>
                <div className='mb-2 flex items-center'>
                  <kbd className='bg-muted mr-2 rounded px-2 py-1'>p</kbd>
                  <span>: togglePause</span>
                </div>
              </div>
              <div className='bg-popover mb-4 flex h-20 flex-col rounded-md p-4'>
                <div className='mb-2 flex items-center'>
                  <kbd className='bg-muted mr-2 rounded px-2 py-1'>shift</kbd> +
                  <kbd className='bg-muted mr-2 rounded px-2 py-1'>p</kbd>
                  <span>: togglePause</span>
                </div>
                <p className='text-muted-foreground text-sm'>
                  Has drawWhilePaused enabled{' '}
                </p>
              </div>
              <div className='bg-popover mb-4 flex h-20 flex-col rounded-md p-4'>
                <div className='mb-2 flex items-center'>
                  <kbd className='bg-muted mr-2 rounded px-2 py-1'>s</kbd>
                  <span>: downloadScreenshot</span>
                </div>
                <p className='text-muted-foreground text-sm'>
                  NOTE: Screenshots often look better with transparency disabled
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </main>
  );
}
