import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'شدة موت — لوحة الأسئلة',
  description: 'لوحة إدارة الأسئلة والفئات',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
