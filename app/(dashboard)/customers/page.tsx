'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { uploadFile } from '@/lib/upload'
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
import { Plus, Search, Pencil, Trash2, Download, Image, FileText, ExternalLink } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'

interface Customer {
  id: string
  full_name: string
  email: string
  phone?: string
  address?: string
  notes?: string
  profile_image_url?: string
  pdf_document_url?: string
  status: string
  created_at: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const itemsPerPage = 10

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    status: 'active',
    profile_image_url: '',
    pdf_document_url: '',
  })

  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [pdfDocument, setPdfDocument] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchCustomers()
  }, [searchTerm, statusFilter])

  async function fetchCustomers() {
    setLoading(true)
    setError('')
    const supabase = createClient()

    try {
      let query = supabase.from('customers').select('*').order('created_at', { ascending: false })
      if (searchTerm) query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      if (statusFilter !== 'all') query = query.eq('status', statusFilter)

      const { data, error } = await query
      if (error) { setError(error.message) } else { setCustomers(data || []) }
    } catch (e) {
      console.error('Fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      let dataToSave = { ...formData }

      // Upload profile image if selected
      if (profileImage) {
        setUploading(true)
        const result = await uploadFile(profileImage, 'profiles')
        if (result.error) {
          setError(result.error)
          setSaving(false)
          setUploading(false)
          return
        }
        dataToSave.profile_image_url = result.url || ''
      }

      // Upload PDF document if selected
      if (pdfDocument) {
        setUploading(true)
        const result = await uploadFile(pdfDocument, 'documents')
        if (result.error) {
          setError(result.error)
          setSaving(false)
          setUploading(false)
          return
        }
        dataToSave.pdf_document_url = result.url || ''
      }

      setUploading(false)

      if (editingCustomer) {
        const { error: saveError } = await supabase
          .from('customers')
          .update(dataToSave)
          .eq('id', editingCustomer.id)
        if (saveError) { setError(saveError.message); setSaving(false); return }
      } else {
        const { error: saveError } = await supabase
          .from('customers')
          .insert([{ ...dataToSave, created_by: user?.id }])
        if (saveError) { setError(saveError.message); setSaving(false); return }
      }

      setIsDialogOpen(false)
      resetForm()
      fetchCustomers()
    } catch (e) {
      console.error('Save error:', e)
      setError('Failed to save customer')
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this customer?')) {
      const supabase = createClient()
      const { error } = await supabase.from('customers').delete().eq('id', id)
      if (error) { alert('Error deleting: ' + error.message) } else { fetchCustomers() }
    }
  }

  // ✅ FIXED: now correctly passes profile_image_url and pdf_document_url
  function openEditDialog(customer: Customer) {
    setEditingCustomer(customer)
    setFormData({
      full_name: customer.full_name,
      email: customer.email,
      phone: customer.phone || '',
      address: customer.address || '',
      notes: customer.notes || '',
      status: customer.status,
      profile_image_url: customer.profile_image_url || '',
      pdf_document_url: customer.pdf_document_url || '',
    })
    setProfileImage(null)
    setPdfDocument(null)
    setIsDialogOpen(true)
  }

  function resetForm() {
    setEditingCustomer(null)
    setFormData({
      full_name: '', email: '', phone: '', address: '',
      notes: '', status: 'active', profile_image_url: '', pdf_document_url: '',
    })
    setProfileImage(null)
    setPdfDocument(null)
    setError('')
  }

  function exportToPDF() {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('Customers Report', 14, 22)
    doc.setFontSize(10)
    let y = 40
    customers.forEach((customer, index) => {
      doc.text(`${index + 1}. ${customer.full_name}`, 14, y)
      doc.text(`Email: ${customer.email}`, 14, y + 5)
      doc.text(`Phone: ${customer.phone || 'N/A'}`, 14, y + 10)
      doc.text(`Status: ${customer.status}`, 14, y + 15)
      doc.text(`Created: ${formatDate(customer.created_at)}`, 14, y + 20)
      y += 30
      if (y > 270) { doc.addPage(); y = 20 }
    })
    doc.save('customers.pdf')
  }

  function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(
      customers.map((c) => ({
        Name: c.full_name,
        Email: c.email,
        Phone: c.phone || '',
        Address: c.address || '',
        Status: c.status,
        'Created At': formatDate(c.created_at),
      }))
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Customers')
    XLSX.writeFile(wb, 'customers.xlsx')
  }

  const filteredCustomers = customers.filter((customer) => {
    if (statusFilter !== 'all' && customer.status !== statusFilter) return false
    return true
  })

  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)

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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-600">Manage your customer database</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
              <DialogDescription>Fill in the customer details below.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>
              )}
              <div className="grid gap-4 py-4">

                {/* Name & Email */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Phone & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>

                {/* File Uploads */}
                <div className="grid grid-cols-2 gap-4">

                  {/* Profile Image */}
                  <div className="space-y-2">
                    <Label>Profile Image</Label>
                    <div className="border-2 border-dashed border-slate-200 rounded-md p-3 text-center hover:border-slate-400 transition-colors">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setProfileImage(e.target.files?.[0] || null)}
                        className="hidden"
                        id="profile-image-upload"
                      />
                      <label htmlFor="profile-image-upload" className="cursor-pointer flex flex-col items-center">
                        <Image className="h-7 w-7 text-slate-400 mb-1" />
                        <span className="text-xs text-slate-600 font-medium">
                          {profileImage ? profileImage.name : 'Click to upload'}
                        </span>
                        <span className="text-xs text-slate-400">JPG, PNG (max 5MB)</span>
                      </label>
                      {editingCustomer?.profile_image_url && !profileImage && (
                        <div className="mt-2">
                          <img
                            src={editingCustomer.profile_image_url}
                            alt="Current"
                            className="h-12 w-12 rounded-full object-cover mx-auto"
                          />
                          <p className="text-xs text-green-600 mt-1">✓ Current photo</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PDF Document */}
                  <div className="space-y-2">
                    <Label>PDF Document</Label>
                    <div className="border-2 border-dashed border-slate-200 rounded-md p-3 text-center hover:border-slate-400 transition-colors">
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setPdfDocument(e.target.files?.[0] || null)}
                        className="hidden"
                        id="pdf-upload"
                      />
                      <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center">
                        <FileText className="h-7 w-7 text-slate-400 mb-1" />
                        <span className="text-xs text-slate-600 font-medium">
                          {pdfDocument ? pdfDocument.name : 'Click to upload'}
                        </span>
                        <span className="text-xs text-slate-400">PDF (max 5MB)</span>
                      </label>
                      {editingCustomer?.pdf_document_url && !pdfDocument && (
                        <p className="text-xs text-green-600 mt-2">✓ Document on file</p>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm() }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || uploading}>
                  {uploading ? 'Uploading...' : saving ? 'Saving...' : editingCustomer ? 'Save Changes' : 'Add Customer'}
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
            placeholder="Search customers..."
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
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportToPDF}>
          <Download className="mr-2 h-4 w-4" />
          PDF
        </Button>
        <Button variant="outline" onClick={exportToExcel}>
          <Download className="mr-2 h-4 w-4" />
          Excel
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent>
          {paginatedCustomers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Photo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Docs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers.map((customer) => (
                  <TableRow key={customer.id}>

                    {/* Profile Photo */}
                    <TableCell>
                      {customer.profile_image_url ? (
                        <img
                          src={customer.profile_image_url}
                          alt={customer.full_name}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center">
                          <Image className="h-4 w-4 text-slate-400" />
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="font-medium">{customer.full_name}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.phone || 'N/A'}</TableCell>

                    {/* PDF Link */}
                    <TableCell>
                      {customer.pdf_document_url ? (
                        <a
                          href={customer.pdf_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-800 text-xs"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          View
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">None</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        customer.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {customer.status}
                      </span>
                    </TableCell>

                    <TableCell>{formatDate(customer.created_at)}</TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(customer)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(customer.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-slate-500">No customers found</div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-600">Page {currentPage} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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