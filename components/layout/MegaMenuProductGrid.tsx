'use client'

import { useEffect,useState } from 'react'
import { MegaMenuProductCard } from './MegaMenuProductCard'

export function MegaMenuProductGrid({
  slug
}:{slug:string | null}){

  const [products,setProducts] = useState<any[]>([])

  useEffect(()=>{

    if(!slug) return

    fetch(`/api/navigation/preview?slug=${slug}`)
      .then(r=>r.json())
      .then(setProducts)

  },[slug])

  if(!slug){
    return <p className="text-sm text-gray-500">
      Hover a category
    </p>
  }

  return (

    <div className="grid grid-cols-2 gap-3">

      {products.map(p=>(
        <MegaMenuProductCard key={p.id} product={p}/>
      ))}

    </div>

  )

}
