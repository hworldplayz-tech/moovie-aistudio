
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(1, { message: 'Password cannot be empty.' }),
});

type AuthFormProps = {
  type: 'login' | 'signup';
};

export function AuthForm({ type }: AuthFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setTimeout(() => {
        toast({
            title: 'Feature Under Development',
            description: 'The login/signup functionality is not yet available. Thank you for your patience!',
        });
        setIsLoading(false);
    }, 500);
  }

  async function handleGoogleSignIn() {
    setIsLoading(true);
    setTimeout(() => {
        toast({
            title: 'Feature Under Development',
            description: 'The login/signup functionality is not yet available. Thank you for your patience!',
        });
        setIsLoading(false);
    }, 500);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{type === 'login' ? 'Welcome Back' : 'Create an Account'}</CardTitle>
        <CardDescription>
          {type === 'login'
            ? 'Enter your credentials to access your account.'
            : 'Enter your email and password to sign up.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {type === 'login' ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>
        </Form>
        {type === 'login' && (
            <>
                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                    </div>
                </div>
                <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                    <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4"><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.95-4.25 1.95-3.37 0-6.13-2.73-6.13-6.13s2.76-6.13 6.13-6.13c1.88 0 3.13.79 3.85 1.48l2.34-2.34C16.88 2.56 14.99 2 12.48 2 7.23 2 3.24 6.09 3.24 11.31s3.99 9.31 9.24 9.31c4.5 0 7.42-3.08 7.42-7.63 0-.5-.04-.99-.12-1.48h-7.82z"></path></svg>
                    }
                    Google
                </Button>
            </>
        )}
        <div className="mt-4 text-center text-sm">
          {type === 'login' ? "Don't have an account?" : 'Already have an account?'}
          <Link href={type === 'login' ? '/signup' : '/login'} className="underline ml-1">
            {type === 'login' ? 'Sign up' : 'Sign in'}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
