'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// Dashboard metrics interfaces
interface PerformanceMetrics {
  onboardingRate: number      // % of new customers who got loans
  disbursementRate: number // % of applications disbursed
  collectionRate: number  // % of due amounts collected
  recoveryRate: number   // % of overdue recovered
}

interface OnboardingMetrics {
  totalApplications: number
  pendingApplications: number
  approvedApplications: number
  disbursedApplications: number
}

interface CollectionMetrics {
  totalDue: number
  totalCollected: number
  totalDueToday: number
  totalOverdue: number
}

export default function DashboardPage() {
  const [performance, setPerformance] = useState<PerformanceMetrics>({
    onboardingRate: 0,
    disbursementRate: 0,
    collectionRate: 0,
    recoveryRate: 0,
  })
  const [onboarding, setOnboarding] = useState<OnboardingMetrics>({
    totalApplications: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    disbursedApplications: 0,
  })
  const [collection, setCollection] = useState<CollectionMetrics>({
    totalDue: 0,
    totalCollected: 0,
    totalDueToday: 0,
    totalOverdue: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    setLoading(true)
    const supabase = createClient()

    try {
      // Fetch loans data
      const [
        loansRes,
        repaymentsRes,
        customersRes
      ] = await Promise.all([
        supabase.from('loans').select('*'),
        supabase.from('loan_repayments').select('*'),
        supabase.from('customers').select('id', { count: 'exact', head: true })
      ])

      const loans = loansRes.data || []
      const repayments = repaymentsRes.data || []
      const totalCustomers = customersRes.count || 0

      // Calculate Onboarding Metrics
      const totalApplications = loans.length
      const pendingApplications = loans.filter(l => l.status === 'pending').length
      const approvedApplications = loans.filter(l => l.status === 'approved').length
      const disbursedApplications = loans.filter(l => l.status === 'disbursed').length

      setOnboarding({
        totalApplications,
        pendingApplications,
        approvedApplications,
        disbursedApplications,
      })

      // Calculate Performance Metrics (Percentages)
      const onboardingRate = totalCustomers > 0 ? Math.round((disbursedApplications / totalCustomers) * 100) : 0
      const disbursementRate = totalApplications > 0 ? Math.round((disbursedApplications / totalApplications) * 100) : 0

      // Calculate Collection Metrics
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString()

      // Total principal + interest from disbursed loans
      const totalPrincipal = loans
        .filter(l => l.status === 'disbursed')
        .reduce((sum, l) => sum + (l.principal_amount || 0) + (l.principal_amount * l.interest_rate / 100), 0)

      // Total paid from repayments
      const totalPaid = repayments
        .filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + (r.paid_amount || 0), 0)

      // Due today (repayments due today or before)
      const dueToday = repayments
        .filter(r => r.status !== 'paid' && new Date(r.due_date) <= today)
        .reduce((sum, r) => sum + (r.due_amount || 0), 0)

      // Overdue (past due date and not paid)
      const overdue = repayments
        .filter(r => r.status === 'overdue' || (r.status !== 'paid' && new Date(r.due_date) < today))
        .reduce((sum, r) => sum + (r.due_amount - r.paid_amount), 0)

      setCollection({
        totalDue: totalPrincipal,
        totalCollected: totalPaid,
        totalDueToday: dueToday,
        totalOverdue: overdue > 0 ? overdue : 0,
      })

      // Collection rate %
      const collectionRate = totalPrincipal > 0 ? Math.round((totalPaid / totalPrincipal) * 100) : 0
      
      // Recovery rate (% of overdue that was recovered - using partial payments as proxy)
      const recoveryRate = (totalPrincipal - totalPaid) > 0 
        ? Math.round((totalPaid / (totalPrincipal - totalPaid)) * 100) 
        : 0

      setPerformance({
        onboardingRate: Math.min(100, onboardingRate),
        disbursementRate: Math.min(100, disbursementRate),
        collectionRate: Math.min(100, collectionRate),
        recoveryRate: Math.min(100, recoveryRate),
      })

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-slate-200 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-slate-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">Loan Portfolio Overview</p>
      </div>

      {/* Main 3 Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* PERFORMANCE CARD */}
        <Card className="col-span-1">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Performance
            </CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              {/* Onboarding % */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">Onboarding</span>
                </div>
                <span className="text-lg font-bold text-blue-600">{performance.onboardingRate}%</span>
              </div>
              
              {/* Disbursement % */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">Disbursement</span>
                </div>
                <span className="text-lg font-bold text-green-600">{performance.disbursementRate}%</span>
              </div>
              
              {/* Collection % */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">Collection</span>
                </div>
                <span className="text-lg font-bold text-purple-600">{performance.collectionRate}%</span>
              </div>
              
              {/* Recovery % */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">Recovery</span>
                </div>
                <span className="text-lg font-bold text-orange-600">{performance.recoveryRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ONBOARDING CARD */}
        <Card className="col-span-1">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Onboarding
            </CardTitle>
            <CardDescription>Application status count</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              {/* Total Applications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">Total Reports</span>
                </div>
                <span className="text-lg font-bold text-slate-900">{onboarding.totalApplications}</span>
              </div>

              {/* Pending */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-slate-600">Pending</span>
                </div>
                <span className="text-lg font-bold text-yellow-600">{onboarding.pendingApplications}</span>
              </div>

              {/* Approved */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-slate-600">Approved</span>
                </div>
                <span className="text-lg font-bold text-green-600">{onboarding.approvedApplications}</span>
              </div>

              {/* Disbursed */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-blue-500" />
                  <span className="text-slate-600">Disbursed</span>
                </div>
                <span className="text-lg font-bold text-blue-600">{onboarding.disbursedApplications}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* COLLECTION CARD */}
        <Card className="col-span-1">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              Collection
            </CardTitle>
            <CardDescription>Payment tracking</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              {/* Total Due */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">Total Due</span>
                </div>
                <span className="text-lg font-bold text-slate-900">{formatCurrency(collection.totalDue)}</span>
              </div>

              {/* Total Collection */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-slate-600">Total Collection</span>
                </div>
                <span className="text-lg font-bold text-green-600">{formatCurrency(collection.totalCollected)}</span>
              </div>

              {/* Due Today */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-slate-600">Due Today</span>
                </div>
                <span className="text-lg font-bold text-yellow-600">{formatCurrency(collection.totalDueToday)}</span>
              </div>

              {/* Overdue */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-slate-600">Post Due</span>
                </div>
                <span className="text-lg font-bold text-red-600">{formatCurrency(collection.totalOverdue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Quick Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{performance.onboardingRate}%</div>
            <div className="text-sm text-slate-500">Onboarding Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-green-600">{performance.disbursementRate}%</div>
            <div className="text-sm text-slate-500">Disbursement Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-purple-600">{performance.collectionRate}%</div>
            <div className="text-sm text-slate-500">Collection Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-orange-600">{performance.recoveryRate}%</div>
            <div className="text-sm text-slate-500">Recovery Rate</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
