'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Search, Pencil, Trash2, RefreshCcw, Download } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import jsPDF from 'jspdf'

interface Loan {
  id: string
  customer_id: string
  customer_name?: string
  loan_type: string
  principal_amount: number
  interest_rate: number
  registration_fee: number
  status: string
  application_date: string
  disbursement_date?: string
  due_date?: string
  notes?: string
}

interface Customer {
  id: string
  full_name: string
  phone?: string
}

interface LoanProduct {
  id: string
  name: string
  duration_weeks: number
  interest_rate: number
  instalment_count: number
  penalty_rate_daily: number
  min_amount: number
  max_amount: number
}

function formatKES(amount: number) {
  return `KES ${amount.toLocaleString('en-KE')}`
}

const LOAN_TYPE_MAP: Record<string, string> = {
  one_week: 'One Week Loan',
  two_week: 'Two Week Loan',
  four_week: 'Four Week Loan',
}

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loanProducts, setLoanProducts] = useState<LoanProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [saving, setSaving] = useState(false)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const itemsPerPage = 10

  const [formData, setFormData] = useState({
    customer_id: '',
    loan_type: 'one_week',
    principal_amount: 1000,
    interest_rate: 10,
    registration_fee: 300,
    status: 'pending',
    notes: '',
  })

  useEffect(() => {
    fetchData()
  }, [searchTerm, statusFilter])

  async function fetchData() {
    setLoading(true)
    const supabase = createClient()

    try {
      let loansQuery = supabase
        .from('loans')
        .select(`*, customers(full_name)`)
        .order('application_date', { ascending: false })

      if (statusFilter !== 'all') {
        loansQuery = loansQuery.eq('status', statusFilter)
      }

      const [{ data: loansData }, { data: customersData }, { data: productsData }] = await Promise.all([
        loansQuery,
        supabase.from('customers').select('id, full_name, phone').order('full_name'),
        supabase.from('loan_products').select('*').eq('is_active', true),
      ])

      let mapped = (loansData || []).map((loan: any) => ({
        id: loan.id,
        customer_id: loan.customer_id,
        customer_name: loan.customers?.full_name || 'Unknown',
        loan_type: loan.loan_type,
        principal_amount: loan.principal_amount,
        interest_rate: loan.interest_rate,
        registration_fee: loan.registration_fee,
        status: loan.status,
        application_date: loan.application_date,
        disbursement_date: loan.disbursement_date,
        due_date: loan.due_date,
        notes: loan.notes,
      }))

      // Client-side search filter
      if (searchTerm) {
        mapped = mapped.filter((l) =>
          l.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.notes?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      setLoans(mapped)
      setCustomers(customersData || [])
      setLoanProducts(productsData || [])
    } catch (e) {
      console.error('Fetch error:', e)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const loanData = {
        customer_id: formData.customer_id,
        loan_type: formData.loan_type,
        principal_amount: formData.principal_amount,
        interest_rate: formData.interest_rate,
        registration_fee: formData.registration_fee,
        status: formData.status,
        notes: formData.notes,
        created_by: user?.id,
      }

      if (editingLoan) {
        const { error: updateError } = await supabase
          .from('loans')
          .update(loanData)
          .eq('id', editingLoan.id)
        if (updateError) throw updateError
        setSuccess('Loan updated successfully!')
      } else {
        const { error: insertError } = await supabase
          .from('loans')
          .insert([loanData])
        if (insertError) throw insertError
        setSuccess('Loan created successfully!')
      }

      setTimeout(() => {
        setIsDialogOpen(false)
        resetForm()
        fetchData()
      }, 1000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure? This will also delete all related repayments and penalties.')) return
    const supabase = createClient()
    const { error } = await supabase.from('loans').delete().eq('id', id)
    if (!error) fetchData()
  }

  // ✅ FIXED: generateRepayments wired up and using correct column names
  async function generateRepayments(loanId: string) {
    setGeneratingId(loanId)
    const supabase = createClient()

    try {
      // Get loan details
      const { data: loan, error: loanError } = await supabase
        .from('loans')
        .select('*')
        .eq('id', loanId)
        .single()

      if (loanError || !loan) throw new Error('Loan not found')

      // Check if repayments already exist
      const { data: existing } = await supabase
        .from('loan_repayments')
        .select('id')
        .eq('loan_id', loanId)

      if (existing && existing.length > 0) {
        if (!confirm('Repayments already exist for this loan. Regenerate? This will delete the old ones.')) {
          setGeneratingId(null)
          return
        }
        // Delete existing repayments
        await supabase.from('loan_repayments').delete().eq('loan_id', loanId)
      }

      // ✅ FIXED: match by name not duration_weeks
      const productName = LOAN_TYPE_MAP[loan.loan_type]
      const { data: product, error: productError } = await supabase
        .from('loan_products')
        .select('*')
        .eq('name', productName)
        .single()

      if (productError || !product) throw new Error(`Loan product "${productName}" not found`)

      const totalAmount = loan.principal_amount + (loan.principal_amount * loan.interest_rate / 100)
      const instalmentAmount = Math.round((totalAmount / product.instalment_count) * 100) / 100
      const principalPortion = Math.round((loan.principal_amount / product.instalment_count) * 100) / 100
      const interestPortion = Math.round((instalmentAmount - principalPortion) * 100) / 100

      const startDate = loan.disbursement_date
        ? new Date(loan.disbursement_date)
        : new Date()

      // Instalment due day offsets per loan type
      const dayOffsets: Record<string, number[]> = {
        one_week:  [3, 5, 7],           // Days 4, 6, 8 (0-indexed)
        two_week:  [4, 7, 11, 14],      // Days 5, 8, 12, 15
        four_week: [7, 14, 21, 28],     // Days 8, 15, 22, 29
      }

      const offsets = dayOffsets[loan.loan_type] || dayOffsets['one_week']

      // ✅ FIXED: using correct column name 'paid_amount' from schema
      const repaymentsData = offsets.map((offset, i) => {
        const dueDate = new Date(startDate.getTime() + offset * 24 * 60 * 60 * 1000)
        return {
          loan_id: loanId,
          instalment_number: i + 1,
          due_date: dueDate.toISOString(),
          due_amount: instalmentAmount,
          principal_portion: principalPortion,
          interest_portion: interestPortion,
          paid_amount: 0,           // ✅ correct column name
          status: 'pending',
        }
      })

      const { error: insertError } = await supabase
        .from('loan_repayments')
        .insert(repaymentsData)

      if (insertError) throw insertError

      // Update loan due_date to last instalment date
      const lastDue = new Date(
        startDate.getTime() + offsets[offsets.length - 1] * 24 * 60 * 60 * 1000
      )
      await supabase
        .from('loans')
        .update({ due_date: lastDue.toISOString() })
        .eq('id', loanId)

      setSuccess(`${product.instalment_count} repayment instalments generated!`)
      setTimeout(() => setSuccess(''), 3000)
      fetchData()
    } catch (e: any) {
      setError(e.message || 'Failed to generate repayments')
      setTimeout(() => setError(''), 4000)
    } finally {
      setGeneratingId(null)
    }
  }

  // Auto-fill interest rate when loan type changes
  function handleLoanTypeChange(value: string) {
    const productName = LOAN_TYPE_MAP[value]
    const product = loanProducts.find((p) => p.name === productName)
    setFormData({
      ...formData,
      loan_type: value,
      interest_rate: product?.interest_rate || 10,
      registration_fee: product ? 300 : 300,
    })
  }

  function openEditDialog(loan: Loan) {
    setEditingLoan(loan)
    setFormData({
      customer_id: loan.customer_id,
      loan_type: loan.loan_type,
      principal_amount: loan.principal_amount,
      interest_rate: loan.interest_rate,
      registration_fee: loan.registration_fee,
      status: loan.status,
      notes: loan.notes || '',
    })
    setError('')
    setSuccess('')
    setIsDialogOpen(true)
  }

  function resetForm() {
    setEditingLoan(null)
    setFormData({
      customer_id: '',
      loan_type: 'one_week',
      principal_amount: 1000,
      interest_rate: 10,
      registration_fee: 300,
      status: 'pending',
      notes: '',
    })
    setError('')
    setSuccess('')
  }

  function exportToPDF() {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('Loans Report', 14, 22)
    doc.setFontSize(9)
    doc.text(`Generated: ${new Date().toLocaleDateString()}  |  Total: ${loans.length}`, 14, 30)
    let y = 42
    loans.forEach((loan, index) => {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.setFontSize(10)
      doc.text(`${index + 1}. ${loan.customer_name}`, 14, y)
      doc.setFontSize(9)
      doc.text(`Type: ${LOAN_TYPE_MAP[loan.loan_type]}   Amount: ${formatKES(loan.principal_amount)}   Rate: ${loan.interest_rate}%   Status: ${loan.status}`, 18, y + 5)
      doc.text(`Applied: ${formatDate(loan.application_date)}`, 18, y + 10)
      y += 18
    })
    doc.save('loans-report.pdf')
  }

  const paginatedLoans = loans.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )
  const totalPages = Math.ceil(loans.length / itemsPerPage)

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-slate-200 rounded" />
          <div className="h-96 bg-slate-200 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">

      {/* Global success/error banners */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">{success}</div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>
      )}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Loans</h1>
          <p className="text-slate-600">Manage loan applications and disbursements</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              New Loan Application
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLoan ? 'Edit Loan' : 'New Loan Application'}</DialogTitle>
              <DialogDescription>Fill in loan details below.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              {error && <div className="mb-3 p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}
              {success && <div className="mb-3 p-3 bg-green-50 text-green-700 rounded-md text-sm">{success}</div>}

              <div className="grid gap-4 py-4">

                {/* Customer */}
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name} {c.phone ? `(${c.phone})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Loan Type */}
                <div className="space-y-2">
                  <Label>Loan Type</Label>
                  <Select value={formData.loan_type} onValueChange={handleLoanTypeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_week">One Week Loan (10%)</SelectItem>
                      <SelectItem value="two_week">Two Week Loan (18%)</SelectItem>
                      <SelectItem value="four_week">Four Week Loan (24%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount & Interest */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Principal Amount (KES)</Label>
                    <Input
                      type="number"
                      value={formData.principal_amount}
                      onChange={(e) => setFormData({ ...formData, principal_amount: parseFloat(e.target.value) || 0 })}
                      min="1000"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Interest Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.interest_rate}
                      onChange={(e) => setFormData({ ...formData, interest_rate: parseFloat(e.target.value) || 0 })}
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                {/* Loan Summary */}
                <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Principal</span>
                    <span className="font-medium">{formatKES(formData.principal_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Interest ({formData.interest_rate}%)</span>
                    <span className="font-medium">{formatKES(formData.principal_amount * formData.interest_rate / 100)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Registration Fee</span>
                    <span className="font-medium">{formatKES(formData.registration_fee)}</span>
                  </div>
                  <div className="border-t pt-1 flex justify-between font-semibold">
                    <span>Total Repayable</span>
                    <span className="text-blue-700">
                      {formatKES(formData.principal_amount + (formData.principal_amount * formData.interest_rate / 100))}
                    </span>
                  </div>
                </div>

                {/* Status & Registration Fee */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="disbursed">Disbursed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="defaulted">Defaulted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Registration Fee (KES)</Label>
                    <Input
                      type="number"
                      value={formData.registration_fee}
                      onChange={(e) => setFormData({ ...formData, registration_fee: parseFloat(e.target.value) || 0 })}
                      min="0"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    placeholder="Business details, guarantor info, collateral, etc."
                  />
                </div>

              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm() }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || !formData.customer_id || !formData.principal_amount}>
                  {saving ? 'Saving...' : editingLoan ? 'Update Loan' : 'Create Loan'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by client name..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="disbursed">Disbursed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="defaulted">Defaulted</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportToPDF}>
          <Download className="mr-2 h-4 w-4" />
          PDF
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent>
          {paginatedLoans.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Loan Type</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Total Repayable</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLoans.map((loan) => {
                  const totalRepayable = loan.principal_amount + (loan.principal_amount * loan.interest_rate / 100)
                  return (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">{loan.customer_name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {LOAN_TYPE_MAP[loan.loan_type]}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono">{formatKES(loan.principal_amount)}</TableCell>
                      <TableCell className="font-mono font-semibold text-blue-700">
                        {formatKES(totalRepayable)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          loan.status === 'disbursed'  ? 'bg-green-100 text-green-800' :
                          loan.status === 'approved'   ? 'bg-blue-100 text-blue-800' :
                          loan.status === 'pending'    ? 'bg-yellow-100 text-yellow-800' :
                          loan.status === 'completed'  ? 'bg-gray-100 text-gray-700' :
                          loan.status === 'defaulted'  ? 'bg-red-100 text-red-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(loan.application_date)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {/* ✅ FIXED: Generate Repayments button now wired up */}
                          {loan.status === 'disbursed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              disabled={generatingId === loan.id}
                              onClick={() => generateRepayments(loan.id)}
                            >
                              <RefreshCcw className={`h-3 w-3 mr-1 ${generatingId === loan.id ? 'animate-spin' : ''}`} />
                              {generatingId === loan.id ? 'Generating...' : 'Repayments'}
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(loan)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(loan.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No loans found.{' '}
              <button
                onClick={() => setIsDialogOpen(true)}
                className="text-blue-600 hover:underline"
              >
                Create the first loan application
              </button>
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
    </div>
  )
}