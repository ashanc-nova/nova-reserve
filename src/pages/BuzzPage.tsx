import { BuzzFeed } from '../components/dashboard/BuzzFeed'

export default function BuzzPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold gradient-text px-8 md:px-16 lg:px-24">Buzz Feed</h2>
      <BuzzFeed />
    </div>
  )
}
