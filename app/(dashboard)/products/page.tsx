'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { uploadFile } from '@/lib/upload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Search, Pencil, Trash2, Download, Image } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'

interface Product {
  id: string
  product_name: string
  category: string
  price: number
  description?: string
  product_image_url?: string
  status: string
  created_at: string
}

const categories = ['Software', 'Service', 'Product', 'Hardware', 'Consulting']

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const itemsPerPage = 10

  const [formData, setFormData] = useState({
    product_name: '',
    category: '',
    price: 0,
    description: '',
    status: 'active',
    product_image_url: '',
  })

  const [productImage, setProductImage] = useState<File | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [searchTerm, categoryFilter, statusFilter])

  async function fetchProducts() {
    setLoading(true)
    setError('')
    const supabase = createClient()

    try {
      let query = supabase.from('products').select('*').order('created_at', { ascending: false })

      if (searchTerm) query = query.ilike('product_name', `%${searchTerm}%`)
      if (categoryFilter !== 'all') query = query.eq('category', categoryFilter)
      if (statusFilter !== 'all') query = query.eq('status', statusFilter)

      const { data, error } = await query
      if (error) { setError(error.message) } else { setProducts(data || []) }
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

      if (productImage) {
        const result = await uploadFile(productImage, 'products')
        if (result.error) {
          setError(result.error)
          setSaving(false)
          return
        }
        dataToSave.product_image_url = result.url || ''
      }

      if (editingProduct) {
        const { error } = await supabase.from('products').update(dataToSave).eq('id', editingProduct.id)
        if (error) { setError(error.message); setSaving(false); return }
      } else {
        const { error } = await supabase.from('products').insert([{ ...dataToSave, created_by: user?.id }])
        if (error) { setError(error.message); setSaving(false); return }
      }

      setIsDialogOpen(false)
      resetForm()
      fetchProducts()
    } catch (e) {
      console.error('Save error:', e)
      setError('Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this product?')) {
      const supabase = createClient()
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) { alert('Error deleting: ' + error.message) } else { fetchProducts() }
    }
  }

  function openEditDialog(product: Product) {
    setEditingProduct(product)
    setFormData({
      product_name: product.product_name,
      category: product.category,
      price: product.price,
      description: product.description || '',
      status: product.status,
      product_image_url: product.product_image_url || '',
    })
    setProductImage(null)
    setIsDialogOpen(true)
  }

  function resetForm() {
    setEditingProduct(null)
    setFormData({ product_name: '', category: '', price: 0, description: '', status: 'active', product_image_url: '' })
    setProductImage(null)
    setError('')
  }

  function exportToPDF() {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('Products Report', 14, 22)
    doc.setFontSize(10)
    let y = 40
    products.forEach((product, index) => {
      doc.text(`${index + 1}. ${product.product_name}`, 14, y)
      doc.text(`Category: ${product.category}`, 14, y + 5)
      doc.text(`Price: ${formatCurrency(product.price)}`, 14, y + 10)
      doc.text(`Status: ${product.status}`, 14, y + 15)
      y += 25
    })
    doc.save('products.pdf')
  }

  function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(
      products.map((p) => ({
        Name: p.product_name,
        Category: p.category,
        Price: p.price,
        Description: p.description || '',
        Status: p.status,
        'Created At': formatDate(p.created_at),
      }))
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Products')
    XLSX.writeFile(wb, 'products.xlsx')
  }

  const filteredProducts = products.filter((product) => {
    if (categoryFilter !== 'all' && product.category !== categoryFilter) return false
    if (statusFilter !== 'all' && product.status !== statusFilter) return false
    return true
  })

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)

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
          <h1 className="text-3xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-600">Manage your product inventory</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
              <DialogDescription>Fill in the product details below.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>
              )}
              <div className="grid gap-4 py-4">

                {/* Product Name */}
                <div className="space-y-2">
                  <Label htmlFor="product_name">Product Name</Label>
                  <Input
                    id="product_name"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    required
                  />
                </div>

                {/* Category & Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Product Image Upload */}
                <div className="space-y-2">
                  <Label>Product Image</Label>
                  <div className="border-2 border-dashed border-slate-200 rounded-md p-4 text-center hover:border-slate-400 transition-colors">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setProductImage(e.target.files?.[0] || null)}
                      className="hidden"
                      id="product-image-upload"
                    />
                    <label htmlFor="product-image-upload" className="cursor-pointer flex flex-col items-center">
                      <Image className="h-8 w-8 text-slate-400 mb-2" />
                      <span className="text-sm text-slate-600 font-medium">
                        {productImage ? productImage.name : 'Click to upload image'}
                      </span>
                      <span className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP (max 5MB)</span>
                    </label>
                    {editingProduct?.product_image_url && !productImage && (
                      <div className="mt-2">
                        <p className="text-xs text-green-600">✓ Current image on file</p>
                        <img
                          src={editingProduct.product_image_url}
                          alt="Current product"
                          className="mt-2 h-16 w-16 object-cover rounded mx-auto"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Status */}
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
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm() }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editingProduct ? 'Save Changes' : 'Add Product'}
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
            placeholder="Search products..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          {paginatedProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.product_image_url ? (
                        <img
                          src={product.product_image_url}
                          alt={product.product_name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center">
                          <Image className="h-4 w-4 text-slate-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{product.product_name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{formatCurrency(product.price)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.status}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(product.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(product)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-slate-500">No products found</div>
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