'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  Package,
  Wallet,
  UserCog,
  TrendingUp,
  TrendingDown,
  Plus,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDateTime } from '@/lib/utils'

interface DashboardStats {
  totalCustomers: number
  totalProducts: number
  activeAccounts: number
  totalUsers: number
  uploadedDocuments: number
}

interface ActivityLog {
  id: string
  action: string
  entity_type: string
  created_at: string
  user_email?: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalProducts: 0,
    activeAccounts: 0,
    totalUsers: 0,
    uploadedDocuments: 0,
  })
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Fetch counts
      const [customersRes, productsRes, accountsRes, usersRes, logsRes] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(10),
      ])

      setStats({
        totalCustomers: customersRes.count || 0,
        totalProducts: productsRes.count || 0,
        activeAccounts: accountsRes.count || 0,
        totalUsers: usersRes.count || 0,
        uploadedDocuments: 0,
      })

      if (logsRes.data) {
        setRecentActivity(logsRes.data as ActivityLog[])
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  const statCards = [
    {
      title: 'Total Customers',
      value: stats.totalCustomers,
      icon: Users,
      trend: '+12%',
      trendUp: true,
    },
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      trend: '+5%',
      trendUp: true,
    },
    {
      title: 'Active Accounts',
      value: stats.activeAccounts,
      icon: Wallet,
      trend: '+8%',
      trendUp: true,
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: UserCog,
      trend: '0%',
      trendUp: true,
    },
  ]

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-lg" />
            ))}
          </div>
          <div className="h-64 bg-slate-200 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">Welcome back! Here&apos;s an overview of your business.</p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-slate-500 flex items-center mt-1">
                {stat.trendUp ? (
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                )}
                {stat.trend} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions - Now with navigation */}
      <div className="mb-8 flex gap-4">
        <Button onClick={() => router.push('/customers')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
        <Button variant="outline" onClick={() => router.push('/products')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest actions in your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell>{log.entity_type}</TableCell>
                    <TableCell>{formatDateTime(log.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No recent activity
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
