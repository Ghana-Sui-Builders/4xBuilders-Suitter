import { lazy, Suspense, useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import LoadingSpinner from './components/ui/LoadingSpinner'
import { Toaster } from './components/Toaster'
import { ProfileSetupModal } from './components/ProfileSetupModal'

// Lazy load routes
const HomePage = lazy(() => import('./pages/HomePage'))
const ExplorePage = lazy(() => import('./pages/ExplorePage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const MessagesPage = lazy(() => import('./pages/MessagesPage'))
const NFTGalleryPage = lazy(() => import('./pages/NFTGalleryPage'))
const BookmarksPage = lazy(() => import('./pages/BookmarksPage'))
const ListsPage = lazy(() => import('./pages/ListsPage'))
const ListDetailPage = lazy(() => import('./pages/ListDetailPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

function AppContent() {
  const { state } = useAuth()
  const [showProfileSetup, setShowProfileSetup] = useState(false)
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false)

  useEffect(() => {
    // Check if user has connected wallet and needs to create profile
    if (state.isConnected && state.address && !hasCheckedProfile) {
      // Check if profile exists in localStorage
      const profileKey = `suitter_profile_${state.address}`
      const hasProfile = localStorage.getItem(profileKey)
      
      if (!hasProfile) {
        // Show profile setup modal
        setShowProfileSetup(true)
      }
      
      setHasCheckedProfile(true)
    }
  }, [state.isConnected, state.address, hasCheckedProfile])

  const handleProfileCreated = () => {
    // Mark profile as created
    if (state.address) {
      const profileKey = `suitter_profile_${state.address}`
      localStorage.setItem(profileKey, 'true')
    }
    setShowProfileSetup(false)
  }

  return (
    <>
      <Layout>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/nft-gallery" element={<NFTGalleryPage />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/lists" element={<ListsPage />} />
            <Route path="/lists/:id" element={<ListDetailPage />} />
            <Route path="/profile/:id?" element={<ProfilePage />} />
            <Route path="/post/:id" element={<PostDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Suspense>
      </Layout>
      <ProfileSetupModal 
        open={showProfileSetup}
        onOpenChange={setShowProfileSetup}
        onProfileCreated={handleProfileCreated}
      />
    </>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      <Toaster />
    </ThemeProvider>
  )
}

export default App

