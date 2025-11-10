import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-full flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl sm:text-8xl font-bold text-white mb-4 drop-shadow-2xl">404</h1>
        <h2 className="text-2xl sm:text-3xl font-semibold text-white/90 mb-4 drop-shadow-lg">
          Page Not Found
        </h2>
        <p className="text-lg sm:text-xl text-white/80 mb-8 drop-shadow">
          The page you're looking for doesn't exist or has been removed.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-white/10 backdrop-blur-md text-white rounded-lg hover:bg-white/20 transition-all duration-300 shadow-lg border border-white/20 hover:scale-105"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  )
}
