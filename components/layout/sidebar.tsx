'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard,
  Users,
  Wallet,
  UserCog,
  FileText,
  Settings,
  LogOut,
  CreditCard,
  DollarSign,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navigation = [
{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Loans', href: '/loans', icon: DollarSign },
  { name: 'Repayments', href: '/repayments', icon: CreditCard },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Accounts', href: '/accounts', icon: Wallet },
  { name: 'Users', href: '/users', icon: UserCog },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className={cn('flex min-h-screen flex-col bg-slate-900', className)}>
      <div className="flex h-16 items-center border-b border-slate-800 px-6">
        <h1 className="text-lg font-bold text-white">Secure Dashboard</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  )
}
