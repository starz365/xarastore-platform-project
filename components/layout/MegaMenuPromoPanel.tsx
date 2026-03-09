'use client'

import Link from 'next/link'

export function MegaMenuPromoPanel(){

  return (

    <div className="space-y-4">

      <Link
        href="/deals/today"
        className="block bg-red-600 text-white rounded-lg p-4"
      >
        Deal of the Day
      </Link>

      <Link
        href="/trending"
        className="block bg-orange-600 text-white rounded-lg p-4"
      >
        Trending Products
      </Link>

    </div>

  )

}

