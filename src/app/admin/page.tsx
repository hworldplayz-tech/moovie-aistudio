'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import AdminDashboard from '@/components/admin-dashboard';

export default function AdminLoginPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null); // Using any to avoid type complexity here, simpler
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Dynamic Login via Server Action
      const { verifyUserLogin } = await import('./actions');
      const result = await verifyUserLogin(username, password);

      if (result.success && result.user) {
        toast({
          title: 'Login Successful',
          description: `Welcome back, ${result.user.username}!`,
        });
        setIsLoggedIn(true);
        setCurrentUser(result.user);
        // In a real app, you'd set a cookie here. For now, React state handles the view.
        // But we need to distinguish dashboards.
        // Since we are currently just rendering <AdminDashboard /> conditionally, 
        // we will pass the user prop to it or handle routing if we split pages.
        // For now, let's update state to store user info.

        // Note: The user wants "Partner Dashboard" vs "Admin Dashboard".
        // If we keep it simple single-page for now:
        if (result.user.role === 'partner') {
          // We'll need to pass this role to the dashboard component
          // For now, assume AdminDashboard handles it or we redirect
          // But this page currently just renders AdminDashboard on success.
          // I will modify AdminDashboard to accept a 'user' prop.
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: result.error || 'Invalid credentials',
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoggedIn && currentUser) {
    return <AdminDashboard user={currentUser} />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the admin panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
