import { createContext, useContext } from 'react'
import type { Tab } from './components/Sidebar'

/** App-level navigation, so any screen (e.g. an empty state) can offer a next step. */
export interface Nav {
  go: (t: Tab) => void
  openDay: (date: string) => void
}

export const NavContext = createContext<Nav>({ go: () => {}, openDay: () => {} })
export const useNav = () => useContext(NavContext)
