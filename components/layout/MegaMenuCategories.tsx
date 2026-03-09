'use client'

import Link from 'next/link'

export function MegaMenuCategories({
  categories,
  setActive
}:{
  categories:any[]
  setActive:(slug:string)=>void
}){

  return (

    <div className="grid grid-cols-3 gap-6">

      {categories.map(cat=>(
        <Link
          key={cat.id}
          href={`/category/${cat.slug}`}
          onMouseEnter={()=>setActive(cat.slug)}
          className="font-semibold text-gray-900 hover:text-red-600"
        >
          {cat.name}
        </Link>
      ))}

    </div>

  )

}

