import { BuzzFeed } from '../components/dashboard/BuzzFeed'

export default function BuzzPage() {
  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 md:px-8 lg:px-16 xl:px-24">
      <h2 className="text-xl sm:text-2xl font-bold gradient-text">Buzz Feed</h2>
      <BuzzFeed />
    </div>
  )
}
