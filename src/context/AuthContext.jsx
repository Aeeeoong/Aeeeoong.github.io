import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  bootstrapUser,
  clearCurrentUser,
  getCurrentUser,
  getKnownUsers,
  addKnownUser,
  setCurrentUser,
} from '../services/storage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCurrentUser())
  const [ready, setReady] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(false)
  const [syncError, setSyncError] = useState(null)
  const [migrationNote, setMigrationNote] = useState(null)
  const [knownUsers, setKnownUsers] = useState(() => getKnownUsers())
  const allowLegacyImportRef = useRef(false)

  useEffect(() => {
    const current = getCurrentUser()
    if (current) {
      addKnownUser(current)
      setKnownUsers(getKnownUsers())
    }
  }, [])

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
        const allowLegacy = allowLegacyImportRef.current
        allowLegacyImportRef.current = false
        const result = await bootstrapUser(user, { allowLegacyImport: allowLegacy })
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
    const name = username.trim()
    allowLegacyImportRef.current = true
    setCurrentUser(name)
    addKnownUser(name)
    setKnownUsers(getKnownUsers())
    setUser(name)
  }, [])

  const switchUser = useCallback(
    (username) => {
      const name = username.trim()
      if (!name || name === user) return false
      allowLegacyImportRef.current = false
      addKnownUser(name, user)
      setKnownUsers(getKnownUsers())
      setBootstrapping(true)
      setReady(false)
      setCurrentUser(name)
      setMigrationNote(null)
      setSyncError(null)
      sessionStorage.setItem('user_switch_pending', '1')
      setUser(name)
      return true
    },
    [user],
  )

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
      switchUser,
      logout,
      isLoggedIn: !!user,
    }),
    [user, ready, bootstrapping, syncError, migrationNote, knownUsers, login, switchUser, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
