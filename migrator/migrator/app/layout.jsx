export const metadata = { title: 'Shidda Migrator' }
export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800;900&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @keyframes spin { to { transform: rotate(360deg); } }
          div[style*="playIco"]:hover { opacity: 1 !important; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
