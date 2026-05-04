'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Users, Package, Wallet } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'

interface Customer {
  id: string
  full_name: string
  email: string
  phone?: string
  status: string
  created_at: string
}

interface Account {
  id: string
  account_name: string
  account_type: string
  balance: number
  status: string
  created_at: string
}

export default function ReportsPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const supabase = createClient()
    const [customersRes, productsRes, accountsRes] = await Promise.all([
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('accounts').select('*').order('created_at', { ascending: false }),
    ])
    if (customersRes.data) setCustomers(customersRes.data)
    if (accountsRes.data) setAccounts(accountsRes.data)
    setLoading(false)
  }

  // ✅ Helper: auto page break
  function checkPageBreak(doc: jsPDF, y: number, needed = 30): number {
    if (y + needed > 280) {
      doc.addPage()
      return 20
    }
    return y
  }

  function exportCustomersPDF() {
    setExporting('customers-pdf')
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('Customers Report', 14, 22)
    doc.setFontSize(9)
    doc.text(`Generated: ${new Date().toLocaleDateString()}  |  Total: ${customers.length}`, 14, 30)
    let y = 42
    customers.forEach((c, i) => {
      y = checkPageBreak(doc, y, 32)
      doc.setFontSize(10)
      doc.text(`${i + 1}. ${c.full_name}`, 14, y)
      doc.setFontSize(9)
      doc.text(`Email: ${c.email}`, 18, y + 5)
      doc.text(`Phone: ${c.phone || 'N/A'}   Status: ${c.status}   Created: ${formatDate(c.created_at)}`, 18, y + 10)
      y += 18
    })
    doc.save('customers-report.pdf')
    setExporting(null)
  }

  function exportCustomersExcel() {
    setExporting('customers-xlsx')
    const ws = XLSX.utils.json_to_sheet(
      customers.map((c) => ({
        Name: c.full_name,
        Email: c.email,
        Phone: c.phone || '',
        Status: c.status,
        'Created At': formatDate(c.created_at),
      }))
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Customers')
    XLSX.writeFile(wb, 'customers-report.xlsx')
    setExporting(null)
  }


  function exportAccountsPDF() {
    setExporting('accounts-pdf')
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('Accounts Report', 14, 22)
    doc.setFontSize(9)
    doc.text(`Generated: ${new Date().toLocaleDateString()}  |  Total: ${accounts.length}`, 14, 30)
    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)
    doc.text(`Total Balance: ${formatCurrency(totalBalance)}`, 14, 36)
    let y = 48
    accounts.forEach((a, i) => {
      y = checkPageBreak(doc, y, 28)
      doc.setFontSize(10)
      doc.text(`${i + 1}. ${a.account_name}`, 14, y)
      doc.setFontSize(9)
      doc.text(`Type: ${a.account_type}   Balance: ${formatCurrency(a.balance)}   Status: ${a.status}`, 18, y + 5)
      doc.text(`Created: ${formatDate(a.created_at)}`, 18, y + 10)
      y += 18
    })
    doc.save('accounts-report.pdf')
    setExporting(null)
  }

  function exportAccountsExcel() {
    setExporting('accounts-xlsx')
    const ws = XLSX.utils.json_to_sheet(
      accounts.map((a) => ({
        Name: a.account_name,
        Type: a.account_type,
        Balance: a.balance,
        Status: a.status,
        'Created At': formatDate(a.created_at),
      }))
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Accounts')
    XLSX.writeFile(wb, 'accounts-report.xlsx')
    setExporting(null)
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-slate-200 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-slate-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-600">Generate and download business reports</p>
      </div>

      {/* Summary Bar */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-500" />
          <div>
            <p className="text-xs text-blue-600 font-medium">Total Customers</p>
            <p className="text-2xl font-bold text-blue-700">{customers.length}</p>
          </div>
        </div>
        {/* <div className="bg-green-50 rounded-lg p-4 flex items-center gap-3">
          <Package className="h-8 w-8 text-green-500" />
          <div>
            <p className="text-xs text-green-600 font-medium">Total Products</p>
            <p className="text-2xl font-bold text-green-700">{products.length}</p>
          </div>
        </div> */}
        <div className="bg-purple-50 rounded-lg p-4 flex items-center gap-3">
          <Wallet className="h-8 w-8 text-purple-500" />
          <div>
            <p className="text-xs text-purple-600 font-medium">Total Balance</p>
            <p className="text-2xl font-bold text-purple-700">{formatCurrency(totalBalance)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Customers Report */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <CardTitle>Customers</CardTitle>
            </div>
            <CardDescription>{customers.length} total customers</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-2">
            <Button
              onClick={exportCustomersPDF}
              className="w-full"
              disabled={!!exporting || customers.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting === 'customers-pdf' ? 'Generating...' : 'Download PDF'}
            </Button>
            <Button
              variant="outline"
              onClick={exportCustomersExcel}
              className="w-full"
              disabled={!!exporting || customers.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting === 'customers-xlsx' ? 'Generating...' : 'Download Excel'}
            </Button>
            {customers.length === 0 && (
              <p className="text-xs text-slate-400 text-center">No data to export</p>
            )}
          </CardContent>
        </Card>

        {/* Products Report */}
        {/* <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-green-600" />
              <CardTitle>Products</CardTitle>
            </div>
            <CardDescription>{products.length} total products</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-2">
            <Button
              onClick={exportProductsPDF}
              className="w-full"
              disabled={!!exporting || products.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting === 'products-pdf' ? 'Generating...' : 'Download PDF'}
            </Button>
            <Button
              variant="outline"
              onClick={exportProductsExcel}
              className="w-full"
              disabled={!!exporting || products.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting === 'products-xlsx' ? 'Generating...' : 'Download Excel'}
            </Button>
            {products.length === 0 && (
              <p className="text-xs text-slate-400 text-center">No data to export</p>
            )}
          </CardContent>
        </Card> */}

        {/* Accounts Report */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Wallet className="h-5 w-5 text-purple-600" />
              <CardTitle>Accounts</CardTitle>
            </div>
            <CardDescription>{accounts.length} total accounts</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-2">
            <Button
              onClick={exportAccountsPDF}
              className="w-full"
              disabled={!!exporting || accounts.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting === 'accounts-pdf' ? 'Generating...' : 'Download PDF'}
            </Button>
            <Button
              variant="outline"
              onClick={exportAccountsExcel}
              className="w-full"
              disabled={!!exporting || accounts.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting === 'accounts-xlsx' ? 'Generating...' : 'Download Excel'}
            </Button>
            {accounts.length === 0 && (
              <p className="text-xs text-slate-400 text-center">No data to export</p>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}