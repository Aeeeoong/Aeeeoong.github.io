import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  bootstrapUser,
  clearCurrentUser,
  getCurrentUser,
  getLocalRegisteredUsers,
  setCurrentUser,
} from '../services/storage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCurrentUser())
  const [ready, setReady] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(false)
  const [syncError, setSyncError] = useState(null)
  const [migrationNote, setMigrationNote] = useState(null)
  const [knownUsers, setKnownUsers] = useState(() => getLocalRegisteredUsers())

  useEffect(() => {
    let cancelled = false

    async function boot() {
      if (!user) {
        setReady(true)
        return
      }
      setBootstrapping(true)
      setSyncError(null)
      try {
        const result = await bootstrapUser(user)
        if (cancelled) return
        if (result.migrated) {
          setMigrationNote('로컬에 있던 예전 데이터를 Firebase로 이전했습니다.')
        }
        setReady(true)
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          setSyncError(err.message || 'Firebase 연결에 실패했습니다.')
          setReady(true)
        }
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    }

    setReady(false)
    boot()
    return () => {
      cancelled = true
    }
  }, [user])

  const login = useCallback(async (username) => {
    setCurrentUser(username)
    setKnownUsers((prev) => (prev.includes(username) ? prev : [...prev, username]))
    setUser(username)
  }, [])

  const logout = useCallback(() => {
    clearCurrentUser()
    setUser(null)
    setMigrationNote(null)
    setSyncError(null)
    setReady(true)
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready,
      bootstrapping,
      syncError,
      migrationNote,
      clearMigrationNote: () => setMigrationNote(null),
      knownUsers,
      login,
      logout,
      isLoggedIn: !!user,
    }),
    [user, ready, bootstrapping, syncError, migrationNote, knownUsers, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
