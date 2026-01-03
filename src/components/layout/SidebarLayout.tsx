"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { 
  Home, 
  Settings, 
  User, 
  LogOut, 
  Menu, 
  X,
  FileText,
  BarChart3,
  Shield,
  Database
} from 'lucide-react'

interface SidebarLayoutProps {
  children: React.ReactNode
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const menuItems = [
    { icon: Home, label: 'Dashboard', href: '/' },
    { icon: User, label: 'Profile', href: '/profile' },
    { icon: FileText, label: 'Documents', href: '/documents' },
    { icon: BarChart3, label: 'Analytics', href: '/analytics' },
    { icon: Database, label: 'Objects', href: '/objects' },
    { icon: Shield, label: 'Security', href: '/security' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-teal-700 shadow-lg`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-teal-800">
            <h1 className={`font-bold text-white text-xl ${!isSidebarOpen && 'hidden'}`}>
              Raw System
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-white hover:bg-teal-800"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="flex items-center p-3 text-white rounded-lg hover:bg-teal-800 transition-colors"
                  >
                    <item.icon size={20} />
                    {isSidebarOpen && (
                      <span className="ml-3">{item.label}</span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-teal-800">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start text-white hover:bg-teal-800"
            >
              <LogOut size={20} />
              {isSidebarOpen && <span className="ml-3">Logout</span>}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
