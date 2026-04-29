// app/providers.tsx
'use client'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { LanguageProvider } from './contexts/LanguageContext'
import { ThemeProvider } from './contexts/ThemeContext'

if (typeof window !== 'undefined') {
  posthog.init('YOUR_PROJECT_API_KEY', { // phc_w4po5HD969ykNzmEWvmseujmfPVYZLRipK6MYG4iaJFM
    api_host: 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false // Next.jsのルーターで制御するため
  })
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <PostHogProvider client={posthog}>
          {children}
        </PostHogProvider>
      </ThemeProvider>
    </LanguageProvider>
  )
}