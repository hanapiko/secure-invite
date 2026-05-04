'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertCircle, CheckCircle2, Clock, Search, Wallet,
  TrendingDown, CalendarClock, BadgeCheck,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────
interface Repayment {
  id: string
  loan_id: string
  instalment_number: number
  due_date: string
  due_amount: number
  paid_amount: number
  paid_date?: string
  status: string
  payment_method?: string
  mpesa_receipt?: string
  notes?: string
  principal_portion: number
  interest_portion: number
  // Joined
  customer_name?: string
  loan_type?: string
  penalty_amount?: number
}

interface PenaltyLog {
  loan_id: string
  repayment_id: string
  penalty_amount: number
  penalty_rate: number
  reason: string
}

function formatKES(amount: number) {
  return `KES ${Number(amount || 0).toLocaleString('en-KE')}`
}

function daysDiff(dateStr: string) {
  const due = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
}

const LOAN_TYPE_LABELS: Record<string, string> = {
  one_week: '1-Week',
  two_week: '2-Week',
  four_week: '4-Week',
}

const PENALTY_RATES: Record<string, number> = {
  one_week: 1.0,
  two_week: 1.0,
  four_week: 1.5,
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function RepaymentsPage() {
  const [repayments, setRepayments] = useState<Repayment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRepayment, setSelectedRepayment] = useState<Repayment | null>(null)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  const [paymentForm, setPaymentForm] = useState({
    amount_paid: 0,
    payment_method: 'mpesa',
    mpesa_receipt: '',
    paid_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  useEffect(() => {
    fetchRepayments()
  }, [statusFilter])

  async function fetchRepayments() {
    setLoading(true)
    const supabase = createClient()

    try {
      let query = supabase
        .from('loan_repayments')
        .select(`
          *,
          loans (
            loan_type,
            customers ( full_name )
          )
        `)
        .order('due_date', { ascending: true })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
      if (error) throw error

      // Fetch penalties per repayment
      const { data: penalties } = await supabase
        .from('loan_penalties')
        .select('repayment_id, penalty_amount')
        .eq('status', 'pending')

      const penaltyMap: Record<string, number> = {}
      ;(penalties || []).forEach((p: any) => {
        penaltyMap[p.repayment_id] = (penaltyMap[p.repayment_id] || 0) + p.penalty_amount
      })

      const mapped: Repayment[] = (data || []).map((r: any) => ({
        id: r.id,
        loan_id: r.loan_id,
        instalment_number: r.instalment_number,
        due_date: r.due_date,
        due_amount: r.due_amount,
        paid_amount: r.paid_amount || 0,
        paid_date: r.paid_date,
        status: r.status,
        payment_method: r.payment_method,
        mpesa_receipt: r.mpesa_receipt,
        notes: r.notes,
        principal_portion: r.principal_portion,
        interest_portion: r.interest_portion,
        customer_name: r.loans?.customers?.full_name || 'Unknown',
        loan_type: r.loans?.loan_type || '',
        penalty_amount: penaltyMap[r.id] || 0,
      }))

      setRepayments(mapped)
    } catch (e: any) {
      setError(e.message || 'Failed to load repayments')
    } finally {
      setLoading(false)
    }
  }

  // Calculate daily penalty for an overdue repayment
  function calculatePenalty(repayment: Repayment): number {
    if (repayment.status === 'paid') return 0
    const days = daysDiff(repayment.due_date)
    if (days <= 0) return 0
    const rate = PENALTY_RATES[repayment.loan_type || 'one_week'] || 1.0
    return Math.round(repayment.due_amount * (rate / 100) * days * 100) / 100
  }

  function openPaymentDialog(repayment: Repayment) {
    setSelectedRepayment(repayment)
    const remaining = repayment.due_amount - repayment.paid_amount
    const penalty = calculatePenalty(repayment)
    setPaymentForm({
      amount_paid: remaining + penalty,
      payment_method: 'mpesa',
      mpesa_receipt: '',
      paid_date: new Date().toISOString().split('T')[0],
      notes: '',
    })
    setError('')
    setSuccess('')
    setIsPaymentDialogOpen(true)
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRepayment) return
    setSaving(true)
    setError('')
    const supabase = createClient()

    try {
      const remaining = selectedRepayment.due_amount - selectedRepayment.paid_amount
      const penalty = calculatePenalty(selectedRepayment)
      const totalDue = remaining + penalty
      const newPaidAmount = selectedRepayment.paid_amount + paymentForm.amount_paid

      // Determine new status
      let newStatus = 'partial'
      if (paymentForm.amount_paid >= totalDue) {
        newStatus = 'paid'
      }

      // Update repayment
      const { error: repaymentError } = await supabase
        .from('loan_repayments')
        .update({
          paid_amount: newPaidAmount,
          paid_date: paymentForm.paid_date,
          payment_method: paymentForm.payment_method,
          mpesa_receipt: paymentForm.mpesa_receipt || null,
          notes: paymentForm.notes || null,
          status: newStatus,
        })
        .eq('id', selectedRepayment.id)

      if (repaymentError) throw repaymentError

      // Log penalty if overdue
      if (penalty > 0) {
        const rate = PENALTY_RATES[selectedRepayment.loan_type || 'one_week'] || 1.0
        const days = daysDiff(selectedRepayment.due_date)
        await supabase.from('loan_penalties').insert({
          loan_id: selectedRepayment.loan_id,
          repayment_id: selectedRepayment.id,
          penalty_amount: penalty,
          penalty_rate: rate,
          reason: `Late payment — ${days} day(s) overdue`,
          status: paymentForm.amount_paid >= totalDue ? 'paid' : 'pending',
        })
      }

      // Check if all instalments are now paid → mark loan completed
      if (newStatus === 'paid') {
        const { data: allInstalments } = await supabase
          .from('loan_repayments')
          .select('id, status')
          .eq('loan_id', selectedRepayment.loan_id)

        const allPaid = (allInstalments || []).every(
          (inst: any) => inst.id === selectedRepayment.id || inst.status === 'paid'
        )

        if (allPaid) {
          await supabase
            .from('loans')
            .update({ status: 'completed' })
            .eq('id', selectedRepayment.loan_id)

          setSuccess('Payment recorded! 🎉 Loan fully cleared and marked Completed.')
        } else {
          setSuccess('Payment recorded successfully!')
        }
      } else {
        setSuccess('Partial payment recorded.')
      }

      setTimeout(() => {
        setIsPaymentDialogOpen(false)
        setSelectedRepayment(null)
        fetchRepayments()
        setSuccess('')
      }, 1500)
    } catch (e: any) {
      setError(e.message || 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  // ─── Derived data ──────────────────────────────────────────────────────────
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todaysDue = repayments.filter((r) => {
    const due = new Date(r.due_date)
    due.setHours(0, 0, 0, 0)
    return due.getTime() === today.getTime() && r.status !== 'paid'
  })

  const overdueItems = repayments.filter((r) => {
    return daysDiff(r.due_date) > 0 && r.status !== 'paid'
  })

  const filtered = repayments.filter((r) => {
    if (searchTerm && !r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )
  const totalPages = Math.ceil(filtered.length / itemsPerPage)

  // Summary stats
  const totalDue = repayments.reduce((s, r) => s + r.due_amount, 0)
  const totalPaid = repayments.reduce((s, r) => s + r.paid_amount, 0)
  const totalPending = repayments
    .filter((r) => r.status !== 'paid')
    .reduce((s, r) => s + (r.due_amount - r.paid_amount), 0)

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-slate-200 rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-lg" />)}
          </div>
          <div className="h-96 bg-slate-200 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Repayments</h1>
        <p className="text-slate-500 mt-1">Track and record loan instalment payments</p>
      </div>

      {/* Global messages */}
      {success && <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm">{success}</div>}
      {error && <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}

      {/* ── Summary Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-500">Total Due</span>
            </div>
            <p className="text-xl font-bold text-slate-800">{formatKES(totalDue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <BadgeCheck className="h-4 w-4 text-green-500" />
              <span className="text-xs text-slate-500">Total Collected</span>
            </div>
            <p className="text-xl font-bold text-green-700">{formatKES(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <CalendarClock className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-slate-500">Due Today</span>
            </div>
            <p className="text-xl font-bold text-blue-700">{todaysDue.length} instalment{todaysDue.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-xs text-slate-500">Overdue</span>
            </div>
            <p className="text-xl font-bold text-red-600">{overdueItems.length} instalment{overdueItems.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Today's Due ──────────────────────────────────────────── */}
      {todaysDue.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-blue-700 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Due Today ({todaysDue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todaysDue.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 shadow-sm">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{r.customer_name}</p>
                    <p className="text-xs text-slate-500">
                      {LOAN_TYPE_LABELS[r.loan_type || '']} · Instalment {r.instalment_number} · {formatKES(r.due_amount - r.paid_amount)} remaining
                    </p>
                  </div>
                  <Button size="sm" onClick={() => openPaymentDialog(r)}>
                    Record Payment
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Overdue Alert ─────────────────────────────────────────── */}
      {overdueItems.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Overdue Instalments ({overdueItems.length}) — Penalties Accruing Daily
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueItems.slice(0, 5).map((r) => {
                const days = daysDiff(r.due_date)
                const penalty = calculatePenalty(r)
                return (
                  <div key={r.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 shadow-sm">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{r.customer_name}</p>
                      <p className="text-xs text-red-500">
                        {days} day{days !== 1 ? 's' : ''} overdue · Penalty: {formatKES(penalty)} · Total: {formatKES((r.due_amount - r.paid_amount) + penalty)}
                      </p>
                    </div>
                    <Button size="sm" variant="destructive" onClick={() => openPaymentDialog(r)}>
                      Collect Now
                    </Button>
                  </div>
                )
              })}
              {overdueItems.length > 5 && (
                <p className="text-xs text-red-500 text-center pt-1">
                  +{overdueItems.length - 5} more overdue — use filter below to see all
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Filters ──────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by client name..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Instalments</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Main Table ───────────────────────────────────────────── */}
      <Card>
        <CardContent>
          {paginated.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Loan</TableHead>
                  <TableHead>Instalment</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount Due</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Penalty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((r) => {
                  const days = daysDiff(r.due_date)
                  const penalty = calculatePenalty(r)
                  const isOverdue = days > 0 && r.status !== 'paid'
                  const remaining = r.due_amount - r.paid_amount

                  return (
                    <TableRow
                      key={r.id}
                      className={isOverdue ? 'bg-red-50 hover:bg-red-100' : ''}
                    >
                      <TableCell className="font-medium text-slate-800">
                        {r.customer_name}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                          {LOAN_TYPE_LABELS[r.loan_type || ''] || r.loan_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-slate-700">#{r.instalment_number}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{formatDate(r.due_date)}</p>
                          {isOverdue && (
                            <p className="text-xs text-red-500">{days}d overdue</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{formatKES(r.due_amount)}</TableCell>
                      <TableCell className="font-mono text-sm text-green-700">
                        {formatKES(r.paid_amount)}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-red-600">
                        {penalty > 0 ? formatKES(penalty) : '—'}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          r.status === 'paid'    ? 'bg-green-100 text-green-700' :
                          r.status === 'partial' ? 'bg-blue-100 text-blue-700' :
                          r.status === 'overdue' ? 'bg-red-100 text-red-700' :
                          isOverdue              ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {r.status === 'paid' && <CheckCircle2 className="h-3 w-3" />}
                          {(r.status === 'overdue' || isOverdue) && <AlertCircle className="h-3 w-3" />}
                          {r.status === 'paid' ? 'Paid' : isOverdue ? 'Overdue' : r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status !== 'paid' && (
                          <Button
                            size="sm"
                            variant={isOverdue ? 'destructive' : 'outline'}
                            onClick={() => openPaymentDialog(r)}
                          >
                            Record
                          </Button>
                        )}
                        {r.status === 'paid' && (
                          <span className="text-xs text-slate-400">
                            {r.paid_date ? formatDate(r.paid_date) : 'Cleared'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Clock className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No repayments found</p>
              <p className="text-sm mt-1">Generate repayments from the Loans page after disbursing a loan.</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline" size="sm"
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-600">Page {currentPage} of {totalPages}</span>
              <Button
                variant="outline" size="sm"
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Record Payment Dialog ─────────────────────────────────── */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => {
        setIsPaymentDialogOpen(open)
        if (!open) { setSelectedRepayment(null); setError(''); setSuccess('') }
      }}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              {selectedRepayment?.customer_name} — Instalment #{selectedRepayment?.instalment_number}
            </DialogDescription>
          </DialogHeader>

          {selectedRepayment && (
            <form onSubmit={handleRecordPayment}>
              {error && <div className="mb-3 p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}
              {success && <div className="mb-3 p-3 bg-green-50 text-green-700 rounded-md text-sm">{success}</div>}

              {/* Payment Summary */}
              <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Instalment Due</span>
                  <span className="font-medium">{formatKES(selectedRepayment.due_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Already Paid</span>
                  <span className="font-medium text-green-600">{formatKES(selectedRepayment.paid_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Remaining</span>
                  <span className="font-medium">{formatKES(selectedRepayment.due_amount - selectedRepayment.paid_amount)}</span>
                </div>
                {calculatePenalty(selectedRepayment) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Penalty ({daysDiff(selectedRepayment.due_date)} days @ {PENALTY_RATES[selectedRepayment.loan_type || 'one_week']}%/day)</span>
                    <span className="font-medium">{formatKES(calculatePenalty(selectedRepayment))}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total to Clear</span>
                  <span className="text-blue-700">
                    {formatKES(
                      (selectedRepayment.due_amount - selectedRepayment.paid_amount) +
                      calculatePenalty(selectedRepayment)
                    )}
                  </span>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Amount Received (KES)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={paymentForm.amount_paid}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount_paid: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select
                      value={paymentForm.payment_method}
                      onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mpesa">M-Pesa</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Date</Label>
                    <Input
                      type="date"
                      value={paymentForm.paid_date}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paid_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {paymentForm.payment_method === 'mpesa' && (
                  <div className="space-y-2">
                    <Label>M-Pesa Receipt No.</Label>
                    <Input
                      placeholder="e.g. QHX4K2ABCD"
                      value={paymentForm.mpesa_receipt}
                      onChange={(e) => setPaymentForm({ ...paymentForm, mpesa_receipt: e.target.value.toUpperCase() })}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    rows={2}
                    placeholder="Any additional notes..."
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPaymentDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || paymentForm.amount_paid <= 0}>
                  {saving ? 'Recording...' : 'Confirm Payment'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}