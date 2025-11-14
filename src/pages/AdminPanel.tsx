import { useState, useEffect } from 'react'
import { isAdminSubdomain, getSubdomain } from '../lib/subdomain-utils'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { useToast } from '../hooks/use-toast'
import { Toaster } from '../components/ui/toaster'
import { 
  getAllRestaurants, 
  createRestaurant, 
  updateRestaurant, 
  deleteRestaurant,
  type Restaurant 
} from '../lib/admin-data'
import { validateSubdomain, normalizeSubdomain } from '../lib/subdomain-utils'
import { Plus, Edit, Trash2, Building2, Loader2, Save, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'

export default function AdminPanel() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [restaurantToDelete, setRestaurantToDelete] = useState<Restaurant | null>(null)
  const { toast } = useToast()

  // Check if we're on admin subdomain or no subdomain
  useEffect(() => {
    const subdomain = getSubdomain()
    if (subdomain && !isAdminSubdomain()) {
      // Redirect to restaurant dashboard if on a restaurant subdomain
      window.location.href = `http://${subdomain}.${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}/dashboard/waitlist`
    }
  }, [])

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    novaref_id: '',
  })

  useEffect(() => {
    loadRestaurants()
  }, [])

  const loadRestaurants = async () => {
    try {
      setLoading(true)
      const data = await getAllRestaurants()
      setRestaurants(data)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load restaurants',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (restaurant?: Restaurant) => {
    if (restaurant) {
      setEditingRestaurant(restaurant)
      setFormData({
        name: restaurant.name || '',
        subdomain: restaurant.subdomain || '',
        description: restaurant.description || '',
        address: restaurant.address || '',
        phone: restaurant.phone || '',
        email: restaurant.email || '',
        novaref_id: restaurant.novaref_id || '',
      })
    } else {
      setEditingRestaurant(null)
      setFormData({
        name: '',
        subdomain: '',
        description: '',
        address: '',
        phone: '',
        email: '',
        novaref_id: '',
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingRestaurant(null)
    setFormData({
      name: '',
      subdomain: '',
      description: '',
      address: '',
      phone: '',
      email: '',
      novaref_id: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate subdomain
    const normalizedSubdomain = normalizeSubdomain(formData.subdomain)
    const validation = validateSubdomain(normalizedSubdomain)
    if (!validation.valid) {
      toast({
        title: 'Invalid Subdomain',
        description: validation.error,
        variant: 'destructive',
      })
      return
    }

    try {
      if (editingRestaurant) {
        await updateRestaurant(editingRestaurant.id, {
          name: formData.name,
          subdomain: normalizedSubdomain,
          description: formData.description || undefined,
          address: formData.address || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          novaref_id: formData.novaref_id || undefined,
        })
        toast({
          title: 'Success',
          description: 'Restaurant updated successfully',
        })
      } else {
        await createRestaurant({
          name: formData.name,
          subdomain: normalizedSubdomain,
          description: formData.description || undefined,
          address: formData.address || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          novaref_id: formData.novaref_id || undefined,
        })
        toast({
          title: 'Success',
          description: 'Restaurant created successfully',
        })
      }
      handleCloseDialog()
      await loadRestaurants()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save restaurant',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteClick = (restaurant: Restaurant) => {
    setRestaurantToDelete(restaurant)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!restaurantToDelete) return

    try {
      await deleteRestaurant(restaurantToDelete.id)
      toast({
        title: 'Success',
        description: 'Restaurant deleted successfully',
      })
      setDeleteDialogOpen(false)
      setRestaurantToDelete(null)
      await loadRestaurants()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete restaurant',
        variant: 'destructive',
      })
    }
  }

  const getRestaurantUrl = (subdomain: string) => {
    if (typeof window === 'undefined') return ''
    const hostname = window.location.hostname
    const port = window.location.port ? `:${window.location.port}` : ''
    
    // For localhost development
    if (hostname.includes('localhost') || hostname === '127.0.0.1') {
      return `http://${subdomain}.localhost${port}`
    }
    
    // For production
    const baseDomain = hostname.split('.').slice(-2).join('.')
    return `https://${subdomain}.${baseDomain}`
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#050816] text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <Toaster />
      <div className="min-h-screen w-full bg-[#050816] text-white">
        <div className="container mx-auto px-8 py-12">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">Admin Panel</h1>
              <p className="text-muted-foreground">Manage restaurants and settings</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} className="bg-primary hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Restaurant
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0C1020] border-white/10 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl gradient-text">
                    {editingRestaurant ? 'Edit Restaurant' : 'Create New Restaurant'}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    {editingRestaurant 
                      ? 'Update restaurant information' 
                      : 'Add a new restaurant to the system'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Restaurant Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="bg-background/50 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subdomain">Subdomain *</Label>
                    <Input
                      id="subdomain"
                      value={formData.subdomain}
                      onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                      required
                      placeholder="joes-pizza"
                      className="bg-background/50 border-white/10"
                    />
                    <p className="text-xs text-muted-foreground">
                      Lowercase letters, numbers, and hyphens only. Will be used as {formData.subdomain ? `${formData.subdomain}.novaqueue.com` : 'subdomain.novaqueue.com'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="bg-background/50 border-white/10"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="bg-background/50 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="bg-background/50 border-white/10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-background/50 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="novaref_id">Nova Ref ID</Label>
                    <Input
                      id="novaref_id"
                      value={formData.novaref_id}
                      onChange={(e) => setFormData({ ...formData, novaref_id: e.target.value })}
                      placeholder="Enter Nova reference ID"
                      className="bg-background/50 border-white/10"
                    />
                    <p className="text-xs text-muted-foreground">
                      Reference ID for external API integration
                    </p>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-primary hover:bg-primary/90">
                      <Save className="mr-2 h-4 w-4" />
                      {editingRestaurant ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Restaurants List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((restaurant) => (
              <Card key={restaurant.id} className="bg-[#0C1020]/80 border-white/10">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="gradient-text">{restaurant.name}</CardTitle>
                        <CardDescription className="text-muted-foreground">
                          {restaurant.subdomain || 'No subdomain'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(restaurant)}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(restaurant)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {restaurant.description && (
                    <p className="text-sm text-muted-foreground">{restaurant.description}</p>
                  )}
                  {restaurant.subdomain && (
                    <div className="pt-2 border-t border-white/10">
                      <p className="text-xs text-muted-foreground mb-1">Access URLs:</p>
                      <div className="space-y-1">
                        <a
                          href={getRestaurantUrl(restaurant.subdomain)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline block"
                        >
                          {getRestaurantUrl(restaurant.subdomain)}/dashboard
                        </a>
                        <a
                          href={`${getRestaurantUrl(restaurant.subdomain)}/reserve`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline block"
                        >
                          {getRestaurantUrl(restaurant.subdomain)}/reserve
                        </a>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {restaurants.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No restaurants yet</h3>
              <p className="text-muted-foreground mb-4">Create your first restaurant to get started</p>
              <Button onClick={() => handleOpenDialog()} className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Create Restaurant
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#0C1020] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Restaurant</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete "{restaurantToDelete?.name}"? This action cannot be undone
              and will delete all associated data (waitlist entries, reservations, tables, etc.).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

